'use client';

import React from 'react';
import { formatKRW, formatPct } from '@/lib/utils';
import { Wallet, TrendingUp, CircleDollarSign, PieChart, ShieldCheck, Cpu } from 'lucide-react';

interface AccountSummaryProps {
  totalAsset: number;
  cashBalance: number;
  stockValuation: number;
  dailyPnl: number;
  activeStrategiesCount: number;
  circuitBreakerTripped?: boolean;
  /** D+2 미결제금액 (당일 회전매매 시 큰 음수 가능) */
  unsettledAmount?: number;
}

export function AccountSummary({
  totalAsset,
  cashBalance,
  stockValuation,
  dailyPnl,
  activeStrategiesCount,
  circuitBreakerTripped = false,
  unsettledAmount = 0,
}: AccountSummaryProps) {
  const dailyReturnPct = totalAsset > 0 ? (dailyPnl / (totalAsset - dailyPnl)) * 100 : 0;
  const isProfit = dailyPnl >= 0;
  // 비중 분모: 총자산이 미결제로 주식평가액보다 작아질 수 있으므로 (주식+예수금) 기준.
  // 총자산 대비(%)가 100%를 넘나드는 오해를 방지하고 0~100%로 bounded.
  const holdingBase = stockValuation + cashBalance;
  const stockWeightPct = holdingBase > 0 ? Math.min(100, Math.max(0, (stockValuation / holdingBase) * 100)) : 0;
  const cashWeightPct = holdingBase > 0 ? Math.min(100, Math.max(0, (cashBalance / holdingBase) * 100)) : 0;
  // 정산반영 추정가용금 = 예수금 + D+2미결제. 모의계좌 예수금은 당일매매로 변동하지 않으므로
  // 실제 체감 현금 흐름은 이 추정치로 확인 (음수 = 미결제 매수 초과 상태).
  const settledCashEstimate = cashBalance + unsettledAmount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Assets */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">총 자산 평가액</span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold font-mono text-slate-100 tracking-tight">
            {formatKRW(totalAsset)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            <span className={`font-semibold font-mono ${isProfit ? 'text-rose-400' : 'text-blue-400'}`}>
              {formatKRW(dailyPnl)} ({formatPct(dailyReturnPct)})
            </span>
            <span className="text-slate-500">당일 손익</span>
          </div>
          {unsettledAmount !== 0 && (
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              미결제(D+2): {formatKRW(unsettledAmount)}
            </div>
          )}
        </div>
      </div>

      {/* 2. Stock Valuation */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">주식 보유 평가액</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold font-mono text-slate-100 tracking-tight">
            {formatKRW(stockValuation)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            비중: {stockWeightPct.toFixed(1)}% 포트폴리오
          </div>
        </div>
      </div>

      {/* 3. Cash Balance */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">예수금 (가용 현금)</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CircleDollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold font-mono text-slate-100 tracking-tight">
            {formatKRW(cashBalance)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            현금 비중: {cashWeightPct.toFixed(1)}%
          </div>
          {unsettledAmount !== 0 && (
            <div
              className={`text-[11px] mt-0.5 font-mono font-semibold ${
                settledCashEstimate < 0 ? 'text-rose-400' : 'text-amber-400/90'
              }`}
              title="예수금 + D+2미결제. 모의계좌 예수금은 당일 매매로 변동하지 않아 정산 반영 추정치를 함께 표시합니다."
            >
              정산반영 추정: {formatKRW(settledCashEstimate)}
            </div>
          )}
        </div>
      </div>

      {/* 4. Quant Engine Status & Circuit Breaker */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">엔진 가동 상태</span>
          <div className={`p-2 rounded-lg ${circuitBreakerTripped ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'} border border-indigo-500/20`}>
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold font-mono text-slate-100 tracking-tight">
              {activeStrategiesCount}
            </span>
            <span className="text-xs text-slate-400">개 전략 활성화 중</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            {circuitBreakerTripped ? (
              <span className="text-rose-400 font-bold">서킷브레이커 작동 (매수 중단)</span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                리스크 매니저 정상 감시 중 (-3.0% 한도)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
