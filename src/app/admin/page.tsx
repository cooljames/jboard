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
  MessageSquare,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Check,
  X,
  Key,
  BarChart3,
  ArrowLeftRight,
  ScrollText,
  Save,
  HelpCircle
} from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsDirty, setPermissionsDirty] = useState(false);
  const [permissionCategory, setPermissionCategory] = useState<string>('ALL');

  const [adminTab, setAdminTab] = useState<'system' | 'members' | 'posts' | 'permissions'>('system');
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Form states for Admin Config
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [maxLeverage, setMaxLeverage] = useState('1.0');
  const [maxSlippage, setMaxSlippage] = useState('0.3');
  const [autoPanicPct, setAutoPanicPct] = useState('5.0');

  useEffect(() => {
    // Check URL query param ?tab=members | permissions | posts
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'members') setAdminTab('members');
      if (tab === 'posts') setAdminTab('posts');
      if (tab === 'permissions') setAdminTab('permissions');
    }

    fetchAdminData();
    fetchBoardPosts();
    fetchMembers();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/admin/permissions');
      if (res.ok) {
        const json = await res.json();
        setPermissions(json.permissions || []);
        if (json.grades) setGrades(json.grades);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const handleToggleGrade = (id: string, grade: string) => {
    if (grade === 'admin') return; // Admin is always locked
    setPermissions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const currentGrades: string[] = item.allowedGrades || [];
        const hasGrade = currentGrades.includes(grade);
        const nextGrades = hasGrade
          ? currentGrades.filter((g) => g !== grade)
          : [...currentGrades, grade];
        return {
          ...item,
          allowedGrades: Array.from(new Set([...nextGrades, 'admin'])),
        };
      })
    );
    setPermissionsDirty(true);
  };

  const handleSetQuickPreset = (id: string, preset: 'all' | 'member' | 'editor' | 'admin') => {
    const gradeMap: Record<string, string[]> = {
      all: ['guest', 'member', 'editor', 'admin'],
      member: ['member', 'editor', 'admin'],
      editor: ['editor', 'admin'],
      admin: ['admin'],
    };
    setPermissions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, allowedGrades: gradeMap[preset] };
      })
    );
    setPermissionsDirty(true);
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotice('✅ 메뉴별 접근 권한이 성공적으로 저장되었습니다.');
        setPermissionsDirty(false);
        setTimeout(() => setNotice(null), 3500);
        if (json.permissions) setPermissions(json.permissions);
      } else {
        setNotice(`❌ 저장 실패: ${json.error || '권한 저장 오류'}`);
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err: any) {
      alert(`저장 오류: ${err.message}`);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleResetPermissions = async () => {
    if (!confirm('정말로 모든 메뉴 권한을 시스템 기본값으로 초기화하시겠습니까?')) return;
    setSavingPermissions(true);
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotice('🔄 메뉴 접근 권한이 시스템 기본값으로 복원되었습니다.');
        setPermissionsDirty(false);
        setTimeout(() => setNotice(null), 3500);
        if (json.permissions) setPermissions(json.permissions);
      }
    } catch (err: any) {
      alert(`초기화 오류: ${err.message}`);
    } finally {
      setSavingPermissions(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/admin/members');
      if (res.ok) {
        const json = await res.json();
        setMembers(json.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const handleUpdateMember = async (id: number, role?: string, status?: string) => {
    try {
      const res = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice('✅ 회원 정보가 성공적으로 변경되었습니다.');
        setTimeout(() => setNotice(null), 3000);
        fetchMembers();
      } else if (res.status === 401) {
        setNotice('🔒 로그인이 필요합니다. 우측 상단에서 로그인하세요.');
        setTimeout(() => setNotice(null), 4000);
      } else {
        setNotice(`❌ 수정 실패: ${data.error || '오류 발생'}`);
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err: any) {
      alert(`수정 실패: ${err.message}`);
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('정말로 이 회원을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/admin/members?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        setNotice('회원이 삭제되었습니다.');
        setTimeout(() => setNotice(null), 3000);
      } else {
        setNotice(`❌ 삭제 실패: ${data.error || '오류 발생'}`);
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
  };


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

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setAdminTab('system')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'system'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>시스템 &amp; 퀀트 킬스위치</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('members')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'members'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>회원 관리 &amp; 권한 제어 ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('posts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'posts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>게시판 모더레이션 ({posts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('permissions')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'permissions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>등급별 메뉴 접근 권한 제어 ({permissions.length})</span>
          {permissionsDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      </div>

      {/* ══ TAB 1: SYSTEM & QUANT CONTROLS ══ */}
      {adminTab === 'system' && (
        <div className="space-y-6">
          {/* Infrastructure Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Global Trading Safety Controls */}
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
        </div>
      )}

      {/* ══ TAB 2: MEMBERS MANAGEMENT (jboard 연동) ══ */}
      {adminTab === 'members' && (
        <div className="space-y-6">
          {/* Member Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">전체 등록 회원</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">{members.length}명</div>
              <div className="text-[11px] text-slate-400">jboard 회원 통합 연동</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">활동 회원</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {members.filter((m) => m.status === 'active').length}명
              </div>
              <div className="text-[11px] text-emerald-400">정상 로그인 및 매매 참여</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">운영진 및 에디터</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                {members.filter((m) => m.role === 'admin' || m.role === 'editor').length}명
              </div>
              <div className="text-[11px] text-purple-400">시스템 관리 권한 보유</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">이용 정지 (Banned)</span>
                <UserX className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400">
                {members.filter((m) => m.status === 'banned').length}명
              </div>
              <div className="text-[11px] text-rose-400">스팸/이상 거래 제재</div>
            </div>
          </div>

          {/* Members Table */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-semibold text-white">회원 명단 및 권한 관리</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">총 {members.length}명 관리 중</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">ID</th>
                    <th className="py-2.5 px-3">회원 정보</th>
                    <th className="py-2.5 px-3">이메일</th>
                    <th className="py-2.5 px-3 text-center w-24">역할</th>
                    <th className="py-2.5 px-3 text-center w-24">상태</th>
                    <th className="py-2.5 px-3 text-center w-20">게시글</th>
                    <th className="py-2.5 px-3 text-center w-32">최근 접속</th>
                    <th className="py-2.5 px-3 text-center w-28">권한 변경</th>
                    <th className="py-2.5 px-3 text-center w-16">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{m.id}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <img src={m.avatar} className="w-7 h-7 rounded-full border border-slate-700" alt={m.name} />
                          <div>
                            <div className="font-semibold text-white">{m.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">가입: {m.joined}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{m.email}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.role === 'admin'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : m.role === 'editor'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {m.role === 'admin' ? '관리자' : m.role === 'editor' ? '에디터' : '일반회원'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : m.status === 'banned'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {m.status === 'active' ? '활동중' : m.status === 'banned' ? '이용정지' : '미접속'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{m.postsCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                        {new Date(m.lastLogin).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateMember(m.id, e.target.value, undefined)}
                            className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-200 focus:outline-none"
                          >
                            <option value="admin">관리자</option>
                            <option value="editor">에디터</option>
                            <option value="member">일반</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleUpdateMember(m.id, undefined, m.status === 'banned' ? 'active' : 'banned')}
                            className={`p-1 rounded text-[10px] font-bold ${
                              m.status === 'banned'
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                            }`}
                            title={m.status === 'banned' ? '정지 해제' : '이용 정지'}
                          >
                            {m.status === 'banned' ? '해제' : '정지'}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-1 text-rose-400 hover:text-rose-300"
                          title="회원 삭제"
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
      )}

      {/* ══ TAB 3: POSTS MODERATION ══ */}
      {adminTab === 'posts' && (
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
      )}

      {/* ══ TAB 4: GRADE-BASED MENU ACCESS CONTROL (RBAC Matrix) ══ */}
      {adminTab === 'permissions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Info Banner & Action Strip */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    사용자 등급(Grade)별 메뉴 접근 권한 매트릭스
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  플랫폼 내 각 주요 기능 및 페이지 메뉴에 대한 인가(Authorization)를 사용자 역할 등급별로 세분화하여 통제합니다.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetPermissions}
                  disabled={savingPermissions}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                  title="기본값 복원"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>기본 정책 복원</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Set all non-admin to member+ (strict)
                    setPermissions((prev) =>
                      prev.map((item) => {
                        if (item.category === '관리자 & 설정') return item;
                        return { ...item, allowedGrades: ['member', 'editor', 'admin'] };
                      })
                    );
                    setPermissionsDirty(true);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>일괄 보안 강화 (회원 전용)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={savingPermissions}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                    permissionsDirty
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPermissions ? '저장 중...' : permissionsDirty ? '변경사항 저장하기 (저장 필요)' : '권한 정책 저장'}</span>
                </button>
              </div>
            </div>

            {/* User Grades Explanation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" /> 게스트 (Guest)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">비회원</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  로그인하지 않은 방문자. 공개 허용된 대시보드 및 게시판만 접근 가능.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> 일반 회원 (Member)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">기본 등급</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  가입 승인된 정회원. 실시간 종목 시세 조회 및 기본 주문/매매일지 열람.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> 우수 / 에디터 (Editor)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">고급 등급</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  퀀트 전략 가중치 변경, 알고리즘 ON/OFF 및 전략 파라미터 제어 권한.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" /> 최고 관리자 (Admin)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">영구 전권</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  인프라 킬스위치, KIS Token Bucket, API Key 환경설정, 회원 등급 관리.
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 me-1 hidden sm:inline">카테고리 필터:</span>
            {['ALL', '메인 서비스', '퀀트 & 매매', '커뮤니티', '관리자 & 설정'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPermissionCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                  permissionCategory === cat
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? '전체 메뉴 (8)' : cat}
              </button>
            ))}
          </div>

          {/* Permissions Matrix Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-300 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 w-72">메뉴 및 기능 설명</th>
                    <th className="py-3.5 px-3 w-28 text-center">카테고리</th>
                    <th className="py-3.5 px-3 w-32 text-center text-slate-400 font-bold">
                      🌐 게스트<br /><span className="text-[10px] font-normal lowercase">(guest)</span>
                    </th>
                    <th className="py-3.5 px-3 w-32 text-center text-blue-400 font-bold">
                      👤 일반 회원<br /><span className="text-[10px] font-normal lowercase">(member)</span>
                    </th>
                    <th className="py-3.5 px-3 w-32 text-center text-emerald-400 font-bold">
                      ⭐ 우수/에디터<br /><span className="text-[10px] font-normal lowercase">(editor)</span>
                    </th>
                    <th className="py-3.5 px-3 w-32 text-center text-purple-400 font-bold">
                      👑 최고 관리자<br /><span className="text-[10px] font-normal lowercase">(admin - 고정)</span>
                    </th>
                    <th className="py-3.5 px-4 w-44 text-center">현재 인가 정책</th>
                    <th className="py-3.5 px-4 text-center w-52">빠른 등급 설정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {permissions
                    .filter((p) => permissionCategory === 'ALL' || p.category === permissionCategory)
                    .map((item) => {
                      const allowed: string[] = item.allowedGrades || [];
                      const hasGuest = allowed.includes('guest');
                      const hasMember = allowed.includes('member');
                      const hasEditor = allowed.includes('editor');
                      const hasAdmin = allowed.includes('admin');

                      let summaryText = '사용자 맞춤형';
                      let summaryBadge = 'bg-amber-500/10 text-amber-300 border-amber-500/20';

                      if (hasGuest && hasMember && hasEditor && hasAdmin) {
                        summaryText = '전체 공개 (게스트 포함)';
                        summaryBadge = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                      } else if (!hasGuest && hasMember && hasEditor && hasAdmin) {
                        summaryText = '일반 정회원 이상';
                        summaryBadge = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                      } else if (!hasGuest && !hasMember && hasEditor && hasAdmin) {
                        summaryText = '우수 / 에디터 이상';
                        summaryBadge = 'bg-purple-500/10 text-purple-300 border-purple-500/30';
                      } else if (!hasGuest && !hasMember && !hasEditor && hasAdmin) {
                        summaryText = '최고 관리자 전용';
                        summaryBadge = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/25 transition-colors">
                          {/* Menu Meta */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-blue-400 flex-shrink-0 mt-0.5">
                                {item.id === 'dashboard' && <BarChart3 className="w-4 h-4 text-blue-400" />}
                                {item.id === 'strategies' && <Sliders className="w-4 h-4 text-purple-400" />}
                                {item.id === 'trading' && <ArrowLeftRight className="w-4 h-4 text-emerald-400" />}
                                {item.id === 'logs' && <ScrollText className="w-4 h-4 text-indigo-400" />}
                                {item.id === 'board' && <MessageSquare className="w-4 h-4 text-amber-400" />}
                                {item.id === 'members' && <Users className="w-4 h-4 text-cyan-400" />}
                                {item.id === 'settings' && <Key className="w-4 h-4 text-rose-400" />}
                                {item.id === 'admin' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{item.label}</span>
                                  <span className="font-mono text-[11px] text-slate-500 font-normal">({item.href})</span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                  {item.desc}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                              {item.category}
                            </span>
                          </td>

                          {/* Guest Checkbox */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleGrade(item.id, 'guest')}
                              className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center justify-center ${
                                hasGuest
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400'
                              }`}
                              title={hasGuest ? '게스트 접근 허용됨' : '게스트 차단됨'}
                            >
                              {hasGuest ? <Check className="w-4 h-4 font-bold" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Member Checkbox */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleGrade(item.id, 'member')}
                              className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center justify-center ${
                                hasMember
                                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400'
                              }`}
                              title={hasMember ? '일반 회원 접근 허용됨' : '일반 회원 차단됨'}
                            >
                              {hasMember ? <Check className="w-4 h-4 font-bold" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Editor Checkbox */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleGrade(item.id, 'editor')}
                              className={`p-2 rounded-xl border transition-all cursor-pointer inline-flex items-center justify-center ${
                                hasEditor
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400'
                              }`}
                              title={hasEditor ? '에디터 접근 허용됨' : '에디터 차단됨'}
                            >
                              {hasEditor ? <Check className="w-4 h-4 font-bold" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Admin Checkbox (Permanently Locked / Always Checked) */}
                          <td className="py-3.5 px-3 text-center">
                            <div
                              className="p-2 rounded-xl border border-purple-500/40 bg-purple-500/15 text-purple-300 inline-flex items-center justify-center cursor-not-allowed opacity-90"
                              title="관리자는 시스템 안전을 위해 항상 모든 메뉴에 접근할 수 있습니다 (영구 허용)"
                            >
                              <Check className="w-4 h-4 font-bold" />
                            </div>
                          </td>

                          {/* Permission Summary Badge */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg border ${summaryBadge}`}>
                              {summaryText}
                            </span>
                          </td>

                          {/* Quick Preset Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSetQuickPreset(item.id, 'all')}
                                className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="비회원 포함 전체 공개"
                              >
                                전체
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetQuickPreset(item.id, 'member')}
                                className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition-colors cursor-pointer"
                                title="정회원 이상 허용"
                              >
                                회원+
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetQuickPreset(item.id, 'editor')}
                                className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-colors cursor-pointer"
                                title="우수/에디터 이상 허용"
                              >
                                에디터+
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetQuickPreset(item.id, 'admin')}
                                className="px-2 py-1 rounded text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                                title="최고 관리자 전용"
                              >
                                관리자
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Alert Bar if Unsaved Changes */}
          {permissionsDirty && (
            <div className="sticky bottom-6 p-4 rounded-2xl bg-gradient-to-r from-amber-950/90 to-slate-900 border border-amber-500/40 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2.5 text-amber-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
                <div>
                  <div className="text-xs font-bold text-white">메뉴별 접근 권한에 저장되지 않은 변경사항이 있습니다.</div>
                  <div className="text-[11px] text-amber-400/90">변경한 인가 정책을 시스템에 즉시 반영하려면 저장을 눌러주세요.</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchPermissions}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={savingPermissions}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPermissions ? '저장 중...' : '지금 변경사항 적용하기'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
