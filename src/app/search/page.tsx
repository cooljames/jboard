'use client';

import React, { useState, useEffect } from 'react';
import { TradingViewChart } from '@/components/chart/tradingview-chart';
import { Search, Sparkles, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, BarChart2 } from 'lucide-react';
import { formatKRW, formatPct, formatNumber } from '@/lib/utils';

export default function SearchPage() {
  const [query, setQuery] = useState('005930');
  const [selectedTicker, setSelectedTicker] = useState('005930');
  const [selectedName, setSelectedName] = useState('삼성전자');
  const [candles, setCandles] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<any>(null);
  const [loadingChart, setLoadingChart] = useState(false);

  const fetchChartData = async (ticker: string) => {
    setLoadingChart(true);
    setAiDiagnosis(null);
    try {
      const res = await fetch(`/api/market?type=candles&ticker=${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setCandles(data.candles || []);
        if (data.quote) setQuote(data.quote);
        if (data.name) setSelectedName(data.name);
      }
    } catch (e) {
      console.error('Failed to load chart data:', e);
    } finally {
      setLoadingChart(false);
    }
  };

  useEffect(() => {
    fetchChartData(selectedTicker);
  }, [selectedTicker]);

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

  const handleSelectStock = (stock: any) => {
    setSelectedTicker(stock.ticker);
    setSelectedName(stock.name);
    setSearchResults([]);
    setQuery(`${stock.name} (${stock.ticker})`);
  };

  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedTicker,
          tickerName: selectedName,
          financialSummary: `현재가: ${quote?.price || 0}원, PER: ${quote?.per || 11}, PBR: ${quote?.pbr || 0.95}`,
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Smart Stock Search & AI Diagnosis</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            TradingView 차트 분석 및 Google Gemini 2.0 Flash 멀티모달 퀀트 AI 심층 진단
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <div className="relative">
            <input
              type="text"
              placeholder="종목명 또는 종목코드 검색..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 w-full bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80">
              {searchResults.slice(0, 6).map((item) => (
                <button
                  key={item.ticker}
                  onClick={() => handleSelectStock(item)}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-800/80 transition-colors flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-200">{item.name}</span>
                  <span className="font-mono text-slate-400">{item.ticker}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Chart & Stock Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <TradingViewChart
            data={candles}
            ticker={selectedTicker}
            tickerName={selectedName}
            currentPrice={quote?.price}
          />

          {/* Quick Metrics Bar */}
          {quote && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">전일대비 등락</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    quote.changeRate >= 0 ? 'text-rose-400' : 'text-blue-400'
                  }`}
                >
                  {formatPct(quote.changeRate)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">거래량 (Volume)</span>
                <span className="text-sm font-bold font-mono text-slate-200">
                  {formatNumber(quote.volume)}주
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">PER (Price-to-Earnings)</span>
                <span className="text-sm font-bold font-mono text-slate-200">
                  {quote.per || '11.2'}배
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">PBR (Price-to-Book)</span>
                <span className="text-sm font-bold font-mono text-slate-200">
                  {quote.pbr || '0.95'}배
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Gemini AI Diagnosis Panel (1 Col) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Gemini 2.0 Flash AI 진단</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Multimodal Structured AI</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Google Gen AI SDK를 통해 <strong>{selectedName} ({selectedTicker})</strong>의 
              재무 지표, 외국인/기관 수급, 최근 차트 형태를 종합 심사하여 객관적인 퀀트 투자의견을 산출합니다.
            </p>

            <button
              onClick={handleRunAiAnalysis}
              disabled={aiLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gemini 2.0 심사 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  AI 멀티모달 정밀 진단 실행
                </>
              )}
            </button>

            {/* AI Diagnosis Output */}
            {aiDiagnosis && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in">
                {/* Recommendation & Confidence */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      AI 투자 판단
                    </span>
                    <span
                      className={`text-base font-extrabold font-mono ${
                        aiDiagnosis.recommendation === 'BUY'
                          ? 'text-emerald-400'
                          : aiDiagnosis.recommendation === 'AVOID'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {aiDiagnosis.recommendation}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      신뢰도 (Confidence)
                    </span>
                    <span className="text-base font-extrabold font-mono text-blue-400">
                      {Math.round(aiDiagnosis.confidence_score * 100)}%
                    </span>
                  </div>
                </div>

                {/* 3M Target Price */}
                {aiDiagnosis.target_price_3m && (
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">3개월 목표주가:</span>
                    <span className="font-bold font-mono text-slate-200">
                      {formatKRW(aiDiagnosis.target_price_3m)}
                    </span>
                  </div>
                )}

                {/* Key Drivers */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    핵심 투자 근거 (Key Drivers)
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                    {aiDiagnosis.key_drivers?.map((driver: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">
                        {driver}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk Factors */}
                {aiDiagnosis.risk_factors && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      주요 리스크 요인
                    </span>
                    <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                      {aiDiagnosis.risk_factors.map((risk: string, idx: number) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
