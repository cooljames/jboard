import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }
  const client = neon(connectionString);
  dbInstance = drizzle({ client, schema });
  return dbInstance;
}

export const db = getDb;

export const INITIAL_STRATEGIES = [
  {
    id: 'volatility_breakout',
    name: '변동성 돌파 & 거래량 폭발 (Volatility Breakout)',
    description: '전일 레인지(고가-저가) 대비 K계수 돌파 및 거래량 급증 시 당일 추세 추종 매수',
    enabled: true,
    allocationWeight: '0.25',
    targetMarket: 'ALL',
    parameters: {
      k_value: 0.5,
      volume_multiplier: 2.0,
      stop_loss_pct: 2.0,
      take_profit_pct: 5.0,
    },
  },
  {
    id: 'institutional_buying',
    name: '외인/기관 쌍끌이 모멘텀 (Institutional Net Buying)',
    description: '외국인과 기관이 3일 이상 동시 순매수한 수급 주도주 선별 매수',
    enabled: true,
    allocationWeight: '0.20',
    targetMarket: 'KOSPI',
    parameters: {
      consecutive_days: 3,
      min_net_buy_amt: 5000000000,
      trailing_stop_pct: 2.5,
    },
  },
  {
    id: 'mean_reversion',
    name: 'RSI 역추세 & 볼린저밴드 하단 반등 (Mean Reversion)',
    description: 'RSI 과매도(<30) 및 볼린저밴드 하단 이탈 후 양봉 전환 시 기술적 반등 포착',
    enabled: false,
    allocationWeight: '0.20',
    targetMarket: 'ALL',
    parameters: {
      rsi_period: 14,
      rsi_oversold: 30,
      bb_period: 20,
      bb_std: 2.0,
      stop_loss_pct: 2.0,
    },
  },
  {
    id: 'dual_momentum',
    name: '팩터 기반 밸류-모멘텀 (Low PBR/PER Dual Momentum)',
    description: '저PBR/저PER 저평가 우량주 중 20일 모멘텀 최상위 종목 팩터 투자',
    enabled: false,
    allocationWeight: '0.15',
    targetMarket: 'ALL',
    parameters: {
      max_pbr: 1.0,
      max_per: 12.0,
      momentum_days: 20,
      top_n: 5,
    },
  },
  {
    id: 'ai_hybrid',
    name: 'Gemini 3.8 Flash AI 멀티모달 하이브리드 필터',
    description: 'A~D 전략 매수 후보 종목에 대해 재무 및 차트 이미지를 Gemini 3.8 Flash로 2차 정밀 심사',
    enabled: true,
    allocationWeight: '0.20',
    targetMarket: 'ALL',
    parameters: {
      min_confidence: 0.80,
      use_chart_vision: true,
      risk_tolerance: 'MODERATE',
    },
  },
  {
    id: 'daytrading_rotation',
    name: '당일 전액 회전 데이트레이딩 (Day Trading Rotation)',
    description: '가용현금 전액을 당일 종목 회전에 투입하고 장마감 전 전량 청산 (오버나잇 없음)',
    enabled: false,
    allocationWeight: '1.00',
    targetMarket: 'ALL',
    parameters: {
      capital_usage_pct: 100.0,
      breakout_pct: 0.3,
      volume_multiplier: 1.5,
      rsi_max: 70.0,
      stop_loss_pct: 1.5,
      take_profit_pct: 3.0,
      trailing_stop_pct: 1.0,
      force_exit_time: '15:20',
      entry_cutoff_minutes: 10,
      max_trades_per_day: 10,
      min_order_amount: 100000.0,
    },
  },
  {
    id: 'bb_multiregime',
    name: 'BB 멀티레짐 (평균회귀·추세눌림·변동성돌파)',
    description: '볼린저밴드+ADX 레짐 전환 매매. 분봉 마감봉 신호, 거래당 0.25% 리스크, 종목 10% 캡',
    enabled: false,
    allocationWeight: '0.20',
    targetMarket: 'ALL',
    parameters: {
      bb_period: 20,
      bb_mult: 2.0,
      risk_fraction: 0.0025,
      max_weight: 0.10,
      daily_halt_pct: 1.5,
      mr_adx_max: 22.0,
      trend_adx_min: 25.0,
      mr_vol_mult_max: 3.0,
      mr_time_stop_bars: 10,
      mr_stop_atr: 1.5,
      trend_stop_atr: 2.0,
      trend_trail_atr: 2.5,
      bo_bbb_pct_max: 0.20,
      bo_bbb_growth: 0.20,
      bo_vol_mult: 1.5,
      bo_min_width_atr: 0.3,
      bo_stop_atr: 2.0,
      bo_tp1_atr: 2.0,
      bo_trail_atr: 2.5,
      range_spread_bps_max: 300.0,
      min_bars: 220,
    },
  },
];
