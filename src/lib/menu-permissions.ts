import fs from 'node:fs';
import path from 'node:path';

export type UserGrade = 'guest' | 'member' | 'editor' | 'admin';

export interface UserGradeInfo {
  id: UserGrade;
  name: string;
  desc: string;
  badge: string;
  color: string;
}

export const USER_GRADES: UserGradeInfo[] = [
  {
    id: 'guest',
    name: '게스트 (비회원)',
    desc: '로그인하지 않은 일반 방문자',
    badge: 'bg-slate-800 text-slate-400 border border-slate-700',
    color: 'text-slate-400',
  },
  {
    id: 'member',
    name: '일반 회원',
    desc: '기본 가입 승인된 정회원 계정',
    badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    color: 'text-blue-400',
  },
  {
    id: 'editor',
    name: '우수 / 에디터',
    desc: '전략 및 매매 권한이 부여된 우수 등급',
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    color: 'text-emerald-400',
  },
  {
    id: 'admin',
    name: '최고 관리자',
    desc: '시스템 전체 제어 및 권한 관리자',
    badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    color: 'text-purple-400',
  },
];

export interface MenuItemPermission {
  id: string;
  label: string;
  href: string;
  desc: string;
  category: '메인 서비스' | '퀀트 & 매매' | '커뮤니티' | '관리자 & 설정';
  allowedGrades: UserGrade[];
  minGrade?: UserGrade;
}

export const DEFAULT_MENU_PERMISSIONS: MenuItemPermission[] = [
  {
    id: 'dashboard',
    label: '컨트롤 타워',
    href: '/',
    desc: '실시간 자산 추이, 퀀트 성과 및 KIS 20 TPS 엔진 종합 대시보드',
    category: '메인 서비스',
    allowedGrades: ['guest', 'member', 'editor', 'admin'],
  },
  {
    id: 'strategies',
    label: '동적 퀀트 전략',
    href: '/strategies',
    desc: '무중단 알고리즘 ON/OFF 및 가중치 동적 튜닝 컨트롤러',
    category: '퀀트 & 매매',
    allowedGrades: ['editor', 'admin'],
  },
  {
    id: 'trading',
    label: '실시간 검색 & 주문',
    href: '/trading',
    desc: '종목 실시간 발굴, TradingView 차트, Gemini AI 분석 및 KIS 수동 주문 체결',
    category: '퀀트 & 매매',
    allowedGrades: ['member', 'editor', 'admin'],
  },
  {
    id: 'logs',
    label: '매매 일지',
    href: '/logs',
    desc: '자동매매 · 수동매매 · 비상청산 출처별 연속 체결 감사 로그',
    category: '퀀트 & 매매',
    allowedGrades: ['member', 'editor', 'admin'],
  },
  {
    id: 'board',
    label: '커뮤니티 게시판',
    href: '/board',
    desc: '퀀트 알고리즘 연구, 매매 일지 및 자유로운 투자 의견 교환',
    category: '커뮤니티',
    allowedGrades: ['guest', 'member', 'editor', 'admin'],
  },
  {
    id: 'members',
    label: '회원 & 권한 관리',
    href: '/admin?tab=members',
    desc: '회원 목록 조회, 권한 승급/강등 및 제재 관리',
    category: '관리자 & 설정',
    allowedGrades: ['admin'],
  },
  {
    id: 'settings',
    label: '시스템 환경 설정',
    href: '/settings',
    desc: '한국투자증권(KIS) 및 Google Gemini AI API 키 통합 관리',
    category: '관리자 & 설정',
    allowedGrades: ['admin'],
  },
  {
    id: 'admin',
    label: '통합 관리자 콘솔',
    href: '/admin',
    desc: '시스템 킬스위치, KIS Token Bucket 처리량 및 인프라 모니터링',
    category: '관리자 & 설정',
    allowedGrades: ['admin'],
  },
];

const PERMISSIONS_FILE = path.join(process.cwd(), 'src', 'lib', 'menu-permissions-data.json');

// In-memory cache
let cachedPermissions: MenuItemPermission[] | null = null;

export function getMenuPermissions(): MenuItemPermission[] {
  if (cachedPermissions) {
    return cachedPermissions;
  }

  try {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      const raw = fs.readFileSync(PERMISSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with defaults to ensure all menus exist
        const merged = DEFAULT_MENU_PERMISSIONS.map((def) => {
          const found = parsed.find((p: any) => p.id === def.id || p.href === def.href);
          if (found && Array.isArray(found.allowedGrades)) {
            // Admin must always be allowed
            const grades: UserGrade[] = Array.from(new Set([...found.allowedGrades, 'admin']));
            return { ...def, allowedGrades: grades };
          }
          return def;
        });
        cachedPermissions = merged;
        return merged;
      }
    }
  } catch (err) {
    console.warn('[MenuPermissions] Failed to read permissions file, using defaults:', err);
  }

  cachedPermissions = [...DEFAULT_MENU_PERMISSIONS];
  return cachedPermissions;
}

export function saveMenuPermissions(permissions: MenuItemPermission[]): boolean {
  try {
    // Ensure admin is always included for safety
    const sanitized = permissions.map((p) => {
      const grades: UserGrade[] = Array.from(new Set([...(p.allowedGrades || []), 'admin']));
      return {
        ...p,
        allowedGrades: grades,
      };
    });

    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
    cachedPermissions = sanitized;
    return true;
  } catch (err) {
    console.error('[MenuPermissions] Failed to save permissions file:', err);
    return false;
  }
}

/**
 * 특정 메뉴에 대해 해당 사용자 등급이 접근 가능한지 확인
 */
export function canUserAccessMenu(menuHref: string, userRole?: string | null): boolean {
  const currentGrade: UserGrade = (userRole as UserGrade) || 'guest';
  if (currentGrade === 'admin') return true;

  const all = getMenuPermissions();
  const found = all.find((p) => {
    if (p.href === menuHref) return true;
    if (menuHref.startsWith(p.href) && p.href !== '/') return true;
    return false;
  });

  if (!found) {
    return true; // 등록되지 않은 메뉴는 기본 허용
  }

  return found.allowedGrades.includes(currentGrade);
}
