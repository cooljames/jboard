'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AccountSummary } from '@/components/dashboard/account-summary';
import { PositionTable, PositionItem } from '@/components/dashboard/position-table';
import { ExecutionLog, OrderItem } from '@/components/dashboard/execution-log';
import { AutoTradingControl, AutoTradingStatus } from '@/components/dashboard/auto-trading-control';
import { fetchJson } from '@/lib/fetch-json';
import { Sliders, RefreshCw, Zap, TrendingUp, Search, ArrowRight, Home } from 'lucide-react';
import { formatKRW } from '@/lib/utils';
import { LandingHome } from '@/components/landing-home';

export default function DashboardPage() {
  const [authUser, setAuthUser] = useState<{ id: number; email: string; name: string; role: string } | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'home'>('dashboard');

  const [balance, setBalance] = useState({
    totalAsset: 0,
    cashBalance: 0,
    stockValuation: 0,
    dailyPnl: 0,
    unsettledAmount: 0,
    positions: [] as PositionItem[],
  });
  const [strategies, setStrategies] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [geminiModel, setGeminiModel] = useState('Gemini 3.8 Flash');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoTrade, setAutoTrade] = useState<AutoTradingStatus>({
    enabled: false,
    workerOnline: false,
    activeStrategies: [],
    circuitBreakerTripped: false,
    isPaperTrading: true,
  });
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // 1. Fetch balance & positions
      try {
        const mData = await fetchJson<{ balance?: typeof balance }>('/api/market');
        if (mData.balance) setBalance(mData.balance);
      } catch (_) {}

      // 2. Fetch strategies
      try {
        const sData = await fetchJson<{ strategies?: typeof strategies }>('/api/strategies');
        setStrategies(sData.strategies || []);
      } catch (_) {}

      // 3. Fetch orders
      try {
        const oData = await fetchJson<{ orders?: OrderItem[] }>('/api/orders');
        setOrders(oData.orders || []);
      } catch (_) {}

      // 3-1. Fetch auto-trading engine status (동작중/대기중)
      try {
        const tData = await fetchJson<any>('/api/auto-trading');
        setAutoTrade({
          enabled: !!tData.enabled,
          workerOnline: tData.workerOnline !== false,
          activeStrategies: tData.activeStrategies || [],
          circuitBreakerTripped: !!tData.circuitBreakerTripped,
          isPaperTrading: tData.isPaperTrading !== false,
          orderCooldown: tData.orderCooldown || undefined,
          managed: tData.managed,
          pid: tData.pid ?? null,
          uptimeSec: tData.uptimeSec || 0,
          recentLogs: tData.recentLogs || [],
        });
      } catch (_) {}

      // 4. Fetch settings for real Gemini model name
      try {
        const setData = await fetchJson<{ gemini?: { model?: string } }>('/api/settings');
        if (setData.gemini?.model) {
          const raw = setData.gemini.model;
          const parts = raw.split('-');
          if (parts.length >= 3) {
            const brand = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            const ver = parts[1];
            const tier = parts.slice(2).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            setGeminiModel(`${brand} ${ver} ${tier}`);
          } else {
            setGeminiModel(raw);
          }
        }
      } catch (_) {}
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJson<{ user: { id: number; email: string; name: string; role: string } | null }>('/api/auth/me')
      .then((data) => {
        setAuthUser(data.user || null);
        if (!data.user) {
          setViewMode('home');
        }
      })
      .catch(() => {
        setAuthUser(null);
        setViewMode('home');
      })
      .finally(() => setAuthLoaded(true));

    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleQuickExit = async (ticker: string, quantity: number, tickerName?: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          tickerName,
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

  const handleToggleAutoTrading = async () => {
    if (autoBusy) return;
    // 워커 꺼짐 → 워커 켜기(부팅). 켜짐 → 매매 시작/중지 게이트.
    const action = !autoTrade.workerOnline ? 'boot' : autoTrade.enabled ? 'stop' : 'start';
    if (action === 'start') {
      const ok = window.confirm(
        `자동매매를 시작할까요?\n\n활성 전략 ${autoTrade.activeStrategies.length}개가 ${autoTrade.isPaperTrading ? '모의투자' : '실전투자'} 계좌로 실제 주문을 집행합니다.`,
      );
      if (!ok) return;
    }
    setAutoBusy(true);
    setAutoMsg(action === 'boot' ? '워커 부팅 중... (최대 30초)' : null);
    try {
      const res = await fetch('/api/auto-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.workerOnline !== false) {
        setAutoTrade({
          enabled: !!data.enabled,
          workerOnline: true,
          activeStrategies: data.activeStrategies || [],
          circuitBreakerTripped: !!data.circuitBreakerTripped,
          isPaperTrading: data.isPaperTrading !== false,
          orderCooldown: data.orderCooldown || undefined,
          managed: data.managed,
          pid: data.pid ?? null,
          uptimeSec: data.uptimeSec || 0,
          recentLogs: data.recentLogs || [],
        });
        setAutoMsg(data.message || (data.enabled ? '자동매매 동작중' : '자동매매 대기중'));
      } else {
        setAutoMsg(data.error || '워커와 통신할 수 없습니다.');
      }
    } catch (e) {
      console.error('Failed to toggle auto trading:', e);
      setAutoMsg('요청 실패: 워커 연결을 확인하세요.');
    } finally {
      setAutoBusy(false);
    }
  };

  const handleShutdownAutoTradingWorker = async () => {
    if (!autoTrade.workerOnline || autoBusy) return;
    const ok = window.confirm(
      'Python 워커 프로세스를 완전히 종료할까요?\n\n다시 켤 때는 워커 켜기 버튼을 누르면 됩니다.',
    );
    if (!ok) return;
    setAutoBusy(true);
    try {
      const res = await fetch('/api/auto-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shutdown' }),
      });
      const data = await res.json();
      setAutoMsg(data.message || '워커 종료 요청을 보냈습니다.');
      await fetchData();
    } catch (e) {
      console.error('Failed to shut down worker:', e);
      setAutoMsg('종료 요청 실패: 워커 연결을 확인하세요.');
    } finally {
      setAutoBusy(false);
    }
  };

  const activeStrategies = strategies.filter((s) => s.enabled);

  if (authLoaded && viewMode === 'home') {
    return (
      <div className="space-y-4">
        {authUser && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs">
            <span className="text-slate-300">
              현재 <strong className="text-blue-300">{authUser.name}</strong> 계정으로 로그인되어 있습니다.
            </span>
            <button
              type="button"
              onClick={() => setViewMode('dashboard')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              컨트롤 타워 대시보드로 이동 →
            </button>
          </div>
        )}
        <LandingHome
          authUser={authUser}
          onGoToDashboard={() => setViewMode('dashboard')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Trading Control Tower</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Jquant ver 1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            한국투자증권(KIS) 실시간 연동 및 동적 퀀트 알고리즘 관제 대시보드
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('home')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            title="Jquant 서비스 소개 홈 보기"
          >
            <Home className="w-3.5 h-3.5 text-blue-400" />
            <span>서비스 소개(Home)</span>
          </button>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
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

      {/* ══ 자동매매 시작/중지 마스터 스위치 ══ */}
      <AutoTradingControl
        status={autoTrade}
        busy={autoBusy}
        message={autoMsg}
        onToggle={handleToggleAutoTrading}
        onShutdown={handleShutdownAutoTradingWorker}
      />

      {/* ══ Gemini AI Engine Real Setting Status Card ══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">AI 멀티모달 하이브리드 필터 엔진:</span>
              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/30">
                {geminiModel}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="엔진 정상 활성화" />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              현재 시스템 환경설정에 지정된 실제 AI 모델이 퀀트 후보 종목의 재무 및 차트 패턴을 2차 정밀 심사합니다.
            </p>
          </div>
        </div>

        <Link
          href="/settings"
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-colors"
        >
          엔진 설정 변경 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Account Metric Summary Cards */}
      <AccountSummary
        totalAsset={balance.totalAsset}
        cashBalance={balance.cashBalance}
        stockValuation={balance.stockValuation}
        dailyPnl={balance.dailyPnl}
        unsettledAmount={balance.unsettledAmount ?? 0}
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
