'use client';

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Cpu, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Zap,
  Server,
  HelpCircle
} from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kisTesting, setKisTesting] = useState(false);
  const [geminiTesting, setGeminiTesting] = useState(false);

  // KIS State
  const [kisAppKey, setKisAppKey] = useState('');
  const [kisAppSecret, setKisAppSecret] = useState('');
  const [kisAccountNo, setKisAccountNo] = useState('');
  const [kisAccountPrdtCd, setKisAccountPrdtCd] = useState('01');
  const [kisIsPaperTrading, setKisIsPaperTrading] = useState(true);
  const [showKisSecret, setShowKisSecret] = useState(false);
  const [kisTestResult, setKisTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Gemini State
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string; reply?: string } | null>(null);

  // Status message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.kis) {
          setKisAppKey(data.kis.appKey || '');
          setKisAccountNo(data.kis.accountNo || '');
          setKisAccountPrdtCd(data.kis.accountPrdtCd || '01');
          setKisIsPaperTrading(data.kis.isPaperTrading ?? true);
        }
        if (data.gemini) {
          setGeminiApiKey(data.gemini.apiKey || '');
          setGeminiModel(data.gemini.model || 'gemini-2.0-flash');
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestKis = async () => {
    setKisTesting(true);
    setKisTestResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_kis',
          kis: {
            appKey: kisAppKey,
            appSecret: kisAppSecret,
            accountNo: kisAccountNo,
            accountPrdtCd: kisAccountPrdtCd,
            isPaperTrading: kisIsPaperTrading,
          },
        }),
      });
      const data = await res.json();
      setKisTestResult(data);
    } catch (err: any) {
      setKisTestResult({ success: false, message: `요청 실패: ${err.message}` });
    } finally {
      setKisTesting(false);
    }
  };

  const handleTestGemini = async () => {
    setGeminiTesting(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_gemini',
          gemini: {
            apiKey: geminiApiKey,
            model: geminiModel,
          },
        }),
      });
      const data = await res.json();
      setGeminiTestResult(data);
    } catch (err: any) {
      setGeminiTestResult({ success: false, message: `요청 실패: ${err.message}` });
    } finally {
      setGeminiTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          kis: {
            appKey: kisAppKey,
            appSecret: kisAppSecret,
            accountNo: kisAccountNo,
            accountPrdtCd: kisAccountPrdtCd,
            isPaperTrading: kisIsPaperTrading,
          },
          gemini: {
            apiKey: geminiApiKey,
            model: geminiModel,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage('✅ 모든 API 및 시스템 설정이 성공적으로 저장되었습니다!');
        setTimeout(() => setToastMessage(null), 4000);
        fetchSettings();
      } else {
        alert(data.error || '저장에 실패했습니다.');
      }
    } catch (err: any) {
      alert(`저장 중 오류 발생: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Key className="w-7 h-7 text-blue-500" />
            시스템 환경 설정 (Settings)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            한국투자증권(KIS) Open API 계정 및 Google Gemini AI 엔진의 인증키와 모델 파라미터를 통합 관리합니다.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          설정 저장 & 적용
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p>설정 정보를 불러오는 중입니다...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. KIS Open API Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">한국투자증권 (KIS) Open API</h2>
                    <p className="text-xs text-slate-400">국내 주식 실시간 시세, 잔고 조회 및 자동 주문 게이트웨이</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  kisIsPaperTrading 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {kisIsPaperTrading ? '모의투자 모드' : '실전투자 모드'}
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">투자 환경 선택</span>
                  <span className="text-[11px] text-slate-400">모의투자(Virtual) 또는 실전투자(Real)를 전환합니다.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKisIsPaperTrading(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      kisIsPaperTrading
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white bg-slate-800/50'
                    }`}
                  >
                    모의투자
                  </button>
                  <button
                    type="button"
                    onClick={() => setKisIsPaperTrading(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      !kisIsPaperTrading
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white bg-slate-800/50'
                    }`}
                  >
                    실전투자
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    KIS App Key
                  </label>
                  <input
                    type="text"
                    value={kisAppKey}
                    onChange={(e) => setKisAppKey(e.target.value)}
                    placeholder="KIS에서 발급받은 App Key 입력"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      KIS App Secret
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKisSecret(!showKisSecret)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {showKisSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showKisSecret ? '숨기기' : '보기'}</span>
                    </button>
                  </div>
                  <input
                    type={showKisSecret ? 'text' : 'password'}
                    value={kisAppSecret}
                    onChange={(e) => setKisAppSecret(e.target.value)}
                    placeholder={kisAppSecret ? '••••••••' : 'App Secret 입력 (변경 시에만 입력)'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      계좌번호 (CANO, 8자리)
                    </label>
                    <input
                      type="text"
                      value={kisAccountNo}
                      onChange={(e) => setKisAccountNo(e.target.value)}
                      placeholder="예: 50213772"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      상품코드 (2자리)
                    </label>
                    <input
                      type="text"
                      value={kisAccountPrdtCd}
                      onChange={(e) => setKisAccountPrdtCd(e.target.value)}
                      placeholder="01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">API 엔드포인트:</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {kisIsPaperTrading ? 'https://openapivts.koreainvestment.com:29443' : 'https://openapi.koreainvestment.com:9443'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">보안 전송:</span>
                    <span className="text-emerald-400 font-mono text-[11px]">TLS 1.3 / OAuth2 Token Bucket</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Test KIS Action */}
            <div className="pt-6 mt-6 border-t border-slate-800/80 space-y-3">
              <button
                type="button"
                onClick={handleTestKis}
                disabled={kisTesting}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {kisTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                KIS API OAuth2 토큰 발급 및 연결 테스트
              </button>

              {kisTestResult && (
                <div className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
                  kisTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {kisTestResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-semibold">{kisTestResult.success ? '연결 성공' : '연결 실패'}</div>
                    <div className="text-[11px] mt-0.5 opacity-90">{kisTestResult.message}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Google Gemini Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Google Gemini AI Engine</h2>
                    <p className="text-xs text-slate-400">차트 멀티모달 분석, 뉴스 감성 분석 및 퀀트 시그널 생성</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  @google/genai SDK
                </span>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Gemini API Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showGeminiKey ? '숨기기' : '보기'}</span>
                    </button>
                  </div>
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy... Google AI Studio Key"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="mt-1.5 flex justify-end">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <span>Google AI Studio에서 무료 키 발급</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      기본 AI 분석 엔진 모델 (Gemini 3.0 ~ 3.8 Flash Series)
                    </label>
                    <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      최신 v3.8 지원
                    </span>
                  </div>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <optgroup label="── 최신 플래그십 (v3.8 Series) ──">
                      <option value="gemini-3.8-flash">gemini-3.8-flash (Gemini 3.8 Flash - 최신 플래그십 초고속 퀀트 &amp; 차트 멀티모달 / 권장)</option>
                      <option value="gemini-3.8-flash-lite">gemini-3.8-flash-lite (Gemini 3.8 Flash Lite - 극초저지연 뉴스 감성 &amp; 스캘핑 특화)</option>
                      <option value="gemini-3.8-pro">gemini-3.8-pro (Gemini 3.8 Pro - 복합 퀀트 멀티팩터 심층 추론)</option>
                    </optgroup>
                    <optgroup label="── 고성능 분석 (v3.5 Series) ──">
                      <option value="gemini-3.5-flash">gemini-3.5-flash (Gemini 3.5 Flash - 고속 차트 패턴 &amp; 퀀트 시그널 생성)</option>
                      <option value="gemini-3.5-pro">gemini-3.5-pro (Gemini 3.5 Pro - 대용량 재무제표 &amp; 공시 심층 분석)</option>
                    </optgroup>
                    <optgroup label="── 경량 고효율 (v3.1 &amp; v3.0 Series) ──">
                      <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Gemini 3.1 Flash Lite - 저지연 고효율 퀀트 필터)</option>
                      <option value="gemini-3.0-flash">gemini-3.0-flash (Gemini 3.0 Flash - 3.0 베이스라인 플래시)</option>
                      <option value="gemini-3.0-pro">gemini-3.0-pro (Gemini 3.0 Pro - 3.0 딥 퀀트 분석 엔진)</option>
                    </optgroup>
                  </select>
                </div>

                <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400 font-medium">선택된 엔진 특화 기능:</span>
                    <span className="text-indigo-400 font-mono font-semibold">{geminiModel}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                      <div className="text-slate-400">차트 멀티모달</div>
                      <div className="text-white font-medium mt-0.5">봉차트 패턴 &amp; 지지/저항</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                      <div className="text-slate-400">뉴스 감성 분석</div>
                      <div className="text-white font-medium mt-0.5">실시간 호악재 수치화</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                      <div className="text-slate-400">퀀트 시그널</div>
                      <div className="text-indigo-400 font-medium mt-0.5">BUY / HOLD / AVOID</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Test Gemini Action */}
            <div className="pt-6 mt-6 border-t border-slate-800/80 space-y-3">
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={geminiTesting}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {geminiTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <Zap className="w-3.5 h-3.5 text-indigo-400" />}
                Gemini AI 프롬프트 생성 테스트
              </button>

              {geminiTestResult && (
                <div className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
                  geminiTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {geminiTestResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-semibold">{geminiTestResult.success ? '연결 성공' : '연결 실패'}</div>
                    <div className="text-[11px] mt-0.5 opacity-90">{geminiTestResult.message}</div>
                    {geminiTestResult.reply && (
                      <div className="mt-2 p-2 bg-slate-950/70 rounded border border-slate-800 text-[11px] font-mono text-indigo-200">
                        {geminiTestResult.reply}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guide Info Footer */}
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-400 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-200">API 키 보안 안내</div>
          <p>
            입력하신 한국투자증권 API Key 및 Google Gemini Key는 서버 메모리에 안전하게 유지되며 절대 외부에 노출되지 않습니다.
            실제 매매 주문 실행 시 초당 20건(20 TPS) Rate Limiter 토큰 버킷이 실시간으로 안전하게 적용됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
