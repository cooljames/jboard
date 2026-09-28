import { NextResponse } from 'next/server';
import { kisClient } from '@/lib/kis-client';
import { getDb } from '@/lib/db';
import { orders } from '@/lib/db/schema';

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

    // 3. Record panic executions to Neon DB
    try {
      const db = getDb();
      for (const item of result.results) {
        if (item.success) {
          await db.insert(orders).values({
            strategyId: 'PANIC_BUTTON',
            ticker: item.ticker,
            tickerName: `종목-${item.ticker}`,
            side: 'SELL',
            orderType: '01', // 시장가
            price: '0',
            quantity: 0,
            kisOrderNo: item.orderNo,
            status: 'EXECUTED',
          });
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
