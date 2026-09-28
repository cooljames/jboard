'use client';

import React from 'react';
import { Sliders, CheckCircle2, XCircle, BarChart2, Shield } from 'lucide-react';

export interface StrategyData {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  allocationWeight: string | number;
  targetMarket: string;
  parameters: Record<string, any>;
  updatedAt?: string | Date;
}

interface StrategyCardProps {
  strategy: StrategyData;
  onToggle: (id: string, enabled: boolean) => void;
  onWeightChange: (id: string, weight: number) => void;
  onOpenSettings: (strategy: StrategyData) => void;
}

export function StrategyCard({
  strategy,
  onToggle,
  onWeightChange,
  onOpenSettings,
}: StrategyCardProps) {
  const weightPct = Math.round(parseFloat(strategy.allocationWeight.toString()) * 100);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-5 ${
        strategy.enabled
          ? 'bg-slate-900/90 border-blue-500/40 shadow-lg shadow-blue-950/20'
          : 'bg-slate-950/60 border-slate-800/80 opacity-75'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-100 text-base">{strategy.name}</h4>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {strategy.targetMarket}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {strategy.description || '퀀트 자동매매 전략'}
          </p>
        </div>

        {/* ON / OFF Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={strategy.enabled}
            onChange={(e) => onToggle(strategy.id, e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Allocation Weight Slider */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-medium">자산 배분 비중 (Capital Allocation)</span>
          <span className="font-mono font-bold text-blue-400">{weightPct}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={weightPct}
          disabled={!strategy.enabled}
          onChange={(e) => onWeightChange(strategy.id, parseInt(e.target.value, 10) / 100)}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-40"
        />
      </div>

      {/* Parameters Preview & Config Button */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5 max-w-[70%]">
          {Object.entries(strategy.parameters || {})
            .slice(0, 3)
            .map(([k, v]) => (
              <span
                key={k}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
              >
                {k}: {typeof v === 'object' ? '...' : String(v)}
              </span>
            ))}
        </div>

        <button
          onClick={() => onOpenSettings(strategy)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          파라미터 설정
        </button>
      </div>
    </div>
  );
}
