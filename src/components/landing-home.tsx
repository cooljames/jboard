'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Zap,
  ShieldCheck,
  BarChart3,
  Sliders,
  Cpu,
  ArrowRight,
  Lock,
  CheckCircle2,
  LogIn,
  UserPlus,
  Sparkles,
  ArrowLeftRight,
  MessageSquare,
  Activity,
  Layers,
  Clock,
  ChevronRight,
  LineChart,
  Bot
} from 'lucide-react';

interface LandingHomeProps {
  authUser?: { id: number; email: string; name: string; role: string } | null;
  onGoToDashboard?: () => void;
}

export function LandingHome({ authUser, onGoToDashboard }: LandingHomeProps) {
  const STRATEGIES = [
    {
      id: 'volatility_breakout',
      name: '래리 윌리엄스 변동성 돌파',
      badge: '추세추종',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      desc: '전일 레인지(고가-저가)의 K계수를 당일 시가에 더해 상향 돌파 시 장중 즉시 진입하는 대표적인 모멘텀 전략입니다.',
      feature: '슬리피지 최소화 · 당일 청산 원칙',
      target: 'KOSPI / KOSDAQ 고변동성 종목',
    },
    {
      id: 'institutional_buying',
      name: '기관/외인 쌍끌이 수급 포착',
      badge: '수급추종',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      desc: '장중 KIS 실시간 투자자별 잠정 수급 데이터를 추적하여 기관과 외국인의 동시 순매수가 포착되는 주도주에 탑승합니다.',
      feature: '스마트머니 편승 · 대형주 특화',
      target: '시가총액 상위 및 주도 섹터',
    },
    {
      id: 'mean_reversion',
      name: '볼린저 밴드 + RSI 평균회귀',
      badge: '역추세',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      desc: '하단 볼린저 밴드(20, 2) 터치와 RSI 30 이하 과매도 구간이 일치할 때 단기 기술적 반등을 목표로 분할 매수합니다.',
      feature: '과매도 눌림목 매수 · 승률 최적화',
      target: '낙폭과대 우량주 및 ETF',
    },
    {
      id: 'dual_momentum',
      name: '절대/상대 듀얼 모멘텀',
      badge: '자산배분',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      desc: '시장 대비 초과수익을 내는 강세 종목(상대 모멘텀) 중 기준 수익률을 상회하는(절대 모멘텀) 자산만을 엄선하여 순환 매매합니다.',
      feature: '하락장 현금 보호 · 강세주 집중',
      target: '업종 대표 ETF & 성장주',
    },
    {
      id: 'ai_hybrid',
      name: 'Google Gemini AI 하이브리드',
      badge: 'AI 지능형',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      desc: '기술적 지표 분석 결과와 Google Gemini 멀티모달 AI의 뉴스/공시/심리 분석 브리핑을 결합해 최종 시그널을 필터링합니다.',
      feature: '정량 지표 + 정성 뉴스 결합',
      target: '실시간 주요 이슈 종목',
    },
    {
      id: 'daytrading_rotation',
      name: '데이트레이딩 순환매 포착',
      badge: '단기매매',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      desc: '장 초반 09:00~10:00 거래량 급증 테마주를 스캐닝하여 장중 1~3% 목표 수익률 달성 시 기계적으로 익절하는 초단타 전략입니다.',
      feature: '초당 호가 추적 · 당일 손절 원칙',
      target: '당일 거래대금 상위 20 종목',
    },
    {
      id: 'bb_multiregime',
      name: 'BB 멀티레짐 (평균회귀·추세·변동성)',
      badge: '적응형',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      desc: '시장 변동성 상태(횡보, 강한 추세, 변동성 폭발)를 실시간 감지하여 최적의 파라미터로 레짐을 자동 전환하는 올인원 알고리즘입니다.',
      feature: '시장 국면 실시간 분류 · 자동 가중치',
      target: '전체 시장 유니버스',
    },
  ];

  const PLATFORM_FEATURES = [
    {
      icon: Zap,
      title: 'KIS Open API 20 TPS 토큰 버킷',
      desc: '한국투자증권 정규 거래 속도 한도(초당 20건)를 초과하지 않도록 메모리 기반 토큰 버킷과 비동기 큐를 구축하여 EGW00201 에러를 원천 차단합니다.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      icon: Bot,
      title: 'Google Gemini 실시간 AI 브리핑',
      desc: '선택한 종목의 최근 차트와 수급, 기술 지표를 AI 모델에 전달하여 투자 핵심 포인트와 리스크 요인을 3초 만에 생성합니다.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: ShieldCheck,
      title: '4단계 등급별 세밀한 메뉴 권한 제어',
      desc: '게스트(비회원), 정회원, 우수/에디터, 최고 관리자 등급에 따라 메뉴별 접근 권한을 관리자 콘솔에서 1클릭으로 통제할 수 있습니다.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: LineChart,
      title: 'TradingView 실시간 인터랙티브 차트',
      desc: '코스피, 코스닥, ETF, ETN 전 종목을 지원하며, 캔들스틱과 거래량, 볼린저 밴드, 이동평균선을 실시간으로 분석할 수 있습니다.',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      icon: ArrowLeftRight,
      title: '원클릭 모의투자 & 실전투자 전환',
      desc: 'KIS 모의투자(VTS) 환경에서 전략을 충분히 검증한 후, 환경설정에서 실전 계좌 키로 즉시 전환하여 실매매를 진행할 수 있습니다.',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      icon: MessageSquare,
      title: '투자자 커뮤니티 & 연속 감사 로그',
      desc: '자동매매, 수동매매, 비상청산 출처별 연속 체결 로그를 실시간 감사하고, 커뮤니티 게시판에서 전략 연구와 매매 일지를 교환합니다.',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="space-y-16 py-6 pb-20 animate-in fade-in duration-500 max-w-7xl mx-auto px-2 sm:px-4">
      {/* ══ 1. Hero Section ══ */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-[#0c1322] to-slate-950 p-8 sm:p-12 lg:p-16 shadow-2xl">
        {/* Glow ambient background lights */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          {/* Top Live Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Jquant ver 1.0 · KIS 20 TPS &amp; 7대 전략 가동 중</span>
          </div>

          {/* Main Title (기존 대비 4/5 크기로 축소: 60px->48px, 48px->38px, 30px->24px) */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight sm:leading-tight">
            스마트 알고리즘 <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">퀀트 트레이딩</span> 플랫폼
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            한국투자증권(KIS) Open API 실시간 연동, Google Gemini AI 지능형 분석, 7대 동적 앙상블 전략 및 실시간 시장 검색까지 — 한 화면에서 경험하는 전문가 수준의 자동매매 시스템입니다.
          </p>

          {/* Action CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            {authUser ? (
              <>
                {onGoToDashboard ? (
                  <button
                    onClick={onGoToDashboard}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>컨트롤 타워 대시보드 바로가기</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>컨트롤 타워 대시보드</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                <Link
                  href="/trading"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
                >
                  <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                  <span>실시간 종목 검색 &amp; 주문</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>로그인하여 시작하기</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-sm transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>무료 회원가입</span>
                </Link>
              </>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-8 border-t border-slate-800/80 text-left">
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium block">알고리즘 전략</span>
              <span className="text-xl font-bold text-white tracking-tight">7대 앙상블</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium block">KIS 처리량</span>
              <span className="text-xl font-bold text-emerald-400 tracking-tight">20 TPS 보호</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium block">지원 시장</span>
              <span className="text-xl font-bold text-blue-400 tracking-tight">코스피·코스닥·ETF</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-medium block">인공지능 모델</span>
              <span className="text-xl font-bold text-purple-400 tracking-tight">Gemini AI</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 2. 7대 퀀트 알고리즘 소개 섹션 ══ */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Strategies Catalog</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              7대 동적 퀀트 전략 앙상블
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              장세와 시장 국면에 따라 무중단으로 가중치를 동적 튜닝할 수 있는 실시간 퀀트 알고리즘 라인업입니다.
            </p>
          </div>
          <Link
            href="/strategies"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>전략 컨트롤러 바로가기</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STRATEGIES.map((strat, idx) => (
            <div
              key={strat.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 backdrop-blur-sm transition-all flex flex-col justify-between space-y-4 group hover:shadow-lg hover:shadow-blue-950/30"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${strat.badgeColor}`}>
                    {strat.badge}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">#{idx + 1}</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                  {strat.name}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {strat.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/60 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>핵심 원칙:</span>
                  <span className="font-medium text-slate-200">{strat.feature}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>적용 유니버스:</span>
                  <span className="font-medium text-blue-300 truncate max-w-[160px]">{strat.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ 3. 플랫폼 핵심 기능 6대 특화 기능 ══ */}
      <section className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Infrastructure &amp; Features</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            전문 투자자를 위한 엔지니어링 설계
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            안정적인 실시간 매매 체결과 AI 보조 분석, 철저한 권한 관리를 제공합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_FEATURES.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col space-y-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg}`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="text-base font-bold text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ 4. 하단 로그인 & 시작하기 대형 CTA ══ */}
      <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Jquant ver 1.0 회원 가입</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            지금 바로 Jquant 퀀트 트레이딩을 경험해보세요
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            무료 회원가입으로 커뮤니티 게시판과 실시간 종목 분석을 이용할 수 있으며, 관리자 승인 후 퀀트 알고리즘 자동매매를 시작할 수 있습니다.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            {authUser ? (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                <span>컨트롤 타워로 이동</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>로그인하기</span>
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-sm transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>무료 회원가입</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
