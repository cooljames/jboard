import { NextResponse } from 'next/server';
import {
  bootWorker,
  stopWorker,
  waitForWorkerReady,
  getWorkerState,
} from '@/lib/worker-manager';

// 컨트롤타워 자동매매/워커 제어 프록시.
// - start/stop: Python 워커의 매매 게이트 ON/OFF (워커가 떠 있어야 함)
// - boot: 워커 프로세스 직접 부팅 (터미널 불필요)
// - shutdown: 워커 프로세스 완전 종료

function workerBase(): string {
  return process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
}

async function callWorker(path: string, init?: RequestInit): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${workerBase()}${path}`, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toCooldownDTO(status: any) {
  return {
    paused: !!status?.order_cooldown?.paused,
    pauseReason: status?.order_cooldown?.pause_reason || '',
    resumeInSec: status?.order_cooldown?.resume_in_sec || 0,
    marketOpen: status?.order_cooldown?.market_open !== false,
  };
}

async function buildStatus() {
  const status = await callWorker('/api/trading/status');
  const ws = getWorkerState();
  const base = {
    activeStrategies: status?.active_strategies || [],
    circuitBreakerTripped: !!status?.circuit_breaker_tripped,
    isPaperTrading: status?.is_paper_trading !== false,
    orderCooldown: toCooldownDTO(status),
    managed: ws.managed,
    pid: ws.pid,
    uptimeSec: ws.uptimeSec,
    recentLogs: ws.recentLogs,
  };
  if (!status) {
    return {
      workerOnline: false,
      enabled: false,
      ...base,
    };
  }
  return {
    workerOnline: true,
    enabled: !!status.enabled,
    ...base,
  };
}

export async function GET() {
  return NextResponse.json(await buildStatus());
}

export async function POST(request: Request) {
  let action: string = '';
  try {
    const body = await request.json();
    action = String(body?.action || '').toLowerCase();
  } catch {
    return NextResponse.json({ error: 'action이 필요합니다.' }, { status: 400 });
  }

  // 워커 프로세스 직접 부팅
  if (action === 'boot') {
    const booted = await bootWorker();
    if (!booted.ok) {
      return NextResponse.json({ workerOnline: false, error: booted.message }, { status: 503 });
    }
    const ready = await waitForWorkerReady(30000);
    const status = await buildStatus();
    return NextResponse.json({
      ...status,
      success: ready,
      message: ready ? '워커가 켜졌습니다. 자동매매 시작 버튼을 눌러 매매를 시작하세요.' : `${booted.message} 워커 응답 대기 중... 로그를 확인하세요.`,
    });
  }

  // 워커 프로세스 완전 종료 (핸들 kill + 포트 PID 강제종료 포함)
  if (action === 'shutdown') {
    const stopped = await stopWorker();
    const status = await buildStatus();
    if (!stopped.ok) {
      return NextResponse.json({ ...status, error: stopped.message }, { status: 503 });
    }
    return NextResponse.json({ ...status, success: true, shuttingDown: true, message: stopped.message });
  }

  if (action !== 'start' && action !== 'stop') {
    return NextResponse.json({ error: 'action은 boot, start, stop, shutdown 중 하나여야 합니다.' }, { status: 400 });
  }

  const result = await callWorker(`/api/trading/${action}`, { method: 'POST' });
  if (!result) {
    const status = await buildStatus();
    return NextResponse.json(
      {
        ...status,
        error: 'Python 워커에 연결할 수 없습니다. 워커 켜기 버튼으로 먼저 켜주세요.',
      },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ...(await buildStatus()),
    success: true,
    enabled: !!result.enabled,
    message: result.message || '',
  });
}
