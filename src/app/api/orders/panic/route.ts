import { NextResponse } from 'next/server';
import { kisClient } from '@/lib/kis-client';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { resolveTickerName } from '@/lib/stock-names';

export async function POST() {
  try {
    console.warn('🚨 [PANIC BUTTON API] Initiating full liquidation...');

    // 1. Try to invoke Python Worker panic handler if running
    const workerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
    try {
      const workerRes = await fetch(`${workerUrl}/api/panic`, { method: 'POST' });
      if (workerRes.ok) {
        const data = await workerRes.json();
        return NextResponse.json({
          success: true,
          source: 'python_worker',
          liquidatedCount: data.liquidated_count,
          details: data.details,
        });
      }
    } catch (_) {
      // Python worker not running; proceed with Node.js fallback
    }

    // 2. Node.js native KIS fallback
    const result = await kisClient.panicLiquidateAll();

    // 3. Record panic executions to Neon DB (수량까지 정확히 기록)
    try {
      const db = getDb();
      for (const item of result.results) {
        if (item.success) {
          const panicName = await resolveTickerName(item.ticker, item.tickerName);
          try {
            await db.insert(orders).values({
              strategyId: 'PANIC_BUTTON',
              source: 'PANIC',
              ticker: item.ticker,
              tickerName: panicName,
              side: 'SELL',
              orderType: '01', // 시장가
              price: '0',
              quantity: item.quantity,
              executedPrice: '0',
              executedQuantity: item.quantity,
              kisOrderNo: item.orderNo,
              status: 'EXECUTED',
            });
          } catch (err: any) {
            // 구 DB(source 컬럼 미적용) 호환
            if (err?.message?.includes('source') || err?.message?.includes('column')) {
              await db.insert(orders).values({
                strategyId: 'PANIC_BUTTON',
                ticker: item.ticker,
                tickerName: panicName,
                side: 'SELL',
                orderType: '01',
                price: '0',
                quantity: item.quantity,
                executedPrice: '0',
                executedQuantity: item.quantity,
                kisOrderNo: item.orderNo,
                status: 'EXECUTED',
              } as any);
            } else {
              throw err;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Panic API] DB logging warning:', e);
    }

    return NextResponse.json({
      success: true,
      source: 'nodejs_kis_client',
      liquidatedCount: result.liquidatedCount,
      details: result.results,
    });
  } catch (error: any) {
    console.error('[Panic API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
