'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Server, 
  Activity, 
  Cpu, 
  Database, 
  RefreshCw, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  RotateCcw,
  Zap,
  Lock,
  Layers,
  MessageSquare
} from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Form states for Admin Config
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [maxLeverage, setMaxLeverage] = useState('1.0');
  const [maxSlippage, setMaxSlippage] = useState('0.3');
  const [autoPanicPct, setAutoPanicPct] = useState('5.0');

  useEffect(() => {
    fetchAdminData();
    fetchBoardPosts();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.adminConfig) {
          setMasterEnabled(json.adminConfig.masterTradingEnabled);
          setMaxLeverage(json.adminConfig.maxLeverage);
          setMaxSlippage(json.adminConfig.maxSlippagePct);
          setAutoPanicPct(json.adminConfig.autoPanicStopLossPct);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoardPosts = async () => {
    try {
      const res = await fetch('/api/board');
      if (res.ok) {
        const json = await res.json();
        setPosts(json.posts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setUpdating(true);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          config: {
            masterTradingEnabled: masterEnabled,
            maxLeverage,
            maxSlippagePct: maxSlippage,
            autoPanicStopLossPct: autoPanicPct,
          },
        }),
      });

      if (res.ok) {
        setNotice('✅ 관리자 글로벌 정책이 성공적으로 반영되었습니다.');
        setTimeout(() => setNotice(null), 3500);
      }
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleResetToken = async () => {
    if (!confirm('KIS OAuth2 액세스 토큰 캐시를 무효화하고 즉시 재발급하시겠습니까?')) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_token' }),
      });
      const json = await res.json();
      alert(json.message || '토큰 재발급 완료');
      fetchAdminData();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const handleDeletePost = async (id: number) => {
    if (!confirm('이 게시글을 관리자 권한으로 영구 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/board?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            시스템 통합 관리자 (Admin Console)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            퀀트 트레이딩 글로벌 킬스위치, KIS Token Bucket 처리량, 인프라 리소스 및 게시글 컨텐츠를 총괄 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={updating}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {updating ? '반영 중...' : '관리 정책 저장'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 1. Infrastructure Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">서버 가동 시간 (Uptime)</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {data?.system?.uptimeSeconds ? `${Math.floor(data.system.uptimeSeconds / 60)}분 ${data.system.uptimeSeconds % 60}초` : '정상 가동'}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Next.js 15 App Router Active
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">KIS Token Bucket TPS</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {data?.metrics?.tokenBucketAvailable ?? 20} / {data?.metrics?.rateLimitTps ?? 20} TPS
          </div>
          <div className="text-[11px] text-blue-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            초당 20건 제한 자동 준수
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">활성 퀀트 전략 수</span>
            <Sliders className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {data?.metrics?.activeStrategiesCount ?? 3}개 전략 ON
          </div>
          <div className="text-[11px] text-purple-400">
            동적 알고리즘 실시간 모니터링
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Postgres DB &amp; 커뮤니티</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {posts.length}건 등록
          </div>
          <div className="text-[11px] text-amber-400">
            Neon Serverless PostgreSQL 연동
          </div>
        </div>
      </div>

      {/* 2. Global Trading Safety Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-500" />
              글로벌 리스크 &amp; 매매 정책 제어
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Live Policy
            </span>
          </div>

          {/* Master Kill Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-white">마스터 트레이딩 킬스위치 (Master Switch)</div>
              <div className="text-xs text-slate-400 mt-0.5">
                OFF 시 모든 전략의 신규 주문이 즉시 전면 차단됩니다.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMasterEnabled(!masterEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                masterEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
              }`}
            >
              {masterEnabled ? '전략 가동중 (ENABLED)' : '전체 중단 (HALTED)'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                최대 레버리지
              </label>
              <select
                value={maxLeverage}
                onChange={(e) => setMaxLeverage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="1.0">1.0x (현물 비차입)</option>
                <option value="1.5">1.5x</option>
                <option value="2.0">2.0x</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                최대 슬리피지 한도 (%)
              </label>
              <input
                type="text"
                value={maxSlippage}
                onChange={(e) => setMaxSlippage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                자동 비상손절 감지 (%)
              </label>
              <input
                type="text"
                value={autoPanicPct}
                onChange={(e) => setAutoPanicPct(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* System Operations & Maintenance */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              인프라 긴급 유지보수 &amp; 캐시 리셋
            </h2>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">KIS OAuth2 토큰 강제 재발급</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  만료 전 캐시된 토큰을 지우고 신규 세션 토큰을 즉시 수령합니다.
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetToken}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                토큰 리셋
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">노드 런타임 메모리 통계</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Heap: {data?.system?.memoryUsage ? Math.round(data.system.memoryUsage.heapUsed / 1024 / 1024) : 48} MB / RSS: {data?.system?.memoryUsage ? Math.round(data.system.memoryUsage.rss / 1024 / 1024) : 110} MB
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                정상
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Community Board Moderation Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-white">게시판 컨텐츠 관리 &amp; 모더레이션</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">총 {posts.length}개 게시물 관리 중</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3 w-16">ID</th>
                <th className="py-2.5 px-3 w-24">카테고리</th>
                <th className="py-2.5 px-3">제목</th>
                <th className="py-2.5 px-3 w-28">작성자</th>
                <th className="py-2.5 px-3 w-28">작성일</th>
                <th className="py-2.5 px-3 w-20 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-mono text-slate-500">{post.id}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                      {post.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-white">{post.title}</td>
                  <td className="py-2.5 px-3 text-slate-400">{post.author}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                      title="게시글 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
