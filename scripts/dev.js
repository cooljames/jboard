/**
 * scripts/dev.js
 * Ctrl+C (SIGINT) / 종료 시 해당 포트를 항상 kill하고 끝내는 Next dev 래퍼.
 * 사용법: node scripts/dev.js [-- next dev 인자 그대로 전달]
 *  - PORT 환경변수 또는 -p / --port 인자에서 포트 감지 (기본 3000)
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const { killPortSync } = require('./kill-port');

const args = process.argv.slice(2);

// 포트 감지: --port 3001 / -p 3001 / --port=3001 / PORT env
function detectPort() {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--port') {
      const v = Number(args[i + 1]);
      if (v) return v;
    }
    const m = String(args[i]).match(/^--port=(\d+)$/);
    if (m) return Number(m[1]);
  }
  return Number(process.env.PORT || 3000);
}
const PORT = detectPort();

function killChildTree(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  try {
    if (process.platform === 'win32') {
      // /T: 자식 트리까지, /F: 강제
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
    }
  } catch { /* ignore */ }
}

// 시작 전 stale 포트 정리 (EADDRINUSE 방지)
killPortSync(PORT);

// npx.cmd 직접 spawn은 Windows에서 shell:false일 때 EINVAL 발생.
// node로 Next 바이너리를 직접 실행하면 .cmd/shell 문제 없이 크로스플랫폼 동작.
const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, 'dev', ...args], {
  stdio: 'inherit',
  shell: false,
  detached: process.platform !== 'win32', // unix에서 그룹킬용
  env: { ...process.env, PORT: String(PORT) },
});

let cleaning = false;
function cleanupAndExit(signal) {
  if (cleaning) return;
  cleaning = true;
  try { killChildTree(child); } catch {}
  try { killPortSync(PORT); } catch {}
  // SIGINT로 죽었음을 셸에 알리기 위해 130, 그 외는 0/1
  if (signal === 'SIGINT') process.exit(130);
  if (signal === 'SIGTERM') process.exit(143);
  process.exit(0);
}

process.on('SIGINT', () => cleanupAndExit('SIGINT'));
process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));
process.on('SIGHUP', () => cleanupAndExit('SIGHUP'));
// Windows에서 Ctrl+C가 'SIGINT'로 안 오고 stdin close로 오는 경우 대비
if (process.platform === 'win32' && process.stdin.isTTY) {
  process.stdin.on('data', () => {});
}

child.on('exit', (code, sig) => {
  if (cleaning) return;
  cleaning = true;
  try { killPortSync(PORT); } catch {}
  process.exit(code ?? (sig ? 1 : 0));
});
