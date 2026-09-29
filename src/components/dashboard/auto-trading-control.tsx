'use client';

import React from 'react';
import { Play, Square, Loader2, Bot, Power } from 'lucide-react';

export interface OrderCooldownState {
  paused: boolean;
  pauseReason: string;
  resumeInSec: number;
  marketOpen: boolean;
}

export interface AutoTradingStatus {
  enabled: boolean;
  workerOnline: boolean;
  activeStrategies: string[];
  circuitBreakerTripped: boolean;
  isPaperTrading: boolean;
  orderCooldown?: OrderCooldownState;
  managed?: boolean;
  pid?: number | null;
  uptimeSec?: number;
  recentLogs?: string[];
}

function formatUptime(totalSec?: number): string {
  const s = Math.max(0, totalSec || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}

interface AutoTradingControlProps {
  status: AutoTradingStatus;
  busy: boolean;
  message: string | null;
  onToggle: () => void;
  onShutdown: () => void;
}

export function AutoTradingControl({ status, busy, message, onToggle, onShutdown }: AutoTradingControlProps) {
  const { enabled, workerOnline } = status;
  const running = enabled && workerOnline;

  // 버튼 컬러: 동작중=녹색, 처리중=회색, 그 외=흰색 (워커꺼짐=켜기 / 대기중=시작)
  const buttonClass = running
    ? 'bg-green-600 hover:bg-green-500 text-white border-green-500 shadow-lg shadow-green-950'
    : busy
      ? 'bg-gray-400 text-white border-gray-400 cursor-not-allowed'
      : 'bg-white hover:bg-gray-100 text-slate-900 border-gray-300 shadow-md';

  const buttonLabel = running
    ? '동작중 — 클릭하여 중지'
    : busy
      ? '처리 중...'
      : !workerOnline
        ? '워커 켜기'
        : '자동매매 시작';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* 상태 표시 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              running ? 'bg-green-500 animate-pulse' : workerOnline ? 'bg-gray-400' : 'bg-gray-600'
            }`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100 text-base flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-400" />
                자동매매 엔진
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  running
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {running ? '동작중' : '대기중'}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  status.isPaperTrading
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {status.isPaperTrading ? '모의투자' : '실전투자'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {workerOnline
                ? `워커 연결됨${status.pid ? ` (PID ${status.pid} · 가동 ${formatUptime(status.uptimeSec)})` : ''} · 활성 전략 ${status.activeStrategies.length}개${
                    status.circuitBreakerTripped ? ' · ⚠️ 서킷브레이커 발동(신규매수 중단)' : ''
                  }`
                : '워커 꺼짐 — 우측 흰색 버튼으로 터미널 없이 바로 켤 수 있습니다.'}
            </p>
            {message && <p className="text-xs text-blue-300 mt-1 font-medium">{message}</p>}
            {workerOnline && status.orderCooldown?.paused && status.orderCooldown.pauseReason && (
              <p className="text-xs text-amber-300 mt-1 font-medium">
                일시 대기: {status.orderCooldown.pauseReason}
              </p>
            )}
            {workerOnline && enabled && !status.orderCooldown?.paused && !status.orderCooldown?.marketOpen && (
              <p className="text-xs text-slate-500 mt-1">
                정규장(09:00~15:30) 외 — 신규 매수는 장 시작 후 재개됩니다.
              </p>
            )}
          </div>
        </div>

        {/* 버튼 영역: 우측 고정 — [워커 끄기] [시작/동작중] 가로 배치 */}
        <div className="flex-shrink-0 flex flex-row items-center gap-2">
          {/* 워커 끄기 — 시작 버튼 왼쪽 */}
          {workerOnline && (
            <button
              type="button"
              onClick={onShutdown}
              disabled={busy}
              title="자동매매 중지와 별개로 Python 워커 프로세스 자체를 종료합니다. 다시 켜려면 워커 켜기 버튼을 누르세요."
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-xs font-bold bg-transparent text-slate-500 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              <Power className="w-3.5 h-3.5" />
              워커 끄기
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            disabled={busy}
          className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-extrabold border transition-all ${buttonClass}`}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : running ? (
            <Square className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {buttonLabel}
        </button>
        </div>
      </div>
      {/* 워커 로그 (터미널 대체) */}
      {status.recentLogs && status.recentLogs.length > 0 && (
        <details className="mt-3 pt-3 border-t border-slate-800/80">
          <summary className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer font-medium">
            워커 로그 보기 (최근 {status.recentLogs.length}줄)
          </summary>
          <pre className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {status.recentLogs.join('\n')}
          </pre>
        </details>
      )}
    </div>
  );
}
