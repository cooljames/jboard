import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { boardPosts, users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth';
import { desc, eq, sql } from 'drizzle-orm';

// DB 미연결 시 폴백용 시드 (기존 인메모리 목과 동일 구조)
const fallbackMembers = [
  {
    id: 1,
    name: '관리자',
    email: 'admin@jboard.co.kr',
    role: 'admin',
    status: 'active',
    postsCount: 18,
    lastLogin: new Date().toISOString(),
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80',
    joined: '2026-01-15',
  },
];

const VALID_ROLES = ['admin', 'editor', 'member'];
const VALID_STATUSES = ['active', 'inactive', 'banned'];

function toMemberShape(row: typeof users.$inferSelect, postsCount: number) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    postsCount,
    lastLogin: row.lastLoginAt ? new Date(row.lastLoginAt).toISOString() : null,
    avatar: null,
    joined: row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : null,
  };
}

async function getMembersFromDb() {
  const db = getDb();
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  let counts: Record<string, number> = {};
  try {
    const postCounts = await db
      .select({ author: boardPosts.author, count: sql<number>`count(*)::int` })
      .from(boardPosts)
      .groupBy(boardPosts.author);
    for (const r of postCounts) counts[r.author] = r.count ?? 0;
  } catch {
    counts = {};
  }
  return rows.map((r) => toMemberShape(r, counts[r.name] ?? 0));
}

export async function GET() {
  try {
    const members = await getMembersFromDb();
    return NextResponse.json({
      members,
      stats: {
        total: members.length,
        active: members.filter((m) => m.status === 'active').length,
        staff: members.filter((m) => m.role === 'admin' || m.role === 'editor').length,
        banned: members.filter((m) => m.status === 'banned').length,
      },
    });
  } catch (err: any) {
    console.warn('[Members GET] DB unavailable, using fallback:', err?.message);
    return NextResponse.json({
      members: fallbackMembers,
      stats: {
        total: fallbackMembers.length,
        active: fallbackMembers.filter((m) => m.status === 'active').length,
        staff: fallbackMembers.filter((m) => m.role === 'admin' || m.role === 'editor').length,
        banned: fallbackMembers.filter((m) => m.status === 'banned').length,
      },
      fallback: true,
    });
  }
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  try {
    const body = await request.json();
    const { id, role, status } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 역할입니다.' }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 });
    }
    // 마지막 관리자 강등/차단 방지
    if (role || status) {
      const db = getDb();
      const target = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
      if (!target[0]) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
      if (target[0].role === 'admin' && (role !== 'admin' || status === 'banned')) {
        const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
        if (admins.length <= 1) {
          return NextResponse.json({ error: '마지막 관리자는 변경할 수 없습니다.' }, { status: 400 });
        }
      }
      const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
      if (role) patch.role = role;
      if (status) patch.status = status;
      const [updated] = await db.update(users).set(patch).where(eq(users.id, Number(id))).returning();
      return NextResponse.json({
        success: true,
        message: `${updated.name} 님의 정보가 업데이트되었습니다.`,
        member: toMemberShape(updated, 0),
      });
    }
    return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getDb();
    const target = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
    if (!target[0]) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
    if (target[0].id === (guard as { user: { id: number } }).user.id) {
      return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 400 });
    }
    if (target[0].role === 'admin') {
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
      if (admins.length <= 1) {
        return NextResponse.json({ error: '마지막 관리자는 삭제할 수 없습니다.' }, { status: 400 });
      }
    }
    await db.delete(users).where(eq(users.id, Number(id)));
    return NextResponse.json({ success: true, message: '회원이 삭제되었습니다.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
