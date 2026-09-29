'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { POPULAR_BY_MARKET, MarketType, MarketSecurity } from '@/lib/stock-universe';

const getMarketBadge = (market?: string) => {
  switch (market?.toUpperCase()) {
    case 'KOSPI':
      return {
        badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        text: '코스피',
      };
    case 'KOSDAQ':
      return {
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        text: '코스닥',
      };
    case 'ETF':
      return {
        badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        text: 'ETF',
      };
    case 'ETN':
      return {
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        text: 'ETN',
      };
    default:
      return {
        badge: 'bg-slate-800 text-slate-300 border-slate-700',
        text: market || 'KOSPI',
      };
  }
};

export default function UnifiedTradingPage() {
  // ── Stock Selection & Chart State ──
  const [selectedMarketTab, setSelectedMarketTab] = useState<MarketType | 'ALL'>('ALL');
  const [selectedMarketType, setSelectedMarketType] = useState<MarketType>('KOSPI');
  const [query, setQuery] = useState('삼성전자');
  const [selectedTicker, setSelectedTicker] = useState('005930');
  const [selectedName, setSelectedName] = useState('삼성전자');
  const [candles, setCandles] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
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
        if (data.quote.market) {
          setSelectedMarketType(data.quote.market as MarketType);
        }
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

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ESC 키로 검색창 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchResults([]);
        setHasSearched(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 외부 클릭 시 검색창 닫기 (배경 화면은 그대로 유지)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
        setHasSearched(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search autocomplete handler with Market Category filtering
  const handleSearch = async (val: string, mTab: MarketType | 'ALL' = selectedMarketTab) => {
    setQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const marketParam = mTab !== 'ALL' ? `&market=${mTab}` : '';
      const res = await fetch(`/api/market?type=search&q=${encodeURIComponent(val)}${marketParam}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (_) {
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStock = (stock: { ticker: string; name: string; market?: string }) => {
    setSelectedTicker(stock.ticker);
    setSelectedName(stock.name);
    if (stock.market) {
      setSelectedMarketType(stock.market as MarketType);
    }
    setSearchResults([]);
    setHasSearched(false);
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
      <div
        className="relative z-50 rounded-2xl border border-slate-700 bg-[#0c1220] p-4 shadow-xl"
        style={{ backgroundColor: '#0c1220', opacity: 1 }}
      >
        {/* Market Category Selector Tabs (코스피 / 코스닥 / ETF / ETN) */}
        <div className="flex items-center gap-1.5 pb-3 border-b border-slate-800 mb-3 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 me-1 hidden sm:inline">시장 분류:</span>
          {([
            { id: 'ALL', label: '🌐 전체', desc: '전체 종목' },
            { id: 'KOSPI', label: '🏢 코스피', desc: 'KOSPI 대형주' },
            { id: 'KOSDAQ', label: '🚀 코스닥', desc: 'KOSDAQ 성장주' },
            { id: 'ETF', label: '📊 ETF', desc: '지수·섹터·글로벌' },
            { id: 'ETN', label: '⚡ ETN', desc: '원유·원자재·레버리지2X' },
          ] as const).map((tab) => {
            const isActive = selectedMarketTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedMarketTab(tab.id);
                  if (query.trim() && !query.includes('(')) {
                    handleSearch(query, tab.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1 ${
                  isActive
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border-slate-700/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] hidden md:inline font-normal ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                  ({tab.desc})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Autocomplete Input Container */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-lg z-50">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={
                  selectedMarketTab === 'ALL'
                    ? '코스피, 코스닥, ETF, ETN 종목명 또는 6자리 코드 검색 (예: HK이노엔, 삼성전자, KODEX 200)'
                    : selectedMarketTab === 'ETF'
                    ? 'ETF 검색 (예: KODEX 200, 나스닥100, S&P500, 인버스, 069500)'
                    : selectedMarketTab === 'ETN'
                    ? 'ETN 검색 (예: WTI원유, 천연가스, 금, 은, 레버리지, 530063)'
                    : selectedMarketTab === 'KOSDAQ'
                    ? '코스닥 종목 검색 (예: HK이노엔, 알테오젠, 에코프로비엠, 195940)'
                    : '코스피 종목 검색 (예: 삼성전자, SK하이닉스, 현대차, 005930)'
                }
                style={{ backgroundColor: '#070b14', opacity: 1 }}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#070b14] border border-slate-600 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-blue-500 font-medium transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-[11px]"
                  title="검색어 지우기"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown - 검색창의 배경만 100% 완전 불투명 (Solid Opaque), 뒷배경 화면은 그대로 정상 유지 */}
            {(searchResults.length > 0 || (hasSearched && query.trim() && !query.includes('('))) && (
              <div
                className="absolute top-full left-0 right-0 sm:min-w-[540px] mt-2 bg-[#0d1527] border-2 border-slate-600 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden divide-y divide-slate-800 max-h-96 overflow-y-auto"
                style={{ backgroundColor: '#0d1527', opacity: 1 }}
              >
                <div
                  className="px-4 py-3 bg-[#080d19] flex items-center justify-between text-xs text-slate-300 font-medium border-b border-slate-800 sticky top-0 z-10"
                  style={{ backgroundColor: '#080d19', opacity: 1 }}
                >
                  <span className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Search className="w-4 h-4" />
                    {isSearching
                      ? '종목 검색 중...'
                      : `검색 결과 (${searchResults.length}건)`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 hidden sm:inline">선택 시 차트·호가 즉시 동기화</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchResults([]);
                        setHasSearched(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      ✕ 닫기 (ESC)
                    </button>
                  </div>
                </div>

                {isSearching ? (
                  <div
                    className="px-6 py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2 bg-[#0d1527]"
                    style={{ backgroundColor: '#0d1527', opacity: 1 }}
                  >
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span>실시간 시장 전수 데이터 검색 중...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div
                    className="px-6 py-8 text-center text-xs text-slate-400 bg-[#0d1527]"
                    style={{ backgroundColor: '#0d1527', opacity: 1 }}
                  >
                    <p className="font-semibold text-slate-300">검색된 종목이 없습니다.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      코스피, 코스닥, ETF, ETN 6자리 종목코드 또는 종목명을 확인해주세요.
                    </p>
                  </div>
                ) : (
                  searchResults.map((stock) => {
                    const badge = getMarketBadge(stock.market);
                    return (
                      <button
                        key={stock.ticker}
                        type="button"
                        onClick={() => handleSelectStock(stock)}
                        className="w-full px-4 py-3 text-left bg-[#0d1527] hover:bg-[#1a253c] flex items-center justify-between text-xs transition-colors cursor-pointer group"
                        style={{ backgroundColor: '#0d1527', opacity: 1 }}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                              {stock.name}
                            </span>
                            <span className="font-mono text-slate-300 text-xs bg-[#151f35] px-1.5 py-0.5 rounded border border-slate-700">
                              {stock.ticker}
                            </span>
                          </div>
                          {(stock.sector || stock.underlying) && (
                            <div className="text-[11px] text-slate-400 mt-0.5 font-normal">
                              {stock.sector ? `섹터: ${stock.sector}` : stock.underlying}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold border tracking-wider shrink-0 ${badge.badge}`}>
                          {badge.text}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Popular Stock Quick Select Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-medium me-1 hidden sm:inline">
              {selectedMarketTab === 'ALL' ? '인기 자산:' : `${selectedMarketTab} 추천:`}
            </span>
            {(POPULAR_BY_MARKET[selectedMarketTab] || []).map((s) => {
              const isSelected = selectedTicker === s.ticker;
              const badge = getMarketBadge(s.market);
              return (
                <button
                  key={s.ticker}
                  type="button"
                  onClick={() => handleSelectStock(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <span>{s.name}</span>
                  {selectedMarketTab === 'ALL' && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-semibold border ${badge.badge}`}>
                      {badge.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stock Real-Time Metric Strip */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-white tracking-tight">{selectedName}</span>
              <span className="font-mono text-slate-400 font-semibold text-xs">{selectedTicker}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border tracking-wider ${getMarketBadge(selectedMarketType).badge}`}>
                {getMarketBadge(selectedMarketType).text}
              </span>
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
                  주문 대상 자산 (코스피 · 코스닥 · ETF · ETN)
                </label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-semibold text-white">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{selectedName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border tracking-wider ${getMarketBadge(selectedMarketType).badge}`}>
                      {getMarketBadge(selectedMarketType).text}
                    </span>
                  </div>
                  <span className="font-mono text-slate-400 text-xs">{selectedTicker}</span>
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
