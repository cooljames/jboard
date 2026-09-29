// 주문 출처(자동매매 vs 수동매매 vs 비상청산) 단일 분류 기준.
// DB `orders.source`가 있으면 그것을 우선하고, 없으면(레거시 행) strategy_id로 추론한다.

export type OrderSource = 'AUTO' | 'MANUAL' | 'PANIC';

export const AUTO_STRATEGY_IDS = [
  'volatility_breakout',
  'institutional_buying',
  'mean_reversion',
  'dual_momentum',
  'ai_hybrid',
  'daytrading_rotation',
  'bb_multiregime',
] as const;

const MANUAL_STRATEGY_IDS = new Set(['MANUAL', 'MANUAL_EXIT', 'MANUAL_BUY', 'MANUAL_SELL']);
const PANIC_STRATEGY_IDS = new Set(['PANIC_BUTTON', 'PANIC', 'EMERGENCY', 'RISK_STOP']);

function normalize(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toUpperCase();
}

/** strategy_id만으로 출처를 추론 (레거시 행 호환용) */
export function inferOrderSource(strategyId: unknown): OrderSource {
  const raw = String(strategyId ?? '').trim();
  const upper = normalize(raw);
  if (PANIC_STRATEGY_IDS.has(upper) || upper.includes('PANIC')) return 'PANIC';
  if (MANUAL_STRATEGY_IDS.has(upper) || upper.startsWith('MANUAL')) return 'MANUAL';
  if ((AUTO_STRATEGY_IDS as readonly string[]).includes(raw)) return 'AUTO';
  // 전략 ID처럼 보이면 자동, 그 외(빈값 포함)는 수동으로 분류
  if (raw && !upper.startsWith('USER')) return 'AUTO';
  return 'MANUAL';
}

/** source 컬럼 우선, 없으면 strategy_id로 추론 */
export function resolveOrderSource(
  input: { source?: unknown; strategyId?: unknown } | null | undefined,
): OrderSource {
  const s = normalize(input?.source);
  if (s === 'AUTO' || s === 'MANUAL' || s === 'PANIC') return s;
  // 레거시 표기 호환: 'SYSTEM'/'ALGO' -> AUTO, 'USER' -> MANUAL
  if (s === 'SYSTEM' || s === 'ALGO' || s === 'STRATEGY') return 'AUTO';
  if (s === 'USER') return 'MANUAL';
  return inferOrderSource(input?.strategyId);
}

export const ORDER_SOURCE_LABEL: Record<OrderSource, string> = {
  AUTO: '자동매매',
  MANUAL: '수동매매',
  PANIC: '비상청산',
};
