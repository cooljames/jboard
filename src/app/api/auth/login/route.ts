import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isValidEmail, setSessionCookie, toPublicUser, verifyPassword } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !isValidEmail(email) || !password) {
      return NextResponse.json({ error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: '서버 데이터베이스 설정(DATABASE_URL)이 누락되었습니다. Vercel 대시보드(Settings > Environment Variables)에 DATABASE_URL을 등록해주세요.',
      }, { status: 500 });
    }

    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const row = rows[0];
    if (!row || !verifyPassword(password, row.passwordHash)) {
      return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }
    if (row.status === 'banned') {
      return NextResponse.json({ error: '차단된 계정입니다. 관리자에게 문의하세요.' }, { status: 403 });
    }

    await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, row.id));

    const session = setSessionCookie(row.id);
    const store = await cookies();
    store.set(session.name, session.value, session.options as any);

    return NextResponse.json({ success: true, user: toPublicUser({ ...row, lastLoginAt: new Date() }) });
  } catch (error: any) {
    console.error('[Auth Login] Error:', error);
    const msg = error?.message || '로그인 중 오류가 발생했습니다.';
    return NextResponse.json({
      error: !process.env.DATABASE_URL
        ? '서버 데이터베이스 설정(DATABASE_URL)이 누락되었습니다. Vercel 대시보드(Settings > Environment Variables)에 DATABASE_URL을 등록해주세요.'
        : `로그인 오류: ${msg}`,
    }, { status: 500 });
  }
}
