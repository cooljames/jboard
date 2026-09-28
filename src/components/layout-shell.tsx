'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { 
  PanelLeftOpen, 
  PanelLeftClose, 
  ShieldAlert, 
  AlertTriangle, 
  Activity, 
  Zap, 
  RotateCcw,
  CheckCircle2,
  X,
  Sun,
  Moon
} from 'lucide-react';


const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: '컨트롤 타워 (종합 대시보드)', subtitle: '실시간 자산 추이, 퀀트 성과 및 KIS 20 TPS 엔진' },
  '/strategies': { title: '동적 퀀트 전략 컨트롤러', subtitle: '무중단 알고리즘 ON/OFF 및 가중치 동적 튜닝' },
  '/search': { title: 'AI 스마트 종목 발굴 & 차트', subtitle: 'TradingView 인터랙티브 차트 및 Gemini 2.0 Flash 멀티모달 분석' },
  '/trading': { title: '실시간 주문 & 매매', subtitle: 'KIS 수동 주문 체결, 실시간 잔고 현황 및 체결 감사 로그' },
  '/board': { title: '커뮤니티 게시판', subtitle: '퀀트 알고리즘 연구, 매매 일지 및 자유로운 투자 의견 교환' },
  '/settings': { title: '시스템 환경 설정', subtitle: '한국투자증권(KIS) 및 Google Gemini AI API 키 통합 관리' },
  '/setting': { title: '시스템 환경 설정', subtitle: '한국투자증권(KIS) 및 Google Gemini AI API 키 통합 관리' },
  '/admin': { title: '통합 관리자 콘솔', subtitle: '시스템 킬스위치, KIS Token Bucket 처리량 및 인프라 모니터링' },
};

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMerged, setIsMerged] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicModalOpen, setPanicModalOpen] = useState(false);
  const [panicResult, setPanicResult] = useState<string | null>(null);

  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');

  // Restore merge/split and theme state from localStorage on mount & load gemini model
  useEffect(() => {
    try {
      const savedMerge = localStorage.getItem('jquant_menu_merged');
      if (savedMerge !== null) {
        setIsMerged(savedMerge === 'true');
      }

      const savedTheme = (localStorage.getItem('jquant_theme') as 'dark' | 'light') || 'dark';
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');

      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.gemini?.model) setGeminiModel(data.gemini.model);
        })
        .catch(() => {});
    } catch {}
  }, []);

  const handleToggleMerge = () => {
    const nextState = !isMerged;
    setIsMerged(nextState);
    try {
      localStorage.setItem('jquant_menu_merged', String(nextState));
    } catch {}
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('jquant_theme', nextTheme);
    } catch {}
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const handleExecutePanic = async () => {
    setPanicLoading(true);
    setPanicResult(null);
    try {
      const res = await fetch('/api/orders/panic', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPanicResult(`비상 청산 완료: ${data.liquidatedCount ?? 0}개 종목 시장가 전량 매도 완료`);
      } else {
        setPanicResult(`청산 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      setPanicResult(`청산 요청 실패: ${err.message}`);
    } finally {
      setPanicLoading(false);
    }
  };

  const pageInfo = PAGE_TITLES[pathname] || {
    title: 'Jquant ver 1.0',
    subtitle: 'Dynamic Quant Trading & AI Analytics Platform',
  };

  return (
    <div className="min-h-screen flex bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* ══ 1. Left Sidebar (Collapsible / Merged) ══ */}
      <Sidebar
        isMerged={isMerged}
        onToggleMerge={handleToggleMerge}
        onOpenPanicModal={() => setPanicModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* ══ 2. Right Main View (Expands / Merges into full screen) ══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* 사이드바 열기/닫기 토글 버튼 */}
            <button
              onClick={handleToggleMerge}
              title="사이드바 열기/닫기"
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                padding: '4px 8px',
                cursor: 'pointer',
                color: 'rgb(0, 100, 0)',
                fontSize: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <i className={`bi ${isMerged ? 'bi-layout-sidebar' : 'bi-layout-sidebar-inset'}`} />
            </button>

            {/* Current Page Title */}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight truncate">
                {pageInfo.title}
              </span>
              <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                {pageInfo.subtitle}
              </span>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Day / Night Theme Mode Switch Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-600'
              }`}
              title="야간(다크) / 주간(라이트) 모드 전환"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold hidden md:inline">야간모드</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold hidden md:inline">주간모드</span>
                </>
              )}
            </button>

            {/* KIS Token Bucket Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>KIS 20 TPS Limiter</span>
            </div>


            {/* Quick Panic Button in Header */}
            <button
              type="button"
              onClick={() => setPanicModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-sm shadow-rose-950"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">비상 전량 청산</span>
              <span className="sm:hidden">청산</span>
            </button>
          </div>
        </header>

        {/* Main Content Area - True Full-Screen Fluid Layout without giant side gaps */}
        <main className={`flex-1 w-full ${isMerged ? 'px-3 sm:px-6 md:px-8' : 'px-3 sm:px-6'} py-6 transition-all duration-200`}>
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/40 py-5 text-center text-xs text-slate-500 font-mono">
          <div className="w-full px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>Jquant ver 1.0</div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Neon Postgres
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> KIS 20 TPS Limiter
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {geminiModel}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* ══ Panic Liquidation Modal ══ */}
      {panicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">비상 전량 청산 (Panic Button)</h3>
                <p className="text-xs text-slate-400">계좌 내 모든 보유 주식을 시장가로 즉시 매도합니다.</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-300 leading-relaxed">
              ⚠️ <strong>주의:</strong> 실행 시 KIS API를 통해 현재 계좌의 모든 포지션에 대해 취소 불가능한 시장가 매도 주문이 접수됩니다.
            </div>

            {panicResult && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400">
                {panicResult}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setPanicModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={panicLoading}
                onClick={handleExecutePanic}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {panicLoading ? '청산 주문 실행 중...' : '확인: 즉시 전량 청산'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
