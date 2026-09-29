/**
 * scripts/kill-port.js
 * 지정 포트를 점유한 프로세스를 OS별로 강제 종료.
 * 사용법: node scripts/kill-port.js [port]  (기본값: process.env.PORT || 3000)
 */
const { execSync, spawnSync } = require('child_process');

function getPidsByPortWin(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const pids = new Set();
    for (const line of out.split('\n')) {
      // TCP    0.0.0.0:3000   0.0.0.0:0   LISTENING   1234
      const m = line.trim().match(/^(TCP|UDP)\s+\S+:(\d+)\s+\S+\s+(\w+)?\s+(\d+)\s*$/i);
      if (!m) continue;
      const foundPort = Number(m[2]);
      const state = (m[3] || '').toUpperCase();
      const pid = Number(m[4]);
      if (foundPort !== Number(port)) continue;
      // LISTENING 상태만 kill (TIME_WAIT, ESTABLISHED 제외 → 오kill 방지)
      // UDP는 상태가 없으므로 포함
      if (m[1].toUpperCase() === 'TCP' && state && state !== 'LISTENING') continue;
      if (pid && pid !== 0 && pid !== 4) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function getPidsByPortUnix(port) {
  // lsof 우선, 없으면 ss, fuser 순으로 시도
  try {
    const out = execSync(`lsof -ti :${port} 2>/dev/null || true`, { encoding: 'utf8' });
    const pids = out.split(/[\s\n]+/).map(Number).filter(Boolean);
    if (pids.length) return pids;
  } catch { /* ignore */ }
  try {
    const out = execSync(`ss -lptn 'sport = :${port}' 2>/dev/null || true`, { encoding: 'utf8' });
    const pids = [...out.matchAll(/pid=(\d+)/g)].map((m) => Number(m[1])).filter(Boolean);
    if (pids.length) return [...new Set(pids)];
  } catch { /* ignore */ }
  return [];
}

function killPids(pids) {
  if (!pids.length) return false;
  if (process.platform === 'win32') {
    for (const pid of pids) {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    }
  } else {
    try {
      process.kill && pids.forEach((pid) => { try { process.kill(pid, 'SIGKILL'); } catch {} });
    } catch { /* ignore */ }
  }
  return true;
}

function killPortSync(port) {
  const pids = process.platform === 'win32' ? getPidsByPortWin(port) : getPidsByPortUnix(port);
  // 자기 자신은 제외
  const filtered = pids.filter((pid) => pid !== process.pid);
  if (!filtered.length) return false;
  return killPids(filtered);
}

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || 3000);
  const killed = killPortSync(port);
  console.log(killed ? `killed port ${port}` : `port ${port} is free`);
}

module.exports = { killPortSync };
