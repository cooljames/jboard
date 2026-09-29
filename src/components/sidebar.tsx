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
  HelpCircle,
  Sun,
  Moon,
  Users,
  ScrollText,
  Lock,
  ShieldCheck,
  Home,
  LogIn
} from 'lucide-react';

interface SidebarProps {
  isMerged: boolean;
  onToggleMerge: () => void;
  onOpenPanicModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  userRole?: string | null;
}

export function Sidebar({ isMerged, onToggleMerge, onOpenPanicModal, theme, onToggleTheme, userRole }: SidebarProps) {

  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [marketStatus, setMarketStatus] = useState<{ text: string; color: string; badge: string }>({
    text: '확인 중...',
    color: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-400',
  });

  useEffect(() => {
    fetch('/api/admin/permissions')
      .then((r) => r.json())
      .then((d) => {
        if (d.permissions) setPermissions(d.permissions);
      })
      .catch(() => {});
  }, []);

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
    { label: '홈 (서비스 소개)', href: '/home', icon: Home, desc: 'Jquant 플랫폼 안내' },
    { label: '컨트롤 타워', href: '/', icon: BarChart3, desc: '종합 대시보드' },
    { label: '동적 퀀트 전략', href: '/strategies', icon: Sliders, desc: '알고리즘 가중치 제어' },
    { label: '실시간 검색 & 주문', href: '/trading', icon: ArrowLeftRight, desc: '종목 발굴, 차트 & KIS 주문' },
    { label: '매매 일지', href: '/logs', icon: ScrollText, desc: '자동/수동 체결 로그' },
    { label: '커뮤니티 게시판', href: '/board', icon: MessageSquare, desc: '전략 토론 & 일지' },
    { label: '메뉴 접근 권한', href: '/admin?tab=permissions', icon: ShieldCheck, desc: '등급별 메뉴 통제' },
    { label: '회원 & 권한 관리', href: '/admin?tab=members', icon: Users, desc: 'jboard 회원 제어' },
    { label: '시스템 환경 설정', href: '/settings', icon: Key, desc: 'KIS & Gemini API' },
    { label: '통합 관리자', href: '/admin', icon: ShieldAlert, desc: '서버 & 킬스위치 제어' },
  ];

  const currentRole = userRole || 'guest';

  const checkItemAccess = (href: string) => {
    if (currentRole === 'admin') return { allowed: true };
    const perm = permissions.find((p) => p.href === href || (href.startsWith(p.href) && p.href !== '/'));
    if (!perm) return { allowed: true };
    const allowed = perm.allowedGrades?.includes(currentRole);
    return {
      allowed: !!allowed,
      minRequired: perm.allowedGrades?.includes('member')
        ? '정회원 전용'
        : perm.allowedGrades?.includes('editor')
        ? '에디터 전용'
        : '최고 관리자 전용',
    };
  };

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
        {/* Brand Header */}
        <div className="py-3 px-4 flex items-center border-b border-slate-800/80 bg-slate-950/50">
          <Link href="/" className="flex items-center gap-2.5 group" title="Jquant 홈(Home)으로 이동">
            <div className="w-10 h-10 rounded-xl shrink-0 bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white tracking-tight text-[48px] leading-none">
                J<span className="text-blue-500">quant</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">ver 1.0</span>
            </div>
          </Link>
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

        {/* 게스트 로그인 퀵 버튼 */}
        {currentRole === 'guest' && (
          <div className="mx-3 mb-2 p-3 rounded-2xl bg-gradient-to-br from-blue-600/15 via-slate-900 to-indigo-600/15 border border-blue-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span>로그인하고 시작하기</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="flex-1 py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs text-center transition-all shadow-md shadow-blue-600/20"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs text-center transition-all border border-slate-700"
              >
                가입
              </Link>
            </div>
          </div>
        )}

        {/* ══ 한글 메뉴 네비게이션 (Requirement 4, 6, 7) ══ */}
        <nav className="px-2.5 space-y-1 mt-1">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>메인 메뉴</span>
            <span className="text-[9px] text-slate-600 font-normal">
              {currentRole === 'admin' ? '전체 해제' : currentRole === 'editor' ? '에디터 등급' : currentRole === 'member' ? '정회원 등급' : '게스트'}
            </span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/trading' && pathname === '/search');
            const access = checkItemAccess(item.href);

            if (!access.allowed) {
              return (
                <div
                  key={item.href}
                  onClick={() => alert(`🔒 [접근 제한] '${item.label}' 메뉴는 ${access.minRequired} 기능입니다. 관리자에게 권한 승인을 요청하세요.`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-400 hover:bg-slate-900/40 transition-all cursor-not-allowed opacity-60 group select-none"
                  title={`접근 제한: ${access.minRequired}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-slate-600" />
                  <div className="flex flex-col flex-1 leading-tight min-w-0">
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{item.label}</span>
                      <Lock className="w-3 h-3 text-amber-500/80" />
                    </span>
                    <span className="text-[10px] text-amber-500/70">
                      {access.minRequired}
                    </span>
                  </div>
                </div>
              );
            }

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

      {/* Bottom Controls: Theme Toggle, Panic Liquidation & Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2.5">
        {/* Day / Night Theme Switch Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
          }`}
          title="야간(Dark) / 주간(Light) 모드 전환"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span>{theme === 'dark' ? '야간(다크) 모드' : '주간(라이트) 모드'}</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
            {theme === 'dark' ? '주간으로 전환' : '야간으로 전환'}
          </span>
        </button>

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
