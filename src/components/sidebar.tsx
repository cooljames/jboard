'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Sliders, 
  Search, 
  ArrowLeftRight, 
  MessageSquare, 
  Key, 
  ShieldAlert, 
  PanelLeftClose, 
  Clock, 
  Activity, 
  AlertTriangle,
  Radio,
  HelpCircle
} from 'lucide-react';

interface SidebarProps {
  isMerged: boolean;
  onToggleMerge: () => void;
  onOpenPanicModal: () => void;
}

export function Sidebar({ isMerged, onToggleMerge, onOpenPanicModal }: SidebarProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [marketStatus, setMarketStatus] = useState<{ text: string; color: string; badge: string }>({
    text: '확인 중...',
    color: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-400',
  });

  // Real-time clock update (every 1 second)
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Korean Stock Market Session Status
  useEffect(() => {
    if (!currentTime) return;
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const day = currentTime.getDay();
    const totalMinutes = hours * 60 + minutes;

    if (day === 0 || day === 6) {
      setMarketStatus({
        text: '주말 휴장',
        color: 'text-rose-400',
        badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      });
      return;
    }

    // Weekdays
    if (totalMinutes >= 540 && totalMinutes < 930) { // 09:00 ~ 15:30
      setMarketStatus({
        text: '정규장 거래중',
        color: 'text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      });
    } else if (totalMinutes >= 500 && totalMinutes < 540) { // 08:20 ~ 09:00
      setMarketStatus({
        text: '장전 동시호가',
        color: 'text-amber-400',
        badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      });
    } else if (totalMinutes >= 930 && totalMinutes < 960) { // 15:30 ~ 16:00
      setMarketStatus({
        text: '장후 시간외/종가',
        color: 'text-amber-400',
        badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      });
    } else if (totalMinutes >= 960 && totalMinutes < 1080) { // 16:00 ~ 18:00
      setMarketStatus({
        text: '시간외 단일가',
        color: 'text-purple-400',
        badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      });
    } else {
      setMarketStatus({
        text: '정규장 마감',
        color: 'text-slate-400',
        badge: 'bg-slate-800 text-slate-400 border border-slate-700',
      });
    }
  }, [currentTime]);

  const navItems = [
    { label: '컨트롤 타워', href: '/', icon: BarChart3, desc: '종합 대시보드' },
    { label: '동적 퀀트 전략', href: '/strategies', icon: Sliders, desc: '알고리즘 가중치 제어' },
    { label: 'AI 스마트 종목 발굴', href: '/search', icon: Search, desc: '차트 & Gemini 분석' },
    { label: '실시간 주문 & 매매', href: '/trading', icon: ArrowLeftRight, desc: 'KIS 호가 및 수동 체결' },
    { label: '커뮤니티 게시판', href: '/board', icon: MessageSquare, desc: '전략 토론 & 일지' },
    { label: '시스템 환경 설정', href: '/settings', icon: Key, desc: 'KIS & Gemini API' },
    { label: '통합 관리자', href: '/admin', icon: ShieldAlert, desc: '서버 & 킬스위치 제어' },
  ];

  const formatKoreanDate = (d: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dayName = days[d.getDay()];
    return `${year}년 ${month}월 ${date}일 (${dayName})`;
  };

  const formatKoreanTime = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  if (isMerged) {
    return null; // When merged, sidebar is completely collapsed into right screen
  }

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col justify-between bg-slate-950/95 border-r border-slate-800/80 backdrop-blur-xl z-40 select-none">
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand Header & Window Merge Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/50">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-tight text-base leading-none">
                Quant<span className="text-blue-500">Antigravity</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">KIS v2.0 Web</span>
            </div>
          </Link>

          {/* 창 버튼 (우측 화면으로 머지 / 사이드바 닫기) */}
          <button
            onClick={onToggleMerge}
            title="창 접기 / 우측 화면으로 머지"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer border border-transparent hover:border-slate-700"
          >
            <PanelLeftClose className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* ══ 오늘 날짜 시계 & 장 상태 (좌측 메뉴 삽입 - Requirement 5) ══ */}
        <div className="p-3.5 m-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-inner">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>오늘 날짜 &amp; 한국 시각</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${marketStatus.badge}`}>
              {marketStatus.text}
            </span>
          </div>

          {currentTime ? (
            <div className="space-y-0.5">
              <div className="text-[12px] text-slate-300 font-medium tracking-tight">
                {formatKoreanDate(currentTime)}
              </div>
              <div className="text-xl font-bold font-mono text-white tracking-wider flex items-baseline gap-1">
                <span>{formatKoreanTime(currentTime)}</span>
                <span className="text-[10px] text-slate-500 font-normal">KST</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono">시계 동기화 중...</div>
          )}
        </div>

        {/* ══ 한글 메뉴 네비게이션 (Requirement 4, 6, 7) ══ */}
        <nav className="px-2.5 space-y-1 mt-1">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            메인 메뉴
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                <div className="flex flex-col flex-1 leading-tight">
                  <span>{item.label}</span>
                  <span
                    className={`text-[10px] ${
                      isActive ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {item.desc}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Panic Liquidation & Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2.5">
        {/* KIS 20 TPS Token Bucket Badge */}
        <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            KIS API 게이트웨이
          </span>
          <span className="text-emerald-400 font-mono font-semibold">20 TPS</span>
        </div>

        {/* Panic Button */}
        <button
          type="button"
          onClick={onOpenPanicModal}
          className="w-full py-2.5 px-3 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-rose-950"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>비상 전량 청산 (PANIC)</span>
        </button>
      </div>
    </aside>
  );
}
