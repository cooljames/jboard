import { NextResponse } from 'next/server';
import { getDb, INITIAL_STRATEGIES } from '@/lib/db';
import { quantStrategies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(quantStrategies);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ strategies: INITIAL_STRATEGIES });
    }

    return NextResponse.json({ strategies: rows });
  } catch (error: any) {
    console.warn('[API Strategies GET] Falling back to default initial strategies:', error.message);
    return NextResponse.json({ strategies: INITIAL_STRATEGIES });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, enabled, allocationWeight, parameters } = body;

    if (!id) {
      return NextResponse.json({ error: 'Strategy ID is required' }, { status: 400 });
    }

    const db = getDb();
    const updateValues: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (enabled !== undefined) updateValues.enabled = enabled;
    if (allocationWeight !== undefined) updateValues.allocationWeight = allocationWeight.toString();
    if (parameters !== undefined) updateValues.parameters = parameters;

    await db.update(quantStrategies).set(updateValues).where(eq(quantStrategies.id, id));

    // Notify Python Worker for zero-downtime hot-reload (if available)
    const workerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
    try {
      fetch(`${workerUrl}/api/strategies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          allocation_weight: allocationWeight ? parseFloat(allocationWeight) : undefined,
          parameters,
        }),
      }).catch(() => {});
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Strategy ${id} updated successfully`,
    });
  } catch (error: any) {
    console.error('[API Strategies PATCH] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
