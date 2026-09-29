import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { kisClient } from '@/lib/kis-client';
import { resolveOrderSource, type OrderSource } from '@/lib/order-source';
import { resolveTickerName } from '@/lib/stock-names';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

const VALID_SOURCES: OrderSource[] = ['AUTO', 'MANUAL', 'PANIC'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function normalizeParam(v: string | null): string {
  return (v || '').trim();
}

function toInt(v: string | null, fallback: number): number {
  const n = parseInt(v || '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function withSource(row: any) {
  const source = resolveOrderSource({ source: row?.source, strategyId: row?.strategyId });
  return { ...row, source };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceParam = normalizeParam(searchParams.get('source')).toUpperCase();
  const sideParam = normalizeParam(searchParams.get('side')).toUpperCase();
  const statusParam = normalizeParam(searchParams.get('status')).toUpperCase();
  const queryParam = normalizeParam(searchParams.get('q') || searchParams.get('ticker'));
  const limit = Math.min(Math.max(toInt(searchParams.get('limit'), DEFAULT_LIMIT), 1), MAX_LIMIT);
  const offset = Math.max(toInt(searchParams.get('offset'), 0), 0);

  try {
    const db = getDb();
    const filters: SQL[] = [];
    if (sourceParam === 'AUTO' || sourceParam === 'MANUAL' || sourceParam === 'PANIC') {
      filters.push(eq(orders.source, sourceParam));
    } else if (sourceParam === 'ALL' || sourceParam === '') {
      // no filter
    } else {
      return NextResponse.json({ error: 'Invalid source (ALL | AUTO | MANUAL | PANIC)' }, { status: 400 });
    }
    if (sideParam === 'BUY' || sideParam === 'SELL') {
      filters.push(eq(orders.side, sideParam));
    }
    if (statusParam) {
      filters.push(eq(orders.status, statusParam));
    }
    if (queryParam) {
      const like = `%${queryParam}%`;
      filters.push(or(ilike(orders.ticker, like), ilike(orders.tickerName, like)) as SQL);
    }
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, totalRows, sourceCounts] = await Promise.all([
      db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ source: orders.source, count: sql<number>`count(*)::int` })
        .from(orders)
        .groupBy(orders.source)
        .then((rs) => {
          const counts: Record<string, number> = { ALL: 0, AUTO: 0, MANUAL: 0, PANIC: 0 };
          for (const r of rs) {
            const key = String(r.source || 'MANUAL').toUpperCase();
            counts[key] = (counts[key] || 0) + (r.count || 0);
            counts.ALL += r.count || 0;
          }
          return counts;
        }),
    ]);

    return NextResponse.json({
      orders: rows.map(withSource),
      total: totalRows,
      limit,
      offset,
      counts: sourceCounts,
    });
  } catch (error: any) {
    const msg = String(error?.message || '');
    // 구 DB(source 컬럼 미적용) 호환: strategy_id 추론으로 메모리 분류
    if (msg.toLowerCase().includes('source') || msg.toLowerCase().includes('column')) {
      try {
        const db = getDb();
        const filters: SQL[] = [];
        if (sideParam === 'BUY' || sideParam === 'SELL') filters.push(eq(orders.side, sideParam));
        if (statusParam) filters.push(eq(orders.status, statusParam));
        if (queryParam) {
          const like = `%${queryParam}%`;
          filters.push(or(ilike(orders.ticker, like), ilike(orders.tickerName, like)) as SQL);
        }
        const where = filters.length > 0 ? and(...filters) : undefined;
        const allRows = await db
          .select()
          .from(orders)
          .where(where)
          .orderBy(desc(orders.createdAt))
          .limit(1000);
        const classified = allRows.map((r: any) => withSource({ ...r, source: r.strategyId }));
        const counts: Record<string, number> = { ALL: classified.length, AUTO: 0, MANUAL: 0, PANIC: 0 };
        for (const r of classified) counts[r.source] = (counts[r.source] || 0) + 1;
        const filtered =
          sourceParam === 'AUTO' || sourceParam === 'MANUAL' || sourceParam === 'PANIC'
            ? classified.filter((r) => r.source === sourceParam)
            : classified;
        return NextResponse.json({
          orders: filtered.slice(offset, offset + limit),
          total: filtered.length,
          limit,
          offset,
          counts,
          legacy: true,
        });
      } catch (_) {
        // fall through to mock
      }
    }
    console.warn('[API Orders GET] Database query failed or uninitialized:', error.message);
    return NextResponse.json({
      orders: [],
      total: 0,
      limit,
      offset,
      counts: { ALL: 0, AUTO: 0, MANUAL: 0, PANIC: 0 },
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticker, tickerName, side, orderType, price, quantity, strategyId, source } = body;

    if (!ticker || !side || !quantity) {
      return NextResponse.json({ error: 'Ticker, side and quantity are required' }, { status: 400 });
    }

    const resolvedSource = resolveOrderSource({ source, strategyId });

    // 종목명 해결 (힌트 → 마스터맵 → KIS 실시간 조회)
    const resolvedName = await resolveTickerName(ticker, tickerName);

    // Submit order via KIS client
    const kisResult = await kisClient.submitOrder({
      ticker,
      side: side as 'BUY' | 'SELL',
      orderType: orderType || '00',
      price: price ? parseFloat(price) : 0,
      quantity: parseInt(quantity, 10),
    });

    // Record order in Neon DB (유실 없이 계속 기록)
    try {
      const db = getDb();
      const qty = parseInt(quantity, 10);
      const priceStr = price ? price.toString() : '0';
      const values: typeof orders.$inferInsert = {
        strategyId: strategyId || (resolvedSource === 'AUTO' ? null : 'MANUAL'),
        source: resolvedSource,
        ticker,
        tickerName: resolvedName,
        side,
        orderType: orderType || '00',
        price: priceStr,
        quantity: qty,
        executedPrice: priceStr,
        executedQuantity: qty,
        kisOrderNo: kisResult.orderNo,
        status: kisResult.success ? 'EXECUTED' : 'FAILED',
        failReason: kisResult.success ? null : kisResult.message,
      };
      let inserted: any = null;
      try {
        [inserted] = await db.insert(orders).values(values).returning();
      } catch (err: any) {
        // 구 DB(source 컬럼 미적용) 호환: source 없이 재시도
        if (err?.message?.includes('source') || err?.message?.includes('column')) {
          const { source: _dropped, ...legacyValues } = values;
          [inserted] = await db.insert(orders).values(legacyValues as any).returning();
          inserted = withSource({ ...inserted, source: resolvedSource });
        } else {
          throw err;
        }
      }

      return NextResponse.json({
        success: true,
        order: withSource(inserted),
        message: kisResult.message,
      });
    } catch (dbErr: any) {
      console.warn('[API Orders POST] DB insert failed (order still executed):', dbErr.message);
      return NextResponse.json({
        success: true,
        orderNo: kisResult.orderNo,
        message: kisResult.message,
      });
    }
  } catch (error: any) {
    console.error('[API Orders POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
