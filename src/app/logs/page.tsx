'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ORDER_SOURCE_LABEL, type OrderSource } from '@/lib/order-source';
import { ExecutionLog, type OrderItem } from '@/components/dashboard/execution-log';
import { fetchJson } from '@/lib/fetch-json';
import { Bot, Hand, AlertTriangle, Layers, RefreshCw, Download, Search } from 'lucide-react';

type SourceTab = 'ALL' | OrderSource;

const TABS: Array<{ id: SourceTab; label: string }> = [
  { id: 'ALL', label: '전체' },
  { id: 'AUTO', label: ORDER_SOURCE_LABEL.AUTO },
  { id: 'MANUAL', label: ORDER_SOURCE_LABEL.MANUAL },
  { id: 'PANIC', label: ORDER_SOURCE_LABEL.PANIC },
];

const TAB_ICON: Record<SourceTab, React.ReactNode> = {
  ALL: <Layers className="w-3.5 h-3.5" />,
  AUTO: <Bot className="w-3.5 h-3.5" />,
  MANUAL: <Hand className="w-3.5 h-3.5" />,
  PANIC: <AlertTriangle className="w-3.5 h-3.5" />,
};

const PAGE_SIZE = 20;

function toCsv(orders: OrderItem[]): string {
  const header = ['id', 'createdAt', 'source', 'strategyId', 'ticker', 'tickerName', 'side', 'orderType', 'price', 'quantity', 'amount', 'status', 'kisOrderNo'];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const amountOf = (o: OrderItem) => {
    const p = parseFloat(String(o.executedPrice ?? o.price ?? '0')) || 0;
    return Math.round(p * (o.quantity || 0));
  };
  const lines = orders.map((o) =>
    [o.id, o.createdAt, (o as any).source || '', o.strategyId || '', o.ticker, o.tickerName, o.side, o.orderType, o.price, o.quantity, amountOf(o), o.status, o.kisOrderNo || ''].map(esc).join(','),
  );
  return '\uFEFF' + [header.join(','), ...lines].join('\n');
}

export default function TradeLogsPage() {
  const [tab, setTab] = useState<SourceTab>('ALL');
  const [side, setSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({ ALL: 0, AUTO: 0, MANUAL: 0, PANIC: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [tab, side, status, debouncedQuery]);

  const fetchLogs = useCallback(async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const params = new URLSearchParams({
        source: tab,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (side !== 'ALL') params.set('side', side);
      if (status !== 'ALL') params.set('status', status);
      if (debouncedQuery) params.set('q', debouncedQuery);
      const data = await fetchJson<{ orders?: OrderItem[]; total?: number; counts?: Record<string, number> }>(`/api/orders?${params.toString()}`);
      setOrders(data.orders || []);
      setTotal(data.total ?? 0);
      if (data.counts) setCounts(data.counts);
    } catch (e) {
      console.error('Failed to load trade logs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, side, status, debouncedQuery, page]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(), 15000); // 15초마다 자동 갱신 (계속 기록)
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const handleExportCsv = () => {
    const blob = new Blob([toCsv(orders)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-logs-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = useMemo(
    () => [
      { id: 'ALL' as SourceTab, label: '전체 기록', value: counts.ALL ?? 0, accent: 'text-slate-100 border-slate-700' },
      { id: 'AUTO' as SourceTab, label: '자동매매', value: counts.AUTO ?? 0, accent: 'text-violet-300 border-violet-500/30' },
      { id: 'MANUAL' as SourceTab, label: '수동매매', value: counts.MANUAL ?? 0, accent: 'text-sky-300 border-sky-500/30' },
      { id: 'PANIC' as SourceTab, label: '비상청산', value: counts.PANIC ?? 0, accent: 'text-rose-300 border-rose-500/30' },
    ],
    [counts],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">매매 일지</h1>
          <p className="text-xs text-slate-400 mt-1">
            자동매매 · 수동매매 · 비상청산을 출처별로 구분한 연속 체결 로그 (15초 자동 갱신)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={orders.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV 내보내기
          </button>
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 출처별 집계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTab(c.id)}
            className={`p-4 rounded-xl bg-slate-900/60 border text-left transition-all hover:bg-slate-900 ${c.accent} ${tab === c.id ? 'ring-2 ring-blue-500/50' : ''}`}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              {TAB_ICON[c.id]}
              {c.label}
            </div>
            <div className="text-2xl font-extrabold font-mono mt-1">{c.value.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-1">건</span></div>
          </button>
        ))}
      </div>

      {/* 필터 바 */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              {TAB_ICON[t.id]}
              {t.label}
              <span className={`font-mono ${tab === t.id ? 'text-blue-100' : 'text-slate-500'}`}>
                {counts[t.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-500 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목명/코드 검색"
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-44"
            />
          </div>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as 'ALL' | 'BUY' | 'SELL')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">매수+매도</option>
            <option value="BUY">매수만</option>
            <option value="SELL">매도만</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">전체 상태</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* 로그 테이블 */}
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center text-sm text-slate-500">
          매매 로그 불러오는 중...
        </div>
      ) : (
        <ExecutionLog orders={orders} />
      )}

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono">
          {total.toLocaleString()}건 중 {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} 표시 · {page + 1}/{totalPages} 페이지
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:text-white"
          >
            이전
          </button>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:text-white"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
