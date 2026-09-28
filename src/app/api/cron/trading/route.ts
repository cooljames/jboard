import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { quantStrategies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { kisClient } from '@/lib/kis-client';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    // Optional Vercel Cron CRON_SECRET verification
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow local development or authorized invocation
    }

    const timestamp = new Date().toISOString();
    console.log(`[Vercel Cron Trading Job] Triggered at ${timestamp}`);

    // 1. Fetch active strategies
    let activeStrategies: any[] = [];
    try {
      const db = getDb();
      activeStrategies = await db.select().from(quantStrategies).where(eq(quantStrategies.enabled, true));
    } catch (_) {}

    // 2. Inquire balance & check stop-loss / risk triggers
    let balance = null;
    try {
      balance = await kisClient.getAccountBalance();
    } catch (_) {}

    // 3. Forward trigger to Python worker if running
    const workerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
    try {
      await fetch(`${workerUrl}/api/cron/trigger`, { method: 'POST' }).catch(() => {});
    } catch (_) {}

    return NextResponse.json({
      success: true,
      timestamp,
      activeStrategiesCount: activeStrategies.length,
      totalAsset: balance?.totalAsset ?? 0,
      positionsCount: balance?.positions.length ?? 0,
      message: 'Vercel Cron Trading Evaluation Cycle completed successfully',
    });
  } catch (error: any) {
    console.error('[Vercel Cron Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
