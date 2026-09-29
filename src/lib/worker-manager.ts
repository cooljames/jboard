import { spawn, spawnSync, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

// Python 워커 프로세스 매니저 (로컬 dev 서버 전용).
// 컨트롤타워 버튼만으로 워커를 켜고 끌 수 있게 한다.
// ※ Vercel 같은 서버리스 환경에서는 spawn이 불가 → 에러 메시지로 안내.

const execFileAsync = promisify(execFile);
const MAX_LOG_LINES = 300;

let child: ChildProcess | null = null;
let spawnTime: number | null = null;
const logLines: string[] = [];

function pushLog(chunk: string): void {
  for (const line of String(chunk).split(/\r?\n/)) {
    const t = line.trimEnd();
    if (!t) continue;
    logLines.push(t.slice(0, 500));
  }
  while (logLines.length > MAX_LOG_LINES) logLines.shift();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 관리 가능한 로컬 워커 포트. 원격 주소면 -1 (로컬에서 켤 수 없음) */
export function getWorkerPort(): number {
  const raw = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return parseInt(u.port || '8000', 10);
    }
    return -1;
  } catch {
    return 8000;
  }
}

export async function isPortOpen(port: number): Promise<boolean> {
  try {
    const net = await import('node:net');
    return await new Promise<boolean>((resolve) => {
      const s = net.connect(port, '127.0.0.1');
      const done = (v: boolean) => {
        try {
          s.destroy();
        } catch {}
        resolve(v);
      };
      s.on('connect', () => done(true));
      s.on('error', () => done(false));
      s.setTimeout(2000, () => done(false));
    });
  } catch {
    return false;
  }
}

/** 포트를 LISTEN 중인 PID 탐색 (Windows netstat / POSIX lsof) */
export async function findPidByPort(port: number): Promise<number | null> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('netstat', ['-ano'], { timeout: 8000 });
      for (const line of stdout.split('\n')) {
        const m = line.match(/TCP\s+\S*:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
        if (m && parseInt(m[1], 10) === port) return parseInt(m[2], 10);
      }
    } else {
      const { stdout } = await execFileAsync('lsof', ['-ti', `tcp:${port}`], { timeout: 8000 });
      const pid = parseInt(stdout.trim().split('\n')[0], 10);
      if (Number.isFinite(pid)) return pid;
    }
  } catch {}
  return null;
}

async function killPid(pid: number): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      await execFileAsync('taskkill', ['/PID', String(pid), '/F'], { timeout: 10000 });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

export interface WorkerState {
  managed: boolean;
  pid: number | null;
  uptimeSec: number;
  recentLogs: string[];
}

export function getWorkerState(): WorkerState {
  const alive = !!child && child.exitCode === null && !child.killed;
  return {
    managed: alive,
    pid: alive ? (child!.pid ?? null) : null,
    uptimeSec: alive && spawnTime ? Math.floor((Date.now() - spawnTime) / 1000) : 0,
    recentLogs: logLines.slice(-40),
  };
}

/** 사용 가능한 Python 실행 파일 경로 탐색 */
export function findPythonCommand(): string | null {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }

  // 1. 프로젝트 내부 가상환경 (Windows / POSIX)
  const venvCandidates = [
    path.join(process.cwd(), 'python_engine', 'venv', 'Scripts', 'python.exe'),
    path.join(process.cwd(), 'python_engine', '.venv', 'Scripts', 'python.exe'),
    path.join(process.cwd(), 'venv', 'Scripts', 'python.exe'),
    path.join(process.cwd(), 'python_engine', 'venv', 'bin', 'python'),
    path.join(process.cwd(), 'python_engine', '.venv', 'bin', 'python'),
    path.join(process.cwd(), 'venv', 'bin', 'python'),
  ];
  for (const cand of venvCandidates) {
    if (fs.existsSync(cand)) return cand;
  }

  // 2. 시스템 PATH 상의 실행기 탐색 (py, python, python3)
  const systemCandidates = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];
  for (const cmd of systemCandidates) {
    try {
      const res = spawnSync(cmd, ['--version'], { stdio: 'ignore', windowsHide: true });
      if (!res.error && res.status === 0) return cmd;
    } catch {}
  }

  return null;
}

/** 워커 부팅 (이미 떠 있으면 그대로 사용) */
export async function bootWorker(): Promise<{ ok: boolean; pid?: number; message: string }> {
  // Vercel 등 클라우드 서버리스 환경 가드
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return {
      ok: false,
      message: 'Vercel 서버리스 환경에서는 백그라운드 Python 워커를 직접 실행할 수 없습니다. 워커는 로컬 PC에서 실행하거나(run.bat 또는 python_engine), 외부 워커 URL(PYTHON_WORKER_URL)을 연동해야 합니다.',
    };
  }

  const port = getWorkerPort();
  if (port < 0) {
    return { ok: false, message: '원격 워커 주소이므로 버튼으로 켤 수 없습니다.' };
  }
  if (await isPortOpen(port)) {
    const pid = await findPidByPort(port);
    return { ok: true, pid: pid ?? undefined, message: pid ? `워커가 이미 실행 중입니다 (PID ${pid}).` : '워커가 이미 실행 중입니다.' };
  }
  if (child && child.exitCode === null && !child.killed) {
    return { ok: false, message: '워커 시작 처리 중입니다. 잠시 후 다시 시도하세요.' };
  }

  const pythonCmd = findPythonCommand();
  if (!pythonCmd) {
    return {
      ok: false,
      message: 'Python 실행기(python/py)를 찾을 수 없습니다. Python 3.10+ 설치 또는 python_engine/venv 가상환경을 확인해주세요.',
    };
  }
  return await new Promise<{ ok: boolean; pid?: number; message: string }>((resolve) => {
    let done = false;
    const finish = (v: { ok: boolean; pid?: number; message: string }) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    try {
      const proc = spawn(
        pythonCmd,
        ['-m', 'uvicorn', 'python_engine.main:app', '--host', '127.0.0.1', '--port', String(port)],
        { cwd: process.cwd(), windowsHide: true },
      );
      child = proc;
      spawnTime = Date.now();
      pushLog(`[manager] worker spawn started (${pythonCmd}, PID ${proc.pid})`);
      proc.stdout?.on('data', (d) => pushLog(d.toString()));
      proc.stderr?.on('data', (d) => pushLog(d.toString()));
      proc.on('error', (err) => {
        pushLog(`[manager] spawn error: ${err.message}`);
        if (child === proc) {
          child = null;
          spawnTime = null;
        }
        finish({ ok: false, message: `워커 실행 실패: ${err.message}` });
      });
      proc.on('exit', (code) => {
        pushLog(`[manager] worker exited (code ${code})`);
        if (child === proc) {
          child = null;
          spawnTime = null;
        }
      });
      setTimeout(() => finish({ ok: true, pid: proc.pid, message: `워커 시작 중 (PID ${proc.pid})` }), 1500);
    } catch (e: any) {
      finish({ ok: false, message: `워커 실행 실패: ${e?.message || e}` });
    }
  });
}

/** 워커 종료: graceful HTTP → 핸들 kill → 포트 PID 강제종료 순으로 시도 */
export async function stopWorker(): Promise<{ ok: boolean; message: string }> {
  const port = getWorkerPort();
  if (port >= 0) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`http://127.0.0.1:${port}/api/worker/shutdown`, {
        method: 'POST',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        for (let i = 0; i < 12; i++) {
          await sleep(500);
          if (!(await isPortOpen(port))) break;
        }
      }
    } catch {}
  }
  if (child && child.exitCode === null && !child.killed) {
    try {
      child.kill();
    } catch {}
    for (let i = 0; i < 10; i++) {
      await sleep(300);
      if (child.exitCode !== null || child.killed) break;
    }
  }
  child = null;
  spawnTime = null;

  if (port >= 0) {
    if (await isPortOpen(port)) {
      const pid = await findPidByPort(port);
      if (pid) {
        await killPid(pid);
        await sleep(1500);
      }
    }
    if (await isPortOpen(port)) {
      return { ok: false, message: '종료에 실패했습니다. 터미널에서 직접 종료하세요.' };
    }
  }
  return { ok: true, message: '워커 프로세스를 종료했습니다.' };
}

/** 부팅 후 readiness 대기 (최대 timeoutMs) */
export async function waitForWorkerReady(timeoutMs = 30000): Promise<boolean> {
  const port = getWorkerPort();
  if (port < 0) return false;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`http://127.0.0.1:${port}/api/trading/status`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return true;
    } catch {}
    await sleep(1000);
  }
  return await isPortOpen(port);
}
