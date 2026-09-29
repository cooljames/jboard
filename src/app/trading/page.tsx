'use client';

import React, { useState, useEffect } from 'react';
import { TradingViewChart } from '@/components/chart/tradingview-chart';
import { PositionTable, PositionItem } from '@/components/dashboard/position-table';
import { ExecutionLog, OrderItem } from '@/components/dashboard/execution-log';
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ArrowLeftRight, 
  Send, 
  Zap, 
  Layers,
  ShieldAlert,
  Clock,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { formatKRW, formatPct, formatNumber } from '@/lib/utils';
import { fetchJson } from '@/lib/fetch-json';

const POPULAR_STOCKS = [
  { ticker: '005930', name: '삼성전자' },
  { ticker: '000660', name: 'SK하이닉스' },
  { ticker: '373220', name: 'LG에너지솔루션' },
  { ticker: '005380', name: '현대차' },
  { ticker: '035420', name: 'NAVER' },
  { ticker: '035720', name: '카카오' },
  { ticker: '068270', name: '셀트리온' },
  { ticker: '247540', name: '에코프로비엠' },
];

export default function UnifiedTradingPage() {
  // ── Stock Selection & Chart State ──
  const [query, setQuery] = useState('삼성전자');
  const [selectedTicker, setSelectedTicker] = useState('005930');
  const [selectedName, setSelectedName] = useState('삼성전자');
  const [candles, setCandles] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // ── AI Multimodal Diagnosis State ──
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<any>(null);

  // ── Order Form State ──
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'00' | '01'>('00'); // 00: 지정가, 01: 시장가
  const [price, setPrice] = useState('61500');
  const [quantity, setQuantity] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // ── Account Positions & Execution Logs ──
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<'positions' | 'orders'>('positions');

  // Load chart & quote data when selected ticker changes
  const fetchChartData = async (ticker: string) => {
    setLoadingChart(true);
    setAiDiagnosis(null);
    try {
      const data = await fetchJson<{ candles?: any[]; quote?: any; name?: string }>(`/api/market?type=candles&ticker=${ticker}`);
      setCandles(data.candles || []);
      if (data.quote) {
        setQuote(data.quote);
        setPrice(data.quote.price?.toString() || '0');
      }
      if (data.name) setSelectedName(data.name);
    } catch (e) {
      console.error('Failed to load chart data:', e);
    } finally {
      setLoadingChart(false);
    }
  };

  // Load account positions and order audit logs
  const fetchAccountData = async () => {
    try {
      const [mData, oData] = await Promise.all([
        fetchJson<{ balance?: { positions?: PositionItem[] } }>('/api/market').catch(() => null),
        fetchJson<{ orders?: OrderItem[] }>('/api/orders').catch(() => null),
      ]);
      if (mData?.balance?.positions) setPositions(mData.balance.positions);
      if (oData?.orders) setOrders(oData.orders);
    } catch (e) {
      console.error('Failed to load account data:', e);
    }
  };

  useEffect(() => {
    fetchChartData(selectedTicker);
  }, [selectedTicker]);

  useEffect(() => {
    fetchAccountData();
    const interval = setInterval(fetchAccountData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Search autocomplete handler
  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/market?type=search&q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (_) {}
  };

  const handleSelectStock = (stock: { ticker: string; name: string }) => {
    setSelectedTicker(stock.ticker);
    setSelectedName(stock.name);
    setSearchResults([]);
    setQuery(`${stock.name} (${stock.ticker})`);
  };

  // Run Gemini AI Multimodal Analysis
  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedTicker,
          tickerName: selectedName,
          financialSummary: `현재가: ${quote?.price || 0}원, PER: ${quote?.per || 11.2}, PBR: ${quote?.pbr || 0.95}, 등락률: ${quote?.changeRate || 0}%`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiDiagnosis(data.analysis);
      }
    } catch (e) {
      console.error('AI diagnosis error:', e);
    } finally {
      setAiLoading(false);
    }
  };

  // Submit KIS Order
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOrderMessage(null);

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setOrderMessage({ text: '주문 수량을 올바르게 입력해주세요.', isError: true });
      setIsSubmitting(false);
      return;
    }

    try {
      const data = await fetchJson<any>('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedTicker,
          tickerName: selectedName,
          side,
          orderType,
          price: orderType === '01' ? '0' : price,
          quantity: qty,
          strategyId: 'MANUAL',
        }),
      });
      if (data.success) {
        const unitPrice = orderType === '01' ? quote?.price || 0 : parseFloat(price) || 0;
        const total = unitPrice * qty;
        setOrderMessage({
          text: `[${side === 'BUY' ? '매수' : '매도'} 완료] ${selectedName}(${selectedTicker}) ${qty}주 @ ${formatKRW(unitPrice)} = ${formatKRW(total)} (주문번호: ${data.orderNo || data.order?.kisOrderNo || ''})`,
          isError: false,
        });
        await fetchAccountData();
      } else {
        setOrderMessage({
          text: `주문 실패: ${data.error || data.message || '접수 오류'}`,
          isError: true,
        });
      }
    } catch (err: any) {
      setOrderMessage({ text: `주문 전송 오류: ${err.message}`, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick exit liquidation
  const handleQuickExit = async (tickerToExit: string, exitQty: number, tickerName?: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: tickerToExit,
          tickerName,
          side: 'SELL',
          orderType: '01',
          quantity: exitQty,
          strategyId: 'MANUAL_EXIT',
        }),
      });
      if (res.ok) {
        await fetchAccountData();
      }
    } catch (e) {
      console.error('Failed to exit position:', e);
    }
  };

  const calculatedTotal = (orderType === '01' ? (quote?.price || 0) : (parseFloat(price) || 0)) * (parseInt(quantity, 10) || 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ══ 1. Top Search & Stock Selector Bar ══ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Autocomplete Input */}
          <div className="relative flex-1 max-w-md">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="종목명 또는 종목코드 6자리 검색 (예: 005930, 카카오)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 font-medium transition-all"
              />
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80 max-h-64 overflow-y-auto">
                {searchResults.map((stock) => (
                  <button
                    key={stock.ticker}
                    type="button"
                    onClick={() => handleSelectStock(stock)}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-600/20 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white text-sm">{stock.name}</span>
                      <span className="font-mono text-slate-400 ms-2">{stock.ticker}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      {stock.market || 'KOSPI'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Popular Stock Quick Select Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-medium me-1 hidden sm:inline">주요 종목:</span>
            {POPULAR_STOCKS.map((s) => (
              <button
                key={s.ticker}
                type="button"
                onClick={() => handleSelectStock(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedTicker === s.ticker
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Stock Real-Time Metric Strip */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-white tracking-tight">{selectedName}</span>
              <span className="font-mono text-slate-400 font-semibold text-xs">{selectedTicker}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-white">
                {quote ? formatKRW(quote.price) : '로딩 중...'}
              </span>
              {quote && (
                <span className={`inline-flex items-center gap-0.5 font-bold font-mono text-xs px-2 py-0.5 rounded-full ${
                  quote.changeRate >= 0
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                }`}>
                  {quote.changeRate >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatPct(quote.changeRate)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <div>거래량: <span className="text-slate-200 font-semibold">{formatNumber(quote?.volume || 0)}</span></div>
            <div>PER: <span className="text-slate-200 font-semibold">{quote?.per || '11.2'}배</span></div>
            <div>PBR: <span className="text-slate-200 font-semibold">{quote?.pbr || '0.95'}배</span></div>
            <button
              onClick={() => fetchChartData(selectedTicker)}
              title="실시간 시세 새로고침"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingChart ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ══ 2. Main Workspace: Chart (Left) + Order Panel (Right) ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: TradingView Chart + Gemini AI Diagnosis (7 Cols on XL) */}
        <div className="xl:col-span-8 space-y-4">
          {/* Interactive Candlestick Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">
                  {selectedName} ({selectedTicker}) 일봉 차트 (TradingView Lightweight)
                </span>
              </div>
              <button
                onClick={handleRunAiAnalysis}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {aiLoading ? 'Gemini AI 진단 중...' : 'Gemini AI 차트 진단'}
              </button>
            </div>

            <div className="w-full">
              <TradingViewChart
                data={candles}
                ticker={selectedTicker}
                tickerName={selectedName}
                currentPrice={quote?.price}
              />
            </div>
          </div>

          {/* Gemini AI Multimodal Diagnosis Panel */}
          {aiDiagnosis && (
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-900/80 p-5 shadow-lg animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">
                    Google Gemini AI 멀티모달 퀀트 진단 보고서
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    aiDiagnosis.recommendation === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : aiDiagnosis.recommendation === 'AVOID'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    투자의견: {aiDiagnosis.recommendation}
                  </span>
                  <span className="font-mono text-xs text-indigo-300 font-semibold bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                    신뢰도 {Math.round(aiDiagnosis.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-200 font-medium mb-3 leading-relaxed">
                {aiDiagnosis.summary}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Key Drivers */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-emerald-400 font-bold mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> 상승 견인 모멘텀 (Key Drivers)
                  </div>
                  <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                    {aiDiagnosis.key_drivers?.map((d: string, idx: number) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>

                {/* Risk Factors */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-rose-400 font-bold mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> 리스크 요인 (Risk Factors)
                  </div>
                  <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                    {aiDiagnosis.risk_factors?.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {aiDiagnosis.target_price_3m && (
                <div className="mt-3 pt-2.5 border-t border-indigo-500/20 flex items-center justify-between text-xs">
                  <span className="text-slate-400">3개월 예상 목표주가:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatKRW(aiDiagnosis.target_price_3m)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Manual Order Execution Panel (4 Cols on XL) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sticky top-20 backdrop-blur-md">
            {/* Header & Side Switcher */}
            <div className="pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                  KIS 수동 주문 체결기
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  20 TPS Limiter
                </span>
              </div>

              {/* BUY / SELL Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    side === 'BUY'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  매수 (BUY)
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    side === 'SELL'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  매도 (SELL)
                </button>
              </div>
            </div>

            {/* Order Form */}
            <form onSubmit={handleOrderSubmit} className="space-y-3.5">
              {/* Target Stock Display */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  주문 대상 종목
                </label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-semibold text-white">
                  <span>{selectedName}</span>
                  <span className="font-mono text-slate-400">{selectedTicker}</span>
                </div>
              </div>

              {/* Order Type: Limit vs Market */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  호가 유형
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('00')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      orderType === '00'
                        ? 'bg-slate-800 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    지정가 (Limit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('01')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      orderType === '01'
                        ? 'bg-slate-800 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    시장가 (Market)
                  </button>
                </div>
              </div>

              {/* Price Input */}
              {orderType === '00' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-400">주문 단가 (원)</label>
                    {quote?.price && (
                      <button
                        type="button"
                        onClick={() => setPrice(quote.price.toString())}
                        className="text-[10px] text-blue-400 hover:underline"
                      >
                        현재가 적용
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                    placeholder="단가 입력"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-amber-400/90 font-medium">
                  시장가 주문: 현재 최우선 호가로 즉시 체결됩니다.
                </div>
              )}

              {/* Quantity Input */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  주문 수량 (주)
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                  placeholder="수량 입력"
                />
                {/* Quick Quantity Buttons */}
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {['5', '10', '50', '100'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="py-1 text-[11px] font-mono rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                    >
                      {q}주
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Order Amount */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between text-xs">
                <span className="text-slate-400">총 주문 예상금액</span>
                <span className="font-mono font-bold text-white text-sm">
                  {formatKRW(calculatedTotal)}
                </span>
              </div>

              {/* Feedback Message */}
              {orderMessage && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  orderMessage.isError
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  {orderMessage.text}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  side === 'BUY'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950'
                } disabled:opacity-50`}
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? '주문 전송 중...' : `${selectedName} ${side === 'BUY' ? '매수 주문 전송' : '매도 주문 전송'}`}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ══ 3. Bottom Section: Positions & Execution Audit Logs ══ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveBottomTab('positions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeBottomTab === 'positions'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              보유 주식 잔고 ({positions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveBottomTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeBottomTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              실시간 체결 감사 로그 ({orders.length})
            </button>
          </div>

          <button
            type="button"
            onClick={fetchAccountData}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
        </div>

        {activeBottomTab === 'positions' ? (
          <PositionTable
            positions={positions}
            onQuickExit={handleQuickExit}
          />
        ) : (
          <ExecutionLog orders={orders} />
        )}
      </div>
    </div>
  );
}
