'use client';

import React, { useEffect, useState } from 'react';
import { StrategyCard, StrategyData } from '@/components/strategy/strategy-card';
import { ParameterModal } from '@/components/strategy/parameter-modal';
import { Sliders, RefreshCw, Zap, Shield, Sparkles, CheckCircle2 } from 'lucide-react';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyData[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchStrategies = async () => {
    try {
      const res = await fetch('/api/strategies');
      if (res.ok) {
        const data = await res.json();
        setStrategies(data.strategies || []);
      }
    } catch (e) {
      console.error('Failed to load strategies:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    // Optimistic UI update
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s))
    );

    try {
      const res = await fetch('/api/strategies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      if (res.ok) {
        setStatusMessage(`전략 [${id}] 상태가 ${enabled ? '활성화' : '비활성화'}되었습니다. (무중단 적용)`);
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch (err) {
      console.error('Failed to toggle strategy:', err);
    }
  };

  const handleWeightChange = async (id: string, weight: number) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, allocationWeight: weight.toFixed(2) } : s))
    );

    try {
      await fetch('/api/strategies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, allocationWeight: weight.toFixed(2) }),
      });
    } catch (err) {
      console.error('Failed to update weight:', err);
    }
  };

  const handleOpenSettings = (strategy: StrategyData) => {
    setSelectedStrategy(strategy);
    setIsModalOpen(true);
  };

  const handleSaveParameters = async (id: string, newParams: Record<string, any>) => {
    const res = await fetch('/api/strategies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, parameters: newParams }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update parameters');
    }

    // Refresh state
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, parameters: newParams } : s))
    );
    setStatusMessage(`[${id}] 파라미터가 핫-리로딩(Hot-Reload)되었습니다.`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const totalAllocationPct = strategies
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + parseFloat(s.allocationWeight.toString()), 0) * 100;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Dynamic Strategy Hub</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ZERO-DOWNTIME
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            서버 재시작 및 코드 배포 없이 웹 브라우저에서 퀀트 전략 실시간 ON/OFF 및 파라미터 동적 튜닝
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            총 활성 자산배분: <span className="font-bold text-blue-400">{Math.round(totalAllocationPct)}%</span>
          </div>

          <button
            onClick={fetchStrategies}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          {statusMessage}
        </div>
      )}

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            onToggle={handleToggle}
            onWeightChange={handleWeightChange}
            onOpenSettings={handleOpenSettings}
          />
        ))}
      </div>

      {/* Strategy Parameter Editing Modal */}
      <ParameterModal
        strategy={selectedStrategy}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveParameters}
      />
    </div>
  );
}
