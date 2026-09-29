'use client';

import React, { useState } from 'react';
import { formatKRW, formatPct, formatNumber } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';

export interface PositionItem {
  ticker: string;
  tickerName: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  returnPct: number;
}

interface PositionTableProps {
  positions: PositionItem[];
  onQuickExit?: (ticker: string, quantity: number, tickerName?: string) => Promise<void>;
}

export function PositionTable({ positions, onQuickExit }: PositionTableProps) {
  const [sellingTicker, setSellingTicker] = useState<string | null>(null);

  const handleSell = async (ticker: string, quantity: number, tickerName?: string) => {
    if (!onQuickExit) return;
    setSellingTicker(ticker);
    try {
      await onQuickExit(ticker, quantity, tickerName);
    } finally {
      setSellingTicker(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div>
          <h3 className="font-bold text-slate-100 text-base">보유 주식 잔고 (Positions)</h3>
          <p className="text-xs text-slate-400">실시간 KIS 계좌 보유 종목 및 손익 현황</p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
          {positions.length} 종목 보유
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          현재 보유 중인 주식 잔고가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">종목코드 / 종목명</th>
                <th className="pb-3 px-4 text-right">보유수량</th>
                <th className="pb-3 px-4 text-right">매입단가</th>
                <th className="pb-3 px-4 text-right">현재가</th>
                <th className="pb-3 px-4 text-right">평가손익</th>
                <th className="pb-3 px-4 text-right">수익률</th>
                <th className="pb-3 pl-4 text-center">주문</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {positions.map((pos) => {
                const isProfit = pos.returnPct >= 0;
                return (
                  <tr key={pos.ticker} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-100">{pos.tickerName}</div>
                      <div className="text-xs text-slate-400 font-mono">{pos.ticker}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
                      {formatNumber(pos.quantity)}주
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {formatKRW(pos.avgBuyPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                      {formatKRW(pos.currentPrice)}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold ${
                        isProfit ? 'text-rose-400' : 'text-blue-400'
                      }`}
                    >
                      {formatKRW(pos.unrealizedPnl)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          isProfit
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {isProfit ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {formatPct(pos.returnPct)}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-center">
                      <button
                        onClick={() => handleSell(pos.ticker, pos.quantity, pos.tickerName)}
                        disabled={sellingTicker === pos.ticker}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-medium transition-colors"
                      >
                        <Zap className="w-3 h-3 text-rose-400" />
                        {sellingTicker === pos.ticker ? '매도중' : '시장가청산'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
