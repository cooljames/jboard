import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { boardPosts } from '@/lib/db/schema';
import { desc, eq, ilike } from 'drizzle-orm';

// Fallback seed posts (when database table is empty or during offline development)
let inMemoryPosts = [
  {
    id: 1,
    title: '[공지] QuantAntigravity-KIS v2.0.0 시스템 오픈 및 KIS 실시간 API 연동 안내',
    category: '공지사항',
    author: '운영자',
    content: '안녕하세요! 한국투자증권(KIS) 20 TPS Token Bucket이 적용된 v2.0.0 퀀트 시스템이 오픈되었습니다. 이제 웹 환경 설정(Settings) 메뉴에서 KIS API Key 및 Google Gemini AI 키를 직접 등록하여 실시간 자동매매와 AI 종목 분석을 활용하실 수 있습니다.',
    views: 428,
    likes: 34,
    isNotice: true,
    tags: ['공지', 'KIS', 'v2.0'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 2,
    title: '래리 윌리엄스 변동성 돌파(k=0.5) 전략 3개월 백테스트 및 실전 운용 후기',
    category: '퀀트전략',
    author: '알고퀀터',
    content: 'KOSPI 상위 20 종목 대상 변동성 돌파 전략을 k=0.5로 세팅하여 지난 분기 운용했습니다. 일간 승률 약 58%, 최대 낙폭(MDD) -3.2% 수준으로 매우 안정적인 성과를 기록 중입니다. 동적 전략 컨트롤러에서 당일 목표가 도달 시 시장가 매수 체결 속도가 150ms 이내로 잘 유지됩니다.',
    views: 295,
    likes: 19,
    isNotice: false,
    tags: ['변동성돌파', '전략후기', 'KOSPI'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 3,
    title: '기관/외인 쌍끌이 수급 포착 전략과 Gemini 2.0 Flash 분석 시너지',
    category: '매매일지',
    author: '스마트트레이더',
    content: '금일 장 초반 SK하이닉스와 현대차에 외인/기관 동시 순매수 유입을 포착하여 30% 비중으로 진입했습니다. AI 스마트 종목 발굴에서 Gemini 2.0 Flash 멀티모달 차트 진단을 병행하여 목표 익절가 도달 후 분할 매도 완료했습니다.',
    views: 182,
    likes: 12,
    isNotice: false,
    tags: ['쌍끌이', 'AI분석', '수익인증'],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 4,
    title: '모의투자 API와 실전투자 API 전환 시 주의할 점 (계좌번호 및 URL)',
    category: 'Q&A',
    author: '초보퀀트',
    content: '환경설정(Settings)에서 모의투자와 실전투자를 전환할 때 주의할 점이 있나요? 모의투자는 포트 29443, 실전은 9443으로 자동 스위칭되니 계좌번호 8자리만 맞추면 정상 동작하나요?',
    views: 115,
    likes: 7,
    isNotice: false,
    tags: ['질문', '모의투자', 'API'],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const q = searchParams.get('q')?.toLowerCase();

  try {
    const db = getDb();
    let query = db.select().from(boardPosts).orderBy(desc(boardPosts.isNotice), desc(boardPosts.createdAt));
    const rows = await query;

    if (rows && rows.length > 0) {
      let filtered = rows;
      if (category && category !== '전체') {
        filtered = filtered.filter((p) => p.category === category);
      }
      if (q) {
        filtered = filtered.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
      }
      return NextResponse.json({ posts: filtered });
    }
  } catch (e: any) {
    console.warn('[Board API] Using in-memory posts fallback:', e.message);
  }

  // Fallback
  let filtered = [...inMemoryPosts];
  if (category && category !== '전체') {
    filtered = filtered.filter((p) => p.category === category);
  }
  if (q) {
    filtered = filtered.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
  }
  return NextResponse.json({ posts: filtered });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, category, content, author, tags, isNotice } = body;

    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용을 모두 입력해주세요.' }, { status: 400 });
    }

    const newPost = {
      id: Date.now(),
      title,
      category: category || '자유게시판',
      content,
      author: author || '투자자',
      views: 0,
      likes: 0,
      isNotice: Boolean(isNotice),
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const db = getDb();
      const [inserted] = await db.insert(boardPosts).values({
        title,
        category: category || '자유게시판',
        content,
        author: author || '투자자',
        isNotice: Boolean(isNotice),
        tags: tags || [],
      }).returning();
      if (inserted) {
        return NextResponse.json({ success: true, post: inserted });
      }
    } catch (e: any) {
      console.warn('[Board API POST] DB Insert failed, falling back to memory store:', e.message);
    }

    inMemoryPosts.unshift(newPost);
    return NextResponse.json({ success: true, post: newPost });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const post = inMemoryPosts.find((p) => p.id === Number(id));
    if (post) {
      if (action === 'like') post.likes += 1;
      if (action === 'view') post.views += 1;
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    inMemoryPosts = inMemoryPosts.filter((p) => p.id !== Number(id));

    try {
      const db = getDb();
      await db.delete(boardPosts).where(eq(boardPosts.id, Number(id)));
    } catch {}

    return NextResponse.json({ success: true, message: '게시글이 삭제되었습니다.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
