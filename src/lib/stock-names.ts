import { kisClient } from './kis-client';

// 주요 종목 마스터 (주문 기록용 종목명 해결 — KIS 호출 없이 즉시 해결)
const STOCK_NAMES: Record<string, string> = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '373220': 'LG에너지솔루션',
  '207940': '삼성바이오로직스',
  '005380': '현대차',
  '000270': '기아',
  '068270': '셀트리온',
  '035420': 'NAVER',
  '035720': '카카오',
  '005490': 'POSCO홀딩스',
  '105560': 'KB금융',
  '055550': '신한지주',
  '051910': 'LG화학',
  '247540': '에코프로비엠',
  '086520': '에코프로',
  '028300': 'HLB',
  '277810': '레인보우로보틱스',
  '000270 ': '기아',
  '006400': '삼성SDI',
  '051900': 'LG생활건강',
  '028260': '삼성물산',
  '012330': '현대모비스',
  '017670': 'SK텔레콤',
  '030200': 'KT',
  '036570': '엔씨소프트',
  '251270': '넷마블',
  '293490': '카카오게임즈',
  '086790': '하나금융지주',
  '032830': '삼성생명',
  '015760': '한국전력',
  '003550': 'LG',
  '096770': 'SK이노베이션',
};

function isPlaceholder(name: unknown): boolean {
  const s = String(name || '').trim();
  return !s || s.startsWith('종목-');
}

/** 동기 해결: 힌트 → 마스터맵 (KIS 호출 없음) */
export function resolveTickerNameSync(ticker: string, hint?: unknown): string {
  const code = String(ticker || '').trim();
  if (!isPlaceholder(hint)) return String(hint).trim();
  if (STOCK_NAMES[code]) return STOCK_NAMES[code];
  return `종목-${code}`;
}

/** 비동기 해결: 힌트 → 마스터맵 → KIS 실시간 종목명 → 플레이스홀더 */
export async function resolveTickerName(ticker: string, hint?: unknown): Promise<string> {
  const code = String(ticker || '').trim();
  if (!isPlaceholder(hint)) return String(hint).trim();
  if (STOCK_NAMES[code]) return STOCK_NAMES[code];
  try {
    const quote = await kisClient.getStockPrice(code);
    if (quote?.name && !isPlaceholder(quote.name)) {
      return quote.name;
    }
  } catch {}
  return `종목-${code}`;
}
