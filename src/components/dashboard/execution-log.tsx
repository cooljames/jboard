'use client';

import React from 'react';
import { formatKRW, formatNumber, formatDate } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export interface OrderItem {
  id: number;
  strategyId?: string | null;
  ticker: string;
  tickerName: string;
  side: string;
  orderType: string;
  price: string | number;
  quantity: number;
  executedPrice?: string | number | null;
  executedQuantity?: number | null;
  kisOrderNo?: string | null;
  status: string;
  createdAt: string | Date;
}

interface ExecutionLogProps {
  orders: OrderItem[];
}

export function ExecutionLog({ orders }: ExecutionLogProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div>
          <h3 className="font-bold text-slate-100 text-base">주문 및 체결 내역 (Execution Log)</h3>
          <p className="text-xs text-slate-400">최근 알고리즘 및 수동 주문 체결 기록</p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
          {orders.length} 건 기록
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          주문 내역이 존재하지 않습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">체결일시</th>
                <th className="pb-3 px-4">전략구분</th>
                <th className="pb-3 px-4">종목</th>
                <th className="pb-3 px-4 text-center">구분</th>
                <th className="pb-3 px-4 text-right">주문단가</th>
                <th className="pb-3 px-4 text-right">수량</th>
                <th className="pb-3 px-4 text-center">상태</th>
                <th className="pb-3 pl-4 text-right">주문번호</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {orders.map((ord) => {
                const isBuy = ord.side.toUpperCase() === 'BUY';
                const isExecuted = ord.status === 'EXECUTED';
                return (
                  <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                      {formatDate(ord.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-sans text-[11px]">
                        {ord.strategyId || 'MANUAL'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-sans font-bold text-slate-100">{ord.tickerName}</span>{' '}
                      <span className="text-slate-500">({ord.ticker})</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          isBuy
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {isBuy ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-200">
                      {formatKRW(ord.price)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-200">
                      {formatNumber(ord.quantity)}주
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isExecuted ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isExecuted ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right text-slate-400">
                      {ord.kisOrderNo || '-'}
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
