import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  console.log('⚡ Initializing Neon PostgreSQL Schema for QuantAntigravity-KIS Web v2.0.0...');

  // 1. quant_strategies
  await sql`
    CREATE TABLE IF NOT EXISTS quant_strategies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      allocation_weight NUMERIC(5, 2) NOT NULL DEFAULT 0.20,
      target_market TEXT NOT NULL DEFAULT 'ALL',
      parameters JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Created table: quant_strategies');

  // 2. orders
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      strategy_id TEXT REFERENCES quant_strategies(id),
      ticker TEXT NOT NULL,
      ticker_name TEXT NOT NULL,
      side TEXT NOT NULL,
      order_type TEXT NOT NULL DEFAULT '00',
      price NUMERIC(12, 2) NOT NULL,
      quantity INTEGER NOT NULL,
      executed_price NUMERIC(12, 2),
      executed_quantity INTEGER DEFAULT 0,
      kis_order_no TEXT,
      status TEXT NOT NULL,
      fail_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Created table: orders');

  // 3. positions
  await sql`
    CREATE TABLE IF NOT EXISTS positions (
      ticker TEXT PRIMARY KEY,
      ticker_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      avg_buy_price NUMERIC(12, 2) NOT NULL,
      current_price NUMERIC(12, 2) NOT NULL,
      unrealized_pnl NUMERIC(12, 2) NOT NULL,
      return_pct NUMERIC(6, 2) NOT NULL,
      strategy_id TEXT REFERENCES quant_strategies(id),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Created table: positions');

  // 4. ai_analysis_logs
  await sql`
    CREATE TABLE IF NOT EXISTS ai_analysis_logs (
      id SERIAL PRIMARY KEY,
      ticker TEXT NOT NULL,
      ticker_name TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      confidence_score NUMERIC(4, 2) NOT NULL,
      summary TEXT NOT NULL,
      structured_json JSONB NOT NULL,
      chart_image_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Created table: ai_analysis_logs');

  // 5. account_snapshots
  await sql`
    CREATE TABLE IF NOT EXISTS account_snapshots (
      id SERIAL PRIMARY KEY,
      total_asset NUMERIC(15, 2) NOT NULL,
      cash_balance NUMERIC(15, 2) NOT NULL,
      stock_valuation NUMERIC(15, 2) NOT NULL,
      daily_pnl NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Created table: account_snapshots');

  // Seed default 5 strategies from dev.md if not exist
  const initialStrategies = [
    {
      id: 'volatility_breakout',
      name: '변동성 돌파 & 거래량 폭발 (Volatility Breakout)',
      description: '전일 레인지(고가-저가) 대비 K계수 돌파 및 거래량 급증 시 당일 추세 추종 매수',
      enabled: true,
      allocation_weight: '0.25',
      target_market: 'ALL',
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
      allocation_weight: '0.20',
      target_market: 'KOSPI',
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
      allocation_weight: '0.20',
      target_market: 'ALL',
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
      allocation_weight: '0.15',
      target_market: 'ALL',
      parameters: {
        max_pbr: 1.0,
        max_per: 12.0,
        momentum_days: 20,
        top_n: 5,
      },
    },
    {
      id: 'ai_hybrid',
      name: 'Gemini 2.0 Flash AI 멀티모달 하이브리드 필터',
      description: 'A~D 전략 매수 후보 종목에 대해 재무 및 차트 이미지를 Gemini 2.0으로 2차 정밀 심사',
      enabled: true,
      allocation_weight: '0.20',
      target_market: 'ALL',
      parameters: {
        min_confidence: 0.80,
        use_chart_vision: true,
        risk_tolerance: 'MODERATE',
      },
    },
  ];

  for (const s of initialStrategies) {
    await sql`
      INSERT INTO quant_strategies (id, name, description, enabled, allocation_weight, target_market, parameters, updated_at)
      VALUES (${s.id}, ${s.name}, ${s.description}, ${s.enabled}, ${s.allocation_weight}, ${s.target_market}, ${JSON.stringify(s.parameters)}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description;
    `;
  }
  console.log('✅ Seeded 5 Quant Strategies into quant_strategies table.');

  console.log('🎉 Neon PostgreSQL Database migration & seeding completed successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
