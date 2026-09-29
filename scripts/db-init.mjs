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

  // 2. orders (주문 체결 로그: 자동/수동/패닉 모두 유실 없이 기록)
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      strategy_id TEXT,
      source TEXT NOT NULL DEFAULT 'MANUAL',
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

  // Migration for existing databases (레거시 orders 테이블 승격)
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'MANUAL'`;
  // 레거시 FK(strategy_id -> quant_strategies)가 있으면 제거: MANUAL/PANIC 기록 유실 방지
  await sql`
    DO $$
    DECLARE c RECORD;
    BEGIN
      FOR c IN (
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'orders'::regclass AND contype = 'f'
      ) LOOP
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT IF EXISTS %I', c.conname);
      END LOOP;
    END $$;
  `;
  // 기존 행의 source 백필: strategy_id 기준 추론 (이미 수동으로 찍힌 MANUAL 행은 유지)
  await sql`
    UPDATE orders SET source = 'PANIC'
    WHERE UPPER(COALESCE(strategy_id, '')) LIKE '%PANIC%';
  `;
  await sql`
    UPDATE orders SET source = 'AUTO'
    WHERE source = 'MANUAL'
      AND strategy_id IN ('volatility_breakout','institutional_buying','mean_reversion','dual_momentum','ai_hybrid');
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_source_created ON orders (source, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_ticker_created ON orders (ticker, created_at DESC)`;

  // 6. jquant_users (회원 가입 / 로그인)
  // 테이블명을 jquant_users로 분리: 공용 DB의 타 시스템(users) 테이블과 충돌 방지
  await sql`
    CREATE TABLE IF NOT EXISTS jquant_users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      last_login_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  console.log('✅ Created table: jquant_users');
  await sql`CREATE INDEX IF NOT EXISTS idx_jquant_users_email ON jquant_users (email)`;

  // 기본 계정 시드 (등급별: admin / editor / member)
  // - 비밀번호는 환경변수(SEED_ADMIN_PASSWORD 등)로 변경 가능, 미설정 시 아래 기본값
  // - 이미 존재하는 이메일은 ON CONFLICT DO NOTHING으로 기존 비밀번호 유지 (덮어쓰지 않음)
  const { scryptSync: scryptSeed, randomBytes: randomSeed } = await import('node:crypto');
  const seedHash = (plain) => {
    const salt = randomSeed(16).toString('hex');
    return `scrypt$16384$8$1$${salt}$${scryptSeed(plain, salt, 64).toString('hex')}`;
  };

  // 선택 시드: ADMIN_EMAIL/ADMIN_PASSWORD가 설정된 경우 커스텀 관리자 추가 생성
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await sql`
      INSERT INTO jquant_users (email, name, password_hash, role, status, created_at, updated_at)
      VALUES (${process.env.ADMIN_EMAIL.toLowerCase()}, ${process.env.ADMIN_NAME || '관리자'}, ${seedHash(process.env.ADMIN_PASSWORD)}, 'admin', 'active', NOW(), NOW())
      ON CONFLICT (email) DO NOTHING;
    `;
    console.log('✅ Seeded admin user (ADMIN_EMAIL).');
  }

  // 기본 계정 시드 (등급별: admin / editor / member)
  const defaultAccounts = [
    { email: 'admin@jboard.co.kr', name: '관리자', role: 'admin', password: process.env.SEED_ADMIN_PASSWORD || 'Admin1234!' },
    { email: 'editor@jboard.co.kr', name: '알고퀀터', role: 'editor', password: process.env.SEED_EDITOR_PASSWORD || 'Editor1234!' },
    { email: 'user@jboard.co.kr', name: '일반회원', role: 'member', password: process.env.SEED_USER_PASSWORD || 'User1234!' },
  ];
  for (const a of defaultAccounts) {
    const created = await sql`
      INSERT INTO jquant_users (email, name, password_hash, role, status, created_at, updated_at)
      VALUES (${a.email}, ${a.name}, ${seedHash(a.password)}, ${a.role}, 'active', NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `;
    if (created.length > 0) {
      console.log(`✅ Seeded ${a.role} account: ${a.email} / ${a.password}`);
    } else {
      console.log(`ℹ️ Account already exists, kept existing password: ${a.email}`);
    }
  }

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

  // Seed default 6 strategies from dev.md if not exist
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
    {
      id: 'daytrading_rotation',
      name: '당일 전액 회전 데이트레이딩 (Day Trading Rotation)',
      description: '가용현금 전액을 당일 종목 회전에 투입하고 장마감 전 전량 청산 (오버나잇 없음)',
      enabled: false,
      allocation_weight: '1.00',
      target_market: 'ALL',
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
      allocation_weight: '0.20',
      target_market: 'ALL',
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

  for (const s of initialStrategies) {
    await sql`
      INSERT INTO quant_strategies (id, name, description, enabled, allocation_weight, target_market, parameters, updated_at)
      VALUES (${s.id}, ${s.name}, ${s.description}, ${s.enabled}, ${s.allocation_weight}, ${s.target_market}, ${JSON.stringify(s.parameters)}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description;
    `;
  }
  console.log('✅ Seeded 7 Quant Strategies into quant_strategies table.');

  console.log('🎉 Neon PostgreSQL Database migration & seeding completed successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
