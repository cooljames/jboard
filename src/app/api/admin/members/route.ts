import { NextResponse } from 'next/server';

// Initial seed members (mirroring jboard member data structure)
let inMemoryMembers = [
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
  {
    id: 2,
    name: '알고퀀터',
    email: 'quant_pro@jboard.co.kr',
    role: 'editor',
    status: 'active',
    postsCount: 24,
    lastLogin: new Date(Date.now() - 3600000 * 2).toISOString(),
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
    joined: '2026-02-01',
  },
  {
    id: 3,
    name: '스마트트레이더',
    email: 'trader77@jboard.co.kr',
    role: 'member',
    status: 'active',
    postsCount: 12,
    lastLogin: new Date(Date.now() - 3600000 * 8).toISOString(),
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
    joined: '2026-02-18',
  },
  {
    id: 4,
    name: '초보퀀트',
    email: 'beginner@jboard.co.kr',
    role: 'member',
    status: 'inactive',
    postsCount: 3,
    lastLogin: new Date(Date.now() - 86400000 * 4).toISOString(),
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80',
    joined: '2026-03-10',
  },
  {
    id: 5,
    name: '스패머차단계정',
    email: 'spammer@tempmail.com',
    role: 'member',
    status: 'banned',
    postsCount: 0,
    lastLogin: new Date(Date.now() - 86400000 * 12).toISOString(),
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
    joined: '2026-03-22',
  },
];

export async function GET() {
  return NextResponse.json({
    members: inMemoryMembers,
    stats: {
      total: inMemoryMembers.length,
      active: inMemoryMembers.filter((m) => m.status === 'active').length,
      staff: inMemoryMembers.filter((m) => m.role === 'admin' || m.role === 'editor').length,
      banned: inMemoryMembers.filter((m) => m.status === 'banned').length,
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, role, status } = body;

    const member = inMemoryMembers.find((m) => m.id === Number(id));
    if (!member) {
      return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (role) member.role = role;
    if (status) member.status = status;

    return NextResponse.json({
      success: true,
      message: `${member.name} 님의 정보가 업데이트되었습니다.`,
      member,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    inMemoryMembers = inMemoryMembers.filter((m) => m.id !== Number(id));

    return NextResponse.json({
      success: true,
      message: '회원이 삭제되었습니다.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
