'use client';

import React, { useState, useEffect } from 'react';
import { StrategyData } from './strategy-card';
import { X, Save, RefreshCw, CheckCircle } from 'lucide-react';

interface ParameterModalProps {
  strategy: StrategyData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, newParams: Record<string, any>) => Promise<void>;
}

export function ParameterModal({ strategy, isOpen, onClose, onSave }: ParameterModalProps) {
  const [paramsJson, setParamsJson] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (strategy) {
      setParamsJson(JSON.stringify(strategy.parameters || {}, null, 2));
      setErrorMsg(null);
      setSaveSuccess(false);
    }
  }, [strategy]);

  if (!isOpen || !strategy) return null;

  const handleSave = async () => {
    setErrorMsg(null);
    setSaveSuccess(false);

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(paramsJson);
    } catch (e: any) {
      setErrorMsg(`JSON 형식 오류: ${e.message}`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(strategy.id, parsed);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(`저장 실패: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{strategy.name}</span>
              <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {strategy.id}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero-Downtime Dynamic Parameter Tuning (실시간 무중단 튜닝)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* JSON Editor / Parameters */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            전략 파라미터 구성 (JSON)
          </label>
          <textarea
            rows={12}
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            spellCheck={false}
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            파라미터가 Neon DB에 저장되었으며 엔진에 즉시 동적 적용되었습니다!
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                적용 중...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                실시간 파라미터 적용 (Hot Reload)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
