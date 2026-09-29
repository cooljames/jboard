/**
 * Comprehensive Master Stock & Asset Universe for Korean Market
 * Covers KOSPI, KOSDAQ, ETF, and ETN
 */

export type MarketType = 'KOSPI' | 'KOSDAQ' | 'ETF' | 'ETN';

export interface MarketSecurity {
  ticker: string;
  name: string;
  market: MarketType;
  sector?: string;
  underlying?: string;
}

// 1. 코스피 (KOSPI) 주요 대표 종목군
export const KOSPI_SECURITIES: MarketSecurity[] = [
  { ticker: '005930', name: '삼성전자', market: 'KOSPI', sector: '반도체' },
  { ticker: '000660', name: 'SK하이닉스', market: 'KOSPI', sector: '반도체' },
  { ticker: '373220', name: 'LG에너지솔루션', market: 'KOSPI', sector: '2차전지' },
  { ticker: '207940', name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오' },
  { ticker: '005380', name: '현대차', market: 'KOSPI', sector: '자동차' },
  { ticker: '000270', name: '기아', market: 'KOSPI', sector: '자동차' },
  { ticker: '068270', name: '셀트리온', market: 'KOSPI', sector: '바이오' },
  { ticker: '035420', name: 'NAVER', market: 'KOSPI', sector: '인터넷/플랫폼' },
  { ticker: '035720', name: '카카오', market: 'KOSPI', sector: '인터넷/플랫폼' },
  { ticker: '005490', name: 'POSCO홀딩스', market: 'KOSPI', sector: '철강/소재' },
  { ticker: '105560', name: 'KB금융', market: 'KOSPI', sector: '금융' },
  { ticker: '055550', name: '신한지주', market: 'KOSPI', sector: '금융' },
  { ticker: '051910', name: 'LG화학', market: 'KOSPI', sector: '화학/소재' },
  { ticker: '006400', name: '삼성SDI', market: 'KOSPI', sector: '2차전지' },
  { ticker: '028260', name: '삼성물산', market: 'KOSPI', sector: '지주/상사' },
  { ticker: '012330', name: '현대모비스', market: 'KOSPI', sector: '자동차부품' },
  { ticker: '323410', name: '카카오뱅크', market: 'KOSPI', sector: '인터넷은행' },
  { ticker: '259960', name: '크래프톤', market: 'KOSPI', sector: '게임' },
  { ticker: '011200', name: 'HMM', market: 'KOSPI', sector: '해운' },
  { ticker: '012450', name: '한화에어로스페이스', market: 'KOSPI', sector: '방산/항공우주' },
  { ticker: '034020', name: '두산에너빌리티', market: 'KOSPI', sector: '원자력/에너지' },
  { ticker: '003670', name: '포스코퓨처엠', market: 'KOSPI', sector: '2차전지소재' },
  { ticker: '329180', name: 'HD현대중공업', market: 'KOSPI', sector: '조선' },
  { ticker: '015760', name: '한국전력', market: 'KOSPI', sector: '전력/유틸리티' },
  { ticker: '010130', name: '고려아연', market: 'KOSPI', sector: '비철금속' },
  { ticker: '009150', name: '삼성전기', market: 'KOSPI', sector: '전자부품' },
  { ticker: '032830', name: '삼성생명', market: 'KOSPI', sector: '보험' },
  { ticker: '086790', name: '하나금융지주', market: 'KOSPI', sector: '금융' },
  { ticker: '034730', name: 'SK', market: 'KOSPI', sector: '지주' },
  { ticker: '017670', name: 'SK텔레콤', market: 'KOSPI', sector: '통신' },
];

// 2. 코스닥 (KOSDAQ) 주요 대표 종목군
export const KOSDAQ_SECURITIES: MarketSecurity[] = [
  { ticker: '247540', name: '에코프로비엠', market: 'KOSDAQ', sector: '2차전지양극재' },
  { ticker: '086520', name: '에코프로', market: 'KOSDAQ', sector: '2차전지지주' },
  { ticker: '196170', name: '알테오젠', market: 'KOSDAQ', sector: '바이오플랫폼' },
  { ticker: '028300', name: 'HLB', market: 'KOSDAQ', sector: '항암신약' },
  { ticker: '277810', name: '레인보우로보틱스', market: 'KOSDAQ', sector: '지능형로봇' },
  { ticker: '348370', name: '엔켐', market: 'KOSDAQ', sector: '2차전지전해액' },
  { ticker: '141080', name: '리가켐바이오', market: 'KOSDAQ', sector: 'ADC바이오' },
  { ticker: '000250', name: '삼천당제약', market: 'KOSDAQ', sector: '제약/인슐린' },
  { ticker: '214150', name: '클래시스', market: 'KOSDAQ', sector: '피부미용의료기기' },
  { ticker: '145020', name: '휴젤', market: 'KOSDAQ', sector: '보툴리눔톡신' },
  { ticker: '403870', name: 'HPSP', market: 'KOSDAQ', sector: '반도체수소어닐링' },
  { ticker: '357780', name: '솔브레인', market: 'KOSDAQ', sector: '반도체소재' },
  { ticker: '240810', name: '원익IPS', market: 'KOSDAQ', sector: '반도체장비' },
  { ticker: '058470', name: '리노공업', market: 'KOSDAQ', sector: '반도체소켓' },
  { ticker: '035900', name: 'JYP Ent.', market: 'KOSDAQ', sector: '엔터테인먼트' },
  { ticker: '041510', name: '에스엠', market: 'KOSDAQ', sector: '엔터테인먼트' },
  { ticker: '263750', name: '펄어비스', market: 'KOSDAQ', sector: '게임개발' },
  { ticker: '257720', name: '실리콘투', market: 'KOSDAQ', sector: 'K뷰티유통플랫폼' },
  { ticker: '214450', name: '파마리서치', market: 'KOSDAQ', sector: '재생의학' },
  { ticker: '253450', name: '스튜디오드래곤', market: 'KOSDAQ', sector: '드라마제작' },
  { ticker: '095660', name: '네오위즈', market: 'KOSDAQ', sector: '게임' },
  { ticker: '039030', name: '이오테크닉스', market: 'KOSDAQ', sector: '레이저장비' },
  { ticker: '066970', name: '엘앤에프', market: 'KOSDAQ', sector: '2차전지소재' },
];

// 3. 상장지수펀드 (ETF) 대표 종목군 (지수, 레버리지/인버스, 섹터, 글로벌, 채권, 원자재)
export const ETF_SECURITIES: MarketSecurity[] = [
  { ticker: '069500', name: 'KODEX 200', market: 'ETF', underlying: '코스피 200 대표 지수 추종' },
  { ticker: '122630', name: 'KODEX 레버리지', market: 'ETF', underlying: '코스피 200 일간 수익률 2배 추종' },
  { ticker: '252670', name: 'KODEX 200선물인버스2X', market: 'ETF', underlying: '코스피 200 선물 일간 -2배 (곱버스)' },
  { ticker: '114800', name: 'KODEX 인버스', market: 'ETF', underlying: '코스피 200 선물 일간 -1배' },
  { ticker: '360750', name: 'TIGER 미국S&P500', market: 'ETF', underlying: '미국 S&P 500 지수 추종' },
  { ticker: '133690', name: 'TIGER 미국나스닥100', market: 'ETF', underlying: '미국 나스닥 100 기술주 지수' },
  { ticker: '379800', name: 'KODEX 미국S&P500TR', market: 'ETF', underlying: '미국 S&P 500 배당재투자형' },
  { ticker: '379810', name: 'KODEX 미국나스닥100TR', market: 'ETF', underlying: '미국 나스닥 100 배당재투자형' },
  { ticker: '381170', name: 'TIGER 미국테크TOP10 INDXX', market: 'ETF', underlying: '미국 빅테크 상위 10대 기업' },
  { ticker: '446720', name: 'SOL 미국배당다우존스', market: 'ETF', underlying: '한국형 SCHD 월배당 ETF' },
  { ticker: '458730', name: 'TIGER 미국배당다우존스', market: 'ETF', underlying: '한국형 SCHD 월배당 다우존스' },
  { ticker: '229200', name: 'KODEX 코스닥150', market: 'ETF', underlying: '코스닥 150 우량주 지수' },
  { ticker: '233740', name: 'KODEX 코스닥150레버리지', market: 'ETF', underlying: '코스닥 150 일간 2배 레버리지' },
  { ticker: '251340', name: 'KODEX 코스닥150선물인버스', market: 'ETF', underlying: '코스닥 150 일간 -1배 인버스' },
  { ticker: '305720', name: 'KODEX 2차전지산업', market: 'ETF', underlying: '국내 배터리 밸류체인 핵심' },
  { ticker: '305540', name: 'TIGER 2차전지테마', market: 'ETF', underlying: '국내 2차전지 완성셀/소재' },
  { ticker: '091230', name: 'TIGER 반도체', market: 'ETF', underlying: '국내 반도체 대형주 및 소부장' },
  { ticker: '471940', name: 'KODEX AI반도체핵심장비', market: 'ETF', underlying: 'HBM 및 AI 반도체 장비주' },
  { ticker: '453850', name: 'ACE 미국30년국채액티브(H)', market: 'ETF', underlying: '미국 30년 초장기 국채' },
  { ticker: '459580', name: 'KODEX CD금리액티브(합성)', market: 'ETF', underlying: 'CD 91일물 금리 파킹형' },
  { ticker: '371460', name: 'TIGER 차이나전기차SOLACTIVE', market: 'ETF', underlying: '중국 전기차/배터리 기업군' },
  { ticker: '261220', name: 'KODEX WTI원유선물(H)', market: 'ETF', underlying: 'WTI 원유 선물 가격 추종' },
  { ticker: '132030', name: 'KODEX 골드선물(H)', market: 'ETF', underlying: '국제 금 선물 가격 추종' },
  { ticker: '144600', name: 'KODEX 은선물(H)', market: 'ETF', underlying: '국제 은 선물 가격 추종' },
  { ticker: '329200', name: 'TIGER 부동산인프라고배당', market: 'ETF', underlying: '국내 우량 리츠 및 배당 인프라' },
];

// 4. 상장지수증권 (ETN) 대표 종목군 (원유, 천연가스, 원자재, 레버리지/인버스2X)
export const ETN_SECURITIES: MarketSecurity[] = [
  { ticker: '530063', name: '삼성 레버리지 WTI원유 선물 ETN', market: 'ETN', underlying: 'WTI 원유선물 일간 2배 레버리지' },
  { ticker: '500019', name: '신한 레버리지 WTI원유 선물 ETN(H)', market: 'ETN', underlying: 'WTI 원유선물 일간 2배 레버리지(환헤지)' },
  { ticker: '500057', name: '신한 인버스 2X WTI원유 선물 ETN(H)', market: 'ETN', underlying: 'WTI 원유선물 일간 -2배 인버스(환헤지)' },
  { ticker: '530064', name: '삼성 인버스 2X WTI원유 선물 ETN(H)', market: 'ETN', underlying: 'WTI 원유선물 일간 -2배 인버스' },
  { ticker: '570046', name: '메리츠 레버리지 대표 ETN', market: 'ETN', underlying: '대표지수 레버리지 전략 ETN' },
  { ticker: '550042', name: 'QV 레버리지 WTI원유 선물 ETN(H)', market: 'ETN', underlying: 'WTI 원유선물 일간 2배 레버리지' },
  { ticker: '500067', name: '신한 인버스 2X 천연가스 선물 ETN(H)', market: 'ETN', underlying: '천연가스 선물 일간 -2배 인버스' },
  { ticker: '530079', name: '삼성 레버리지 천연가스 선물 ETN B', market: 'ETN', underlying: '천연가스 선물 일간 2배 레버리지' },
  { ticker: '570068', name: '한투 레버리지 천연가스 선물 ETN B', market: 'ETN', underlying: '천연가스 선물 일간 2배 레버리지' },
  { ticker: '520009', name: '미래에셋 레버리지 원유선물혼합 ETN(H)', market: 'ETN', underlying: '원유선물 복합 레버리지' },
  { ticker: '580018', name: 'KB 레버리지 은 선물 ETN(H)', market: 'ETN', underlying: '국제 은 선물 일간 2배 레버리지' },
  { ticker: '500038', name: '신한 레버리지 구리 선물 ETN(H)', market: 'ETN', underlying: '국제 구리 선물 일간 2배 레버리지' },
  { ticker: '530061', name: '삼성 레버리지 금 선물 ETN(H)', market: 'ETN', underlying: '국제 금 선물 일간 2배 레버리지' },
  { ticker: '500015', name: '신한 레버리지 금 선물 ETN(H)', market: 'ETN', underlying: '국제 금 선물 일간 2배 레버리지(환헤지)' },
  { ticker: '550058', name: '하나 레버리지 WTI원유 선물 ETN', market: 'ETN', underlying: 'WTI 원유선물 일간 2배 레버리지' },
];

import masterSecuritiesRaw from './krx-securities-master.json';

// Build unified 4,400+ securities master map
const securityMap = new Map<string, MarketSecurity>();

// 1. Load full 4,400+ KRX / ETF / ETN master list
for (const s of (masterSecuritiesRaw as any[])) {
  securityMap.set(s.ticker, {
    ticker: s.ticker,
    name: s.name,
    market: s.market as MarketType,
    sector: s.sector,
    underlying: s.underlying,
  });
}

// 2. Overlay curated preset metadata (for rich sector / underlying descriptions)
for (const s of [...KOSPI_SECURITIES, ...KOSDAQ_SECURITIES, ...ETF_SECURITIES, ...ETN_SECURITIES]) {
  const existing = securityMap.get(s.ticker);
  securityMap.set(s.ticker, {
    ...s,
    sector: s.sector || existing?.sector,
    underlying: s.underlying || existing?.underlying,
  });
}

// 통합 전체 유니버스 (4,400+ 종목 전체)
export const ALL_SECURITIES: MarketSecurity[] = Array.from(securityMap.values());

// 카테고리별 추천/주요 종목 프리셋
export const POPULAR_BY_MARKET: Record<MarketType | 'ALL', Array<{ ticker: string; name: string; market: MarketType }>> = {
  ALL: [
    { ticker: '005930', name: '삼성전자', market: 'KOSPI' },
    { ticker: '000660', name: 'SK하이닉스', market: 'KOSPI' },
    { ticker: '196170', name: '알테오젠', market: 'KOSDAQ' },
    { ticker: '247540', name: '에코프로비엠', market: 'KOSDAQ' },
    { ticker: '195940', name: 'HK이노엔', market: 'KOSDAQ' },
    { ticker: '069500', name: 'KODEX 200', market: 'ETF' },
    { ticker: '360750', name: 'TIGER 미국S&P500', market: 'ETF' },
    { ticker: '252670', name: 'KODEX 200선물인버스2X', market: 'ETF' },
    { ticker: '530063', name: '삼성 레버리지 WTI원유 선물 ETN', market: 'ETN' },
  ],
  KOSPI: [
    { ticker: '005930', name: '삼성전자', market: 'KOSPI' },
    { ticker: '000660', name: 'SK하이닉스', market: 'KOSPI' },
    { ticker: '373220', name: 'LG에너지솔루션', market: 'KOSPI' },
    { ticker: '005380', name: '현대차', market: 'KOSPI' },
    { ticker: '000270', name: '기아', market: 'KOSPI' },
    { ticker: '068270', name: '셀트리온', market: 'KOSPI' },
    { ticker: '035420', name: 'NAVER', market: 'KOSPI' },
    { ticker: '035720', name: '카카오', market: 'KOSPI' },
  ],
  KOSDAQ: [
    { ticker: '196170', name: '알테오젠', market: 'KOSDAQ' },
    { ticker: '247540', name: '에코프로비엠', market: 'KOSDAQ' },
    { ticker: '086520', name: '에코프로', market: 'KOSDAQ' },
    { ticker: '028300', name: 'HLB', market: 'KOSDAQ' },
    { ticker: '195940', name: 'HK이노엔', market: 'KOSDAQ' },
    { ticker: '277810', name: '레인보우로보틱스', market: 'KOSDAQ' },
    { ticker: '348370', name: '엔켐', market: 'KOSDAQ' },
    { ticker: '141080', name: '리가켐바이오', market: 'KOSDAQ' },
    { ticker: '000250', name: '삼천당제약', market: 'KOSDAQ' },
  ],
  ETF: [
    { ticker: '069500', name: 'KODEX 200', market: 'ETF' },
    { ticker: '360750', name: 'TIGER 미국S&P500', market: 'ETF' },
    { ticker: '133690', name: 'TIGER 미국나스닥100', market: 'ETF' },
    { ticker: '122630', name: 'KODEX 레버리지', market: 'ETF' },
    { ticker: '252670', name: 'KODEX 200선물인버스2X', market: 'ETF' },
    { ticker: '453850', name: 'ACE 미국30년국채액티브(H)', market: 'ETF' },
    { ticker: '446720', name: 'SOL 미국배당다우존스', market: 'ETF' },
    { ticker: '261220', name: 'KODEX WTI원유선물(H)', market: 'ETF' },
  ],
  ETN: [
    { ticker: '530063', name: '삼성 레버리지 WTI원유 선물 ETN', market: 'ETN' },
    { ticker: '500019', name: '신한 레버리지 WTI원유 선물 ETN(H)', market: 'ETN' },
    { ticker: '500057', name: '신한 인버스 2X WTI원유 선물 ETN(H)', market: 'ETN' },
    { ticker: '530079', name: '삼성 레버리지 천연가스 선물 ETN B', market: 'ETN' },
    { ticker: '500067', name: '신한 인버스 2X 천연가스 선물 ETN(H)', market: 'ETN' },
    { ticker: '570046', name: '메리츠 레버리지 대표 ETN', market: 'ETN' },
    { ticker: '580018', name: 'KB 레버리지 은 선물 ETN(H)', market: 'ETN' },
    { ticker: '500038', name: '신한 레버리지 구리 선물 ETN(H)', market: 'ETN' },
  ],
};

// 검색 헬퍼 (4,400+ 전수 검색 및 정확도 가중치 정렬)
export function searchSecurities(query: string, marketFilter?: MarketType | 'ALL'): MarketSecurity[] {
  const q = query.trim().toLowerCase();
  const source = (!marketFilter || marketFilter === 'ALL')
    ? ALL_SECURITIES
    : ALL_SECURITIES.filter((s) => s.market === marketFilter);

  if (!q) {
    return source.slice(0, 20);
  }

  const results: { sec: MarketSecurity; score: number }[] = [];

  for (const s of source) {
    const ticker = s.ticker.toLowerCase();
    const name = s.name.toLowerCase();
    const sector = (s.sector || '').toLowerCase();
    const underlying = (s.underlying || '').toLowerCase();

    let score = 0;
    if (ticker === q) {
      score = 100;
    } else if (name === q) {
      score = 90;
    } else if (ticker.startsWith(q)) {
      score = 80;
    } else if (name.startsWith(q)) {
      score = 70;
    } else if (name.includes(q)) {
      score = 50;
    } else if (ticker.includes(q)) {
      score = 40;
    } else if (sector.includes(q) || underlying.includes(q)) {
      score = 30;
    }

    if (score > 0) {
      results.push({ sec: s, score });
    }
  }

  // 정확도 점수 내림차순 정렬 후 최대 25건 반환
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 25).map((r) => r.sec);
}
