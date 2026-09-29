/**
 * Jquant ver 1.0 - One-Click Integrated Launcher
 * Python FastAPI Engine (Port 8000) + Next.js Platform (Port 3000)
 */

const { spawn, exec, execSync, spawnSync } = require('child_process');
const path = require('path');
const http = require('http');
const { killPortSync } = require('./scripts/kill-port');

console.log('\x1b[36m%s\x1b[0m', `
====================================================================
     🚀 Jquant ver 1.0 - 동적 퀀트 트레이딩 & AI 분석 통합 플랫폼
====================================================================
`);

const NEXT_PORT = 3000;
const PYTHON_PORT = 8000;
let isShuttingDown = false;
let pythonProc = null;
let nextProc = null;

// 1. 기존 포트 점유 프로세스 정리 (충돌 방지)
console.log('\x1b[33m%s\x1b[0m', '[1/4] 이전 실행 잔여 프로세스 및 포트(3000, 8000) 정리 중...');
try {
  killPortSync(NEXT_PORT);
  killPortSync(PYTHON_PORT);
  console.log('\x1b[32m%s\x1b[0m', '  ✓ 포트 3000 및 8000 정리 완료');
} catch (err) {
  console.warn('  ! 포트 정리 중 경고:', err.message);
}

// 2. Python 런처 식별 (가상환경 우선, py, python 순)
function getPythonCommand() {
  const fs = require('fs');
  const venvWin = path.join(__dirname, 'python_engine', 'venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvWin)) return venvWin;
  const venvUnix = path.join(__dirname, 'python_engine', 'venv', 'bin', 'python');
  if (fs.existsSync(venvUnix)) return venvUnix;
  try {
    const res = spawnSync('py', ['--version'], { stdio: 'ignore' });
    if (!res.error && res.status === 0) return 'py';
  } catch {}
  return 'python';
}
const pyCmd = getPythonCommand();

// 3. 프로세스 강제 종료 헬퍼 (트리 전체 kill)
function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGKILL');
    }
  } catch {}
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n\x1b[33m%s\x1b[0m', '[종료] 시스템을 안전하게 종료하고 포트를 해제합니다...');
  killTree(pythonProc);
  killTree(nextProc);
  try { killPortSync(NEXT_PORT); } catch {}
  try { killPortSync(PYTHON_PORT); } catch {}
  console.log('\x1b[32m%s\x1b[0m', '✓ Jquant 플랫폼이 정상 종료되었습니다.');
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('SIGHUP', () => shutdown(0));
if (process.platform === 'win32' && process.stdin.isTTY) {
  process.stdin.on('data', () => {});
}

// 4. Python FastAPI 엔진 시작
console.log('\x1b[33m%s\x1b[0m', `[2/4] Python 퀀트 백엔드 엔진 시작 중 (Port ${PYTHON_PORT})...`);
try {
  pythonProc = spawn(
    pyCmd,
    ['-m', 'uvicorn', 'python_engine.main:app', '--host', '127.0.0.1', '--port', String(PYTHON_PORT)],
    {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    }
  );

  pythonProc.stdout.on('data', (d) => {
    const lines = d.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      // 주요 로그만 간결하게 표시
      if (line.includes('Uvicorn running') || line.includes('Application startup complete') || line.includes('Registered strategy')) {
        console.log('\x1b[34m[Python Engine]\x1b[0m', line.trim());
      }
    }
  });

  pythonProc.stderr.on('data', (d) => {
    const text = d.toString().trim();
    if (text.includes('INFO:') || text.includes('Uvicorn running')) {
      console.log('\x1b[34m[Python Engine]\x1b[0m', text);
    }
  });

  pythonProc.on('exit', (code) => {
    if (!isShuttingDown && code !== 0) {
      console.warn(`\x1b[31m[경고] Python 엔진이 종료되었습니다 (코드: ${code}).\x1b[0m`);
    }
  });
} catch (err) {
  console.error('\x1b[31m[에러] Python 엔진 시작 실패:\x1b[0m', err.message);
}

// 5. Next.js 프론트엔드 시작
console.log('\x1b[33m%s\x1b[0m', `[3/4] Next.js 15 웹 플랫폼 시작 중 (Port ${NEXT_PORT})...`);
const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
nextProc = spawn(process.execPath, [nextBin, 'dev', '-p', String(NEXT_PORT)], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, PORT: String(NEXT_PORT) },
});

nextProc.on('exit', (code) => {
  if (!isShuttingDown) {
    shutdown(code ?? 0);
  }
});

// 6. 브라우저 자동 오픈 (서버 응답 확인 후 1회 실행)
console.log('\x1b[33m%s\x1b[0m', '[4/4] 브라우저 연결 대기 중...');

let browserOpened = false;
function checkAndOpenBrowser(attempts = 0) {
  if (browserOpened || isShuttingDown) return;
  if (attempts > 30) {
    console.log('\x1b[36m%s\x1b[0m', `  👉 브라우저 주소: http://localhost:${NEXT_PORT}`);
    return;
  }

  const req = http.get(`http://127.0.0.1:${NEXT_PORT}`, (res) => {
    if (!browserOpened) {
      browserOpened = true;
      console.log('\x1b[32m%s\x1b[0m', `\n  🎉 Jquant가 준비되었습니다! 브라우저를 엽니다: http://localhost:${NEXT_PORT}\n`);
      const openCmd = process.platform === 'win32'
        ? `start http://localhost:${NEXT_PORT}`
        : process.platform === 'darwin'
        ? `open http://localhost:${NEXT_PORT}`
        : `xdg-open http://localhost:${NEXT_PORT}`;
      exec(openCmd);
    }
  });

  req.on('error', () => {
    setTimeout(() => checkAndOpenBrowser(attempts + 1), 1000);
  });
}

// 2초 후부터 체크 시작
setTimeout(() => checkAndOpenBrowser(), 2000);
