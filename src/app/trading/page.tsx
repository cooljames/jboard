'use client';

import React, { useState, useEffect } from 'react';
import { PositionTable, PositionItem } from '@/components/dashboard/position-table';
import { ExecutionLog, OrderItem } from '@/components/dashboard/execution-log';
import { 
  ArrowLeftRight, 
  Send, 
  RefreshCw, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Zap 
} from 'lucide-react';
import { formatKRW } from '@/lib/utils';

export default function TradingPage() {
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Order Form
  const [ticker, setTicker] = useState('005930');
  const [tickerName, setTickerName] = useState('삼성전자');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'00' | '01'>('00');
  const [price, setPrice] = useState('61500');
  const [quantity, setQuantity] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [mRes, oRes] = await Promise.all([
        fetch('/api/market'),
        fetch('/api/orders'),
      ]);

      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.balance?.positions) setPositions(mData.balance.positions);
      }
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.orders) setOrders(oData.orders);
      }
    } catch (e) {
      console.error('Failed to load trading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOrderMessage(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          tickerName,
          side,
          orderType,
          price: orderType === '01' ? '0' : price,
          quantity: parseInt(quantity, 10),
          strategyId: 'MANUAL',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrderMessage(`주문 완료: [${side === 'BUY' ? '매수' : '매도'}] ${tickerName} ${quantity}주 (${data.message || ''})`);
        await fetchData();
      } else {
        setOrderMessage(`주문 오류: ${data.error || '접수 실패'}`);
      }
    } catch (err: any) {
      setOrderMessage(`주문 전송 실패: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickExit = async (t: string, q: number) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: t,
          side: 'SELL',
          orderType: '01',
          quantity: q,
          strategyId: 'MANUAL_EXIT',
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Trading Gateway & Order Control</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              KIS REST API
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            한국투자증권 Open API 기반 실시간 수동 주문 전송, 계좌 보유 잔고 관리 및 주문 이력 추적
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          새로고침
        </button>
      </div>

      {/* Manual Order Placement Form Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="pb-3 border-b border-slate-800/80 mb-4">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
            수동 즉시 주문 (Direct Brokerage Order)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Token Bucket Rate Limiter(20 TPS) 및 OAuth2 토큰 자동 갱신을 통해 안전하게 KIS로 전송됩니다.
          </p>
        </div>

        <form onSubmit={handleManualOrder} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Ticker & Name */}
          <div className="space-y-1 md:col-span-1">
            <label className="text-[11px] font-semibold text-slate-300">종목코드</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="text-[11px] font-semibold text-slate-300">종목명</label>
            <input
              type="text"
              value={tickerName}
              onChange={(e) => setTickerName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Side */}
          <div className="space-y-1 md:col-span-1">
            <label className="text-[11px] font-semibold text-slate-300">매매구분</label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as 'BUY' | 'SELL')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="BUY">매수 (BUY)</option>
              <option value="SELL">매도 (SELL)</option>
            </select>
          </div>

          {/* Order Type */}
          <div className="space-y-1 md:col-span-1">
            <label className="text-[11px] font-semibold text-slate-300">호가유형</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as '00' | '01')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="00">00 (지정가)</option>
              <option value="01">01 (시장가)</option>
            </select>
          </div>

          {/* Price */}
          <div className="space-y-1 md:col-span-1">
            <label className="text-[11px] font-semibold text-slate-300">주문단가 (원)</label>
            <input
              type="number"
              disabled={orderType === '01'}
              value={orderType === '01' ? '0' : price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-40"
              required
            />
          </div>

          {/* Quantity & Submit */}
          <div className="space-y-1 md:col-span-1 flex flex-col justify-end">
            <label className="text-[11px] font-semibold text-slate-300">수량 (주)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-3 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-md flex items-center justify-center ${
                  side === 'BUY'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                } disabled:opacity-50`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {orderMessage && (
          <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {orderMessage}
          </div>
        )}
      </div>

      {/* Positions Table */}
      <PositionTable positions={positions} onQuickExit={handleQuickExit} />

      {/* Order Execution Log */}
      <ExecutionLog orders={orders} />
    </div>
  );
}
