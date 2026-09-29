import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export const SESSION_COOKIE = 'jquant_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || '';
  if (!secret || secret.includes('super_secret')) {
    console.warn('[Auth] AUTH_SECRET이 기본값입니다. 운영 환경에서는 반드시 변경하세요.');
  }
  return secret || 'jquant-dev-only-secret-do-not-use-in-production';
}

function b64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

// ── 비밀번호 해시 (scrypt, 추가 의존성 없음) ──
// 형식: scrypt$N$r$p$saltHex$hashHex
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$16384$8$1$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts[0] !== 'scrypt' || parts.length !== 6) return false;
    const [, N, r, p, salt, hashHex] = parts;
    // 주의: hashPassword()가 salt hex 문자열 그대로를 scrypt salt로 사용하므로
    // 검증 때도 동일하게 hex 문자열을 전달해야 함 (Buffer 변환 시 바이트가 달라짐)
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    void N;
    void r;
    void p;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// ── 세션 토큰 (HMAC-SHA256 서명, JWT 라이브러리 불필요) ──
// 형식: base64url(userId).base64url(exp).base64url(sig)
export function signSession(userId: number, maxAgeSec = SESSION_MAX_AGE_SEC): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = `${b64urlEncode(String(userId))}.${b64urlEncode(String(exp))}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(token: string): { userId: number } | null {
  try {
    const [uidB64, expB64, sig] = token.split('.');
    if (!uidB64 || !expB64 || !sig) return null;
    const payload = `${uidB64}.${expB64}`;
    const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const exp = parseInt(b64urlDecode(expB64), 10);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
    const userId = parseInt(b64urlDecode(uidB64), 10);
    if (!Number.isFinite(userId)) return null;
    return { userId };
  } catch {
    return null;
  }
}

export function toPublicUser(row: typeof users.$inferSelect): PublicUser {
  return { id: row.id, email: row.email, name: row.name, role: row.role, status: row.status };
}

export function setSessionCookie(userId: number): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: SESSION_COOKIE,
    value: signSession(userId),
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE_SEC,
      secure: process.env.NODE_ENV === 'production',
    },
  };
}

/** 현재 요청의 세션 쿠키를 검증하고 DB의 회원 정보를 반환 (없으면 null) */
export async function getSessionUser(): Promise<PublicUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const parsed = verifySession(token);
    if (!parsed) return null;
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, parsed.userId)).limit(1);
    const row = rows[0];
    if (!row || row.status === 'banned') return null;
    return toPublicUser(row);
  } catch {
    return null;
  }
}

/** 관리자 전용 가드: { user } 또는 { error, status } 반환 */
export async function requireAdmin(): Promise<{ user: PublicUser } | { error: string; status: number }> {
  const user = await getSessionUser();
  if (!user) return { error: '로그인이 필요합니다.', status: 401 };
  if (user.role !== 'admin') return { error: '관리자 권한이 필요합니다.', status: 403 };
  return { user };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
