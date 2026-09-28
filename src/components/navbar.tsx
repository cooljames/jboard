'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Sliders, 
  Search, 
  ArrowLeftRight, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Layers
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicModalOpen, setPanicModalOpen] = useState(false);
  const [panicResult, setPanicResult] = useState<string | null>(null);

  const navItems = [
    { label: 'Control Tower', href: '/', icon: BarChart3 },
    { label: 'Dynamic Strategies', href: '/strategies', icon: Sliders },
    { label: 'Smart Search & AI', href: '/search', icon: Search },
    { label: 'Orders & Trading', href: '/trading', icon: ArrowLeftRight },
  ];

  const handleExecutePanic = async () => {
    setPanicLoading(true);
    setPanicResult(null);
    try {
      const res = await fetch('/api/orders/panic', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPanicResult(`청산 완료: ${data.liquidatedCount ?? 0}개 종목 시장가 매도 체결`);
      } else {
        setPanicResult(`오류 발생: ${data.message || '청산 실패'}`);
      }
    } catch (err: any) {
      setPanicResult(`청산 요청 실패: ${err.message}`);
    } finally {
      setPanicLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo & System Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 tracking-tight text-lg leading-none">
                  Quant<span className="text-blue-500">Antigravity</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">KIS v2.0.0 MONOREPO</span>
              </div>
            </Link>

            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              KIS API: 20 TPS Token Bucket
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Emergency Panic Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPanicModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all text-xs font-semibold shadow-sm shadow-rose-900/40 active:scale-95"
              title="보유 전 종목 시장가 긴급 청산"
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">PANIC BUTTON</span>
              <span className="sm:hidden">청산</span>
            </button>
          </div>
        </div>
      </header>

      {/* Panic Button Modal */}
      {panicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-600/50 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-full border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">비상 전량 청산 (Panic Button)</h3>
                <p className="text-xs text-rose-400/90 font-medium">EMERGENCY FULL LIQUIDATION</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              현재 계좌에 보유 중인 <strong>모든 주식 종목에 대해 시장가(01) 매도 주문을 즉시 전송</strong>하며, 
              자동 매매 전략 알고리즘을 즉시 정지시킵니다. 계속 진행하시겠습니까?
            </p>

            {panicResult && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200">
                {panicResult}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={panicLoading}
                onClick={() => {
                  setPanicModalOpen(false);
                  setPanicResult(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                disabled={panicLoading}
                onClick={handleExecutePanic}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all"
              >
                {panicLoading ? '청산 주문 전송 중...' : '🚨 전량 시장가 청산 실행'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
