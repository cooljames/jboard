import { pgTable, serial, text, timestamp, numeric, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

// 1. 퀀트 전략 관리 테이블 (Dynamic Strategy Configuration)
export const quantStrategies = pgTable('quant_strategies', {
  id: text('id').primaryKey(), // 예: "volatility_breakout", "rsi_reversion"
  name: text('name').notNull(),
  description: text('description'),
  enabled: boolean('enabled').default(false).notNull(), // 전략 활성화 여부
  allocationWeight: numeric('allocation_weight', { precision: 5, scale: 2 }).default('0.20').notNull(), // 자산 배분 비율 (0.0 ~ 1.0)
  targetMarket: text('target_market').default('ALL').notNull(), // KOSPI, KOSDAQ, ALL
  parameters: jsonb('parameters').notNull(), // 예: { "k_value": 0.5, "rsi_threshold": 30, "stop_loss_pct": 2.5 }
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. 주문 내역 테이블 (Order History & Execution Tracking)
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  strategyId: text('strategy_id').references(() => quantStrategies.id),
  ticker: text('ticker').notNull(),
  tickerName: text('ticker_name').notNull(),
  side: text('side').notNull(), // "BUY" | "SELL"
  orderType: text('order_type').default('00').notNull(), // "00": 지정가, "01": 시장가
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  executedPrice: numeric('executed_price', { precision: 12, scale: 2 }),
  executedQuantity: integer('executed_quantity').default(0),
  kisOrderNo: text('kis_order_no'), // KIS 주식 주문 번호 (ODNO)
  status: text('status').notNull(), // "PENDING", "EXECUTED", "CANCELLED", "FAILED"
  failReason: text('fail_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. 보유 잔고 및 포트폴리오 스냅샷 (Portfolio Positions)
export const positions = pgTable('positions', {
  ticker: text('ticker').primaryKey(),
  tickerName: text('ticker_name').notNull(),
  quantity: integer('quantity').notNull(),
  avgBuyPrice: numeric('avg_buy_price', { precision: 12, scale: 2 }).notNull(),
  currentPrice: numeric('current_price', { precision: 12, scale: 2 }).notNull(),
  unrealizedPnl: numeric('unrealized_pnl', { precision: 12, scale: 2 }).notNull(),
  returnPct: numeric('return_pct', { precision: 6, scale: 2 }).notNull(),
  strategyId: text('strategy_id').references(() => quantStrategies.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. AI 분석 및 심층 진단 기록 (Gemini Analysis Logs)
export const aiAnalysisLogs = pgTable('ai_analysis_logs', {
  id: serial('id').primaryKey(),
  ticker: text('ticker').notNull(),
  tickerName: text('ticker_name').notNull(),
  recommendation: text('recommendation').notNull(), // "STRONG_BUY", "BUY", "HOLD", "AVOID"
  confidenceScore: numeric('confidence_score', { precision: 4, scale: 2 }).notNull(),
  summary: text('summary').notNull(),
  structuredJson: jsonb('structured_json').notNull(),
  chartImageUrl: text('chart_image_url'), // Vercel Blob URL
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. 계좌 일별/시간별 자산 스냅샷 (Account Balance Snapshots)
export const accountSnapshots = pgTable('account_snapshots', {
  id: serial('id').primaryKey(),
  totalAsset: numeric('total_asset', { precision: 15, scale: 2 }).notNull(),
  cashBalance: numeric('cash_balance', { precision: 15, scale: 2 }).notNull(),
  stockValuation: numeric('stock_valuation', { precision: 15, scale: 2 }).notNull(),
  dailyPnl: numeric('daily_pnl', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. 커뮤니티 게시판 테이블 (Community Board Posts)
export const boardPosts = pgTable('board_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').default('자유게시판').notNull(), // 공지사항, 퀀트전략, 매매일지, 종목토론, 자유게시판, Q&A
  author: text('author').default('관리자').notNull(),
  content: text('content').notNull(),
  views: integer('views').default(0).notNull(),
  likes: integer('likes').default(0).notNull(),
  isNotice: boolean('is_notice').default(false).notNull(),
  tags: jsonb('tags').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type QuantStrategy = typeof quantStrategies.$inferSelect;
export type NewQuantStrategy = typeof quantStrategies.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
export type AiAnalysisLog = typeof aiAnalysisLogs.$inferSelect;
export type NewAiAnalysisLog = typeof aiAnalysisLogs.$inferInsert;
export type AccountSnapshot = typeof accountSnapshots.$inferSelect;
export type NewAccountSnapshot = typeof accountSnapshots.$inferInsert;
export type BoardPost = typeof boardPosts.$inferSelect;
export type NewBoardPost = typeof boardPosts.$inferInsert;

