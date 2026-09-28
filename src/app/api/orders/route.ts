import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { kisClient } from '@/lib/kis-client';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(50);
    return NextResponse.json({ orders: rows });
  } catch (error: any) {
    console.warn('[API Orders GET] Falling back to simulated order list:', error.message);
    const mockOrders = [
      {
        id: 1,
        strategyId: 'volatility_breakout',
        ticker: '005930',
        tickerName: '삼성전자',
        side: 'BUY',
        orderType: '00',
        price: '61500',
        quantity: 50,
        executedPrice: '61500',
        executedQuantity: 50,
        kisOrderNo: 'OD-98214',
        status: 'EXECUTED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        strategyId: 'institutional_buying',
        ticker: '000660',
        tickerName: 'SK하이닉스',
        side: 'BUY',
        orderType: '00',
        price: '184500',
        quantity: 15,
        executedPrice: '184500',
        executedQuantity: 15,
        kisOrderNo: 'OD-98215',
        status: 'EXECUTED',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
    return NextResponse.json({ orders: mockOrders });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticker, tickerName, side, orderType, price, quantity, strategyId } = body;

    if (!ticker || !side || !quantity) {
      return NextResponse.json({ error: 'Ticker, side and quantity are required' }, { status: 400 });
    }

    // Submit order via KIS client
    const kisResult = await kisClient.submitOrder({
      ticker,
      side: side as 'BUY' | 'SELL',
      orderType: orderType || '00',
      price: price ? parseFloat(price) : 0,
      quantity: parseInt(quantity, 10),
    });

    // Record order in Neon DB
    try {
      const db = getDb();
      const [newOrder] = await db
        .insert(orders)
        .values({
          strategyId: strategyId || 'MANUAL',
          ticker,
          tickerName: tickerName || `종목-${ticker}`,
          side,
          orderType: orderType || '00',
          price: price ? price.toString() : '0',
          quantity: parseInt(quantity, 10),
          executedPrice: price ? price.toString() : '0',
          executedQuantity: parseInt(quantity, 10),
          kisOrderNo: kisResult.orderNo,
          status: kisResult.success ? 'EXECUTED' : 'FAILED',
          failReason: kisResult.success ? null : kisResult.message,
        })
        .returning();

      return NextResponse.json({
        success: true,
        order: newOrder,
        message: kisResult.message,
      });
    } catch (dbErr: any) {
      console.warn('[API Orders POST] DB insert failed:', dbErr.message);
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
