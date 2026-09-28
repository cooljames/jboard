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
}

export function AccountSummary({
  totalAsset,
  cashBalance,
  stockValuation,
  dailyPnl,
  activeStrategiesCount,
  circuitBreakerTripped = false,
}: AccountSummaryProps) {
  const dailyReturnPct = totalAsset > 0 ? (dailyPnl / (totalAsset - dailyPnl)) * 100 : 0;
  const isProfit = dailyPnl >= 0;

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
            비중: {totalAsset > 0 ? ((stockValuation / totalAsset) * 100).toFixed(1) : 0}% 포트폴리오
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
            현금 비중: {totalAsset > 0 ? ((cashBalance / totalAsset) * 100).toFixed(1) : 0}%
          </div>
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
