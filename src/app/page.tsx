'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AccountSummary } from '@/components/dashboard/account-summary';
import { PositionTable, PositionItem } from '@/components/dashboard/position-table';
import { ExecutionLog, OrderItem } from '@/components/dashboard/execution-log';
import { Sliders, RefreshCw, Zap, TrendingUp, Search, ArrowRight } from 'lucide-react';
import { formatKRW } from '@/lib/utils';

export default function DashboardPage() {
  const [balance, setBalance] = useState({
    totalAsset: 104500000,
    cashBalance: 42500000,
    stockValuation: 62000000,
    dailyPnl: 1450000,
    positions: [] as PositionItem[],
  });
  const [strategies, setStrategies] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Fetch balance & positions
      const mRes = await fetch('/api/market');
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.balance) setBalance(mData.balance);
      }

      // 2. Fetch strategies
      const sRes = await fetch('/api/strategies');
      if (sRes.ok) {
        const sData = await sRes.json();
        setStrategies(sData.strategies || []);
      }

      // 3. Fetch orders
      const oRes = await fetch('/api/orders');
      if (oRes.ok) {
        const oData = await oRes.json();
        setOrders(oData.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleQuickExit = async (ticker: string, quantity: number) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          side: 'SELL',
          orderType: '01', // 시장가
          quantity,
          strategyId: 'MANUAL_EXIT',
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Failed to exit position:', e);
    }
  };

  const activeStrategies = strategies.filter((s) => s.enabled);

  return (
    <div className="space-y-6">
      {/* Top Banner / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Trading Control Tower</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              LIVE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            한국투자증권(KIS) 실시간 연동 및 동적 퀀트 알고리즘 관제 대시보드
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>

          <Link
            href="/strategies"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            전략 교체 및 튜닝
          </Link>
        </div>
      </div>

      {/* Account Metric Summary Cards */}
      <AccountSummary
        totalAsset={balance.totalAsset}
        cashBalance={balance.cashBalance}
        stockValuation={balance.stockValuation}
        dailyPnl={balance.dailyPnl}
        activeStrategiesCount={activeStrategies.length}
      />

      {/* Quick Active Strategies Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-sm">실시간 가동 중인 퀀트 알고리즘</h3>
          </div>
          <Link
            href="/strategies"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
          >
            전체 전략 관리 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activeStrategies.length === 0 ? (
            <div className="col-span-3 text-center py-4 text-xs text-slate-500">
              현재 활성화된 전략이 없습니다. 전략 메뉴에서 알고리즘을 켜주세요.
            </div>
          ) : (
            activeStrategies.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-200">{s.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    시장: {s.targetMarket} | 비중: {Math.round(parseFloat(s.allocationWeight) * 100)}%
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Grid: Position Table and Execution Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <PositionTable
          positions={balance.positions}
          onQuickExit={handleQuickExit}
        />

        <ExecutionLog orders={orders} />
      </div>
    </div>
  );
}
