import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword, isValidEmail, setSessionCookie, toPublicUser } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const name = String(body?.name || '').trim();
    const password = String(body?.password || '');

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: '올바른 이메일 주소를 입력해주세요.' }, { status: 400 });
    }
    if (!name || name.length > 20) {
      return NextResponse.json({ error: '이름을 20자 이내로 입력해주세요.' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: '비밀번호는 8자 이상 72자 이하로 입력해주세요.' }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
    }

    // 첫 가입자는 자동으로 관리자 (기본 관리자 시드가 없을 때의 부트스트랩)
    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .then((r) => r[0]?.count ?? 0);

    const [row] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash: hashPassword(password),
        role: total === 0 ? 'admin' : 'member',
        status: 'active',
      })
      .returning();

    const session = setSessionCookie(row.id);
    const store = await cookies();
    store.set(session.name, session.value, session.options as any);

    return NextResponse.json({ success: true, user: toPublicUser(row) });
  } catch (error: any) {
    // Neon unique violation fallback
    if (String(error?.message || '').includes('duplicate') || String(error?.code) === '23505') {
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
    }
    console.error('[Auth Signup] Error:', error);
    return NextResponse.json({ error: '회원가입 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
