# QuantAntigravity-KIS Web (v2.0.0) Technical Specification & Implementation Guide

> **File:** `dev.md`  
> **Target System:** QuantAntigravity-KIS Web v2.0.0  
> **Target Agent:** Antigravity AI Agent (Full-Stack Coding Agent)  
> **Architecture Pattern:** Cloud-Native Monorepo (Next.js 15 App Router + Python FastAPI Worker Microservice + Neon PostgreSQL + Vercel Blob)

---

## 1. Executive Summary & Project Objectives

본 명세서는 **QuantAntigravity-KIS Web v2.0.0** 시스템의 전체 구현용 엔지니어링 개발 명세서(`dev.md`)입니다. 
한국투자증권(KIS) Open API, Next.js 15, Neon Serverless PostgreSQL, Vercel Blob, 그리고 Google Gemini 2.0 Flash LLM을 결합하여 **다중 퀀트 알고리즘을 실시간으로 교체/배분 가능한 자동매매 및 스마트 주가 데이터 검색 시스템**을 구축하는 것을 목적으로 합니다.

### 핵심 시스템 사양 요약
1. **Zero-Downtime Dynamic Strategy Switching:** 코드 수정 및 서버 재시작 없이 웹 UI에서 퀀트 알고리즘(변동성 돌파, RSI 역추세, 기관/외인 쌍끌이, 밸류 모멘텀, AI 하이브리드)을 ON/OFF 토글 및 파라미터/자산 비중 동적 튜닝.
2. **Robust Brokerage Gateway:** KIS Open API (REST & WebSocket) 호환 Engine. Token Bucket Rate Limiter(초당 20TPS 제한 준수), OAuth2 토큰 갱신, Hashkey 보안, 비상 전량 청산(Panic Button).
3. **Multi-Architecture Resilience:** Serverless 환경(Vercel Edge/Cron)과 Long-running Worker(Python FastAPI/WebSocket) 간의 하이브리드 이벤트 기반 메시징.

---

## 2. 시스템 아키텍처 (Comprehensive System Architecture)

### 2.1 전체 시스템 토폴로지 (System Topology)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Vercel Cloud Platform (Next.js 15)                                         │
│                                                                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐ │
│  │   Dashboard / UI       │  │   Strategy Controller  │  │  Smart Stock Search    │  │  Trading Control &     │ │
│  │  (shadcn/ui, Recharts) │  │  (Dynamic Params/JSON) │  │ (TradingView Charts)   │  │  Panic Button          │ │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────────┬────────────┘  └───────────┬────────────┘ │
│              │                           │                           │                           │              │
│              └───────────────────────────┼───────────────────────────┴───────────────────────────┘              │
│                                          │                                                                       │
│                        ┌─────────────────┴──────────────────┐                                                    │
│                        │ Next.js App Router API Routes      │                                                    │
│                        │ (/api/strategies, /api/trading...) │                                                    │
│                        └────────┬─────────────────┬─────────┘                                                    │
│                                 │                 │                                                              │
│              ┌──────────────────┘                 └──────────────────┐                                           │
│              │                                                       │                                           │
│      ┌───────▼─────────────────┐                             ┌───────▼────────────────┐                          │
│      │   Vercel Cron Jobs      │                             │   Vercel Blob Storage  │                          │
│      │ (Market Schedule/Check) │                             │ (OHLCV Parquet, Charts)│                          │
│      └───────┬─────────────────┘                             └───────▲────────────────┘                          │
└──────────────┼───────────────────────────────────────────────────────┼───────────────────────────────────────────┘
               │                                                       │
               │ HTTP / WS Event Bus                                   │ S3/Blob Protocol
               │                                                       │
┌──────────────▼───────────────────────────────────────────────────────┴───────────────────────────────────────────┐
│                                         External Infrastructure Services                                         │
│                                                                                                                  │
│  ┌─────────────────────────────────────────┐                 ┌────────────────────────────────────────────────┐  │
│  │     Neon Serverless PostgreSQL DB       │                 │            Google Gen AI Client                │  │
│  │   (Drizzle ORM - Strategies, Orders,    │                 │   (google-genai SDK - Gemini 2.0 Flash        │  │
│  │    Positions, Account Snapshots)        │                 │    Multimodal Analysis & Structured Output)    │  │
│  └────────────────────▲────────────────────┘                 └──────────────────────▲─────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────────────────────────────┼───────────────────────────┘
                        │ HTTP / DB Connection                                         │ API Call
                        │                                                              │
┌───────────────────────┴──────────────────────────────────────────────────────────────┴───────────────────────────┐
│                                 Python FastAPI Trading & Data Worker Service                                     │
│                            (Hosted on Railway / Render / Fly.io / Self-Hosted VPS)                               │
│                                                                                                                  │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐   ┌────────────────────────────────────┐  │
│  │   Dynamic Strategy Engine     │   │ KIS Brokerage API Handler     │   │ Data Collector & Pipeline          │  │
│  │   - BaseStrategy Interface    │   │ - REST Rate Limiter (20 TPS)  │   │ - FinanceDataReader (Global/FDR)   │  │
│  │   - Strategy Registry         │   │ - WebSocket Client (H0STCNT0) │   │ - pykrx (Investor/Supply Demand)   │  │
│  │   - Strategy Catalog (A~E)    │   │ - Hashkey & OAuth Token Mgr   │   │ - Ta-Lib / pandas Technical Indicators │
│  └───────────────────────────────┘   └───────────────────────────────┘   └────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                                        │ KIS OpenAPI (REST / WebSocket)
                                                        │
                                        ┌───────────────▼────────────────┐
                                        │ Korea Investment & Securities  │
                                        │          (KIS) Server          │
                                        └────────────────────────────────┘
```

---

### 2.2 아키텍처 옵션 및 선택 가이드 (Architecture Implementation Options)

본 프로젝트는 서비스 규모와 운영 환경에 따라 **3가지 통합 옵션** 중 선택하여 구축할 수 있습니다.

#### [Option A] 하이브리드 분산 아키텍처 (권장 / Standard Production)
* **구성:** Next.js (Vercel) + Python Worker Service (Railway/Render/Fly.io) + Neon DB + Vercel Blob.
* **장점:** 
  - Vercel Serverless의 빠른 프론트엔드/API 응답성 유지.
  - Python WebSocket Long-running process를 통한 실시간 체결가 수신 및 KIS API Rate Limit(20 TPS) 엄격제어.
* **적용 대상:** 실시간 자동매매, 초/분 단위 스캘핑 및 단타 전략 실행 시.

#### [Option B] Serverless Native + QStash Event Queue (Pure Serverless Edition)
* **구성:** Next.js 15 (Vercel) + Upstash Redis/QStash + Neon DB + Vercel Blob + Node.js KIS SDK.
* **장점:** 별도의 Python 워커 서버 관리 비용 없음 ($0/mo 서버리스 가능).
* **단점:** WebSocket 지속 연결 대신 Vercel Cron (매 1분) + QStash 메시지 큐에 의존하여 틱 단위 반응속도는 불가.
* **적용 대상:** 일봉/분봉 단위 swing/position 매매 전략 중심 시.

#### [Option C] Event-Driven Message Broker Architecture (High Reliability Enterprise)
* **구성:** Next.js + FastAPI + RabbitMQ / Redis PubSub + Neon DB.
* **장점:** 주문 신호 생성(Signal Generation)과 주문 집행(Order Execution)을 메시지 큐로 완벽 격리. 주문 폭주 시에도 KIS API 제한에 맞춰 안전하게 대기열 처리.

---

### 2.3 데이터 흐름 시퀀스 (Data Flow Sequence Diagram)

#### 1) 동적 전략 파라미터 변경 흐름
```
[User Web UI] ──(1) Patch /api/strategies ──> [Next.js API Route]
                                                       │
                                            (2) Update DB (Neon Postgres)
                                                       │
[Python Worker Engine] <──(3) Poll/Webhook Config Sync ┘
         │
(4) Reload Strategy Registry & Update In-Memory Strategy Instances (No Restart)
```

#### 2) 자동 매매 신호 및 주문 처리 흐름
```
[KIS WebSocket] ──(1) Real-time Tick Price (H0STCNT0) ──> [Python KIS Engine]
                                                                  │
                                                      (2) Feed to Active Strategies
                                                                  │
                                                      (3) Check Entry/Exit Signals
                                                                  │
                                                  ┌───────────────┴───────────────┐
                                              [Signal: BUY/SELL]              [Signal: HOLD]
                                                  │                               │
                                    (4) Validate Risk Manager               (Ignore)
                                  (Trailing Stop / Daily Limit)
                                                  │
                                    (5) KIS Order API Call
                                   (Rate Limiter: 20 TPS Token Bucket)
                                                  │
                                    (6) Record Order in Neon DB
                                                  │
                                    (7) Notify Next.js Web UI via Webhook/Socket
```

---

## 3. 디렉토리 및 프로젝트 구조 (Full Monorepo Layout)

```
quant_kis_system_v2/
├── package.json                        # Next.js 15, Drizzle ORM, @vercel/blob, Tailwind
├── tsconfig.json                       # TypeScript configuration
├── drizzle.config.ts                   # Neon Postgres Drizzle ORM config
├── next.config.js                      # Next.js app configuration
├── .env.local.example                  # Environment variable template
│
├── src/                                # Next.js App Router (Frontend + API Routes)
│   ├── app/
│   │   ├── layout.tsx                  # Global root layout & Providers
│   │   ├── page.tsx                    # Comprehensive Trading Control Tower Dashboard
│   │   ├── strategies/                 # Strategy Hub: Dynamic switching & tuning
│   │   │   └── page.tsx
│   │   ├── search/                     # Smart Stock Search & Technical Analysis
│   │   │   └── page.tsx
│   │   ├── trading/                    # Order History, Real-time Positions & Panic Button
│   │   │   └── page.tsx
│   │   └── api/                        # Vercel Serverless API Endpoints
│   │       ├── cron/
│   │       │   └── trading/route.ts    # Vercel Cron trigger endpoint
│   │       ├── strategies/
│   │       │   └── route.ts            # Strategy CRUD & Parameter Tuning API
│   │       ├── orders/
│   │       │   ├── route.ts            # Order History & Instant Manual Orders
│   │       │   └── panic/route.ts      # Emergency Panic Button Endpoint
│   │       └── market/
│   │           └── route.ts            # Stock Search & Proxy API
│   │
│   ├── components/                     # UI Components
│   │   ├── ui/                         # shadcn/ui components (Button, Dialog, Card...)
│   │   ├── strategy/                   # Strategy Card, Parameter Editor Forms
│   │   │   ├── strategy-card.tsx
│   │   │   └── parameter-modal.tsx
│   │   ├── chart/                      # Charting Components
│   │   │   └── tradingview-chart.tsx   # Lightweight Charts Wrapper
│   │   └── dashboard/                  # Dashboard Widget Cards
│   │       ├── account-summary.tsx
│   │       ├── position-table.tsx
│   │       └── execution-log.tsx
│   │
│   └── lib/                            # Shared Utilities & Database Drivers
│       ├── db/                         # Neon DB Infrastructure
│       │   ├── index.ts                # Drizzle Driver Instance (Neon Serverless)
│       │   └── schema.ts               # Database Schema Definitions
│       ├── blob.ts                     # Vercel Blob Upload/Retrieve Utility
│       ├── kis-client.ts               # Node.js Lightweight KIS API Helper
│       └── utils.ts                    # Classnames & Formatters
│
└── python_engine/                      # Python FastAPI Worker Microservice
    ├── requirements.txt                # FastAPI, google-genai, fdr, pykrx, pydantic, etc.
    ├── main.py                         # FastAPI Server Entrypoint
    ├── config.py                       # Python App Settings & Env Loader
    │
    ├── core/                           # System Core Infrastructure
    │   ├── logger.py                   # Structured Logging
    │   ├── rate_limiter.py             # Token Bucket Rate Limiter (20 TPS)
    │   └── db_sync.py                  # Sync worker with Neon Postgres DB
    │
    ├── kis/                            # KIS OpenAPI Specification Integration
    │   ├── client.py                   # KIS REST API Client
    │   ├── websocket.py                # KIS WebSocket Listener (H0STCNT0, H0STCNNI0)
    │   ├── auth.py                     # OAuth2 Token Manager & Hashkey Generator
    │   └── models.py                   # Pydantic Schemas for KIS Requests/Responses
    │
    ├── strategy/                       # Dynamic Strategy Engine
    │   ├── base.py                     # BaseStrategy Abstract Class Definition
    │   ├── registry.py                 # StrategyRegistry & Dynamic Loader
    │   ├── catalog/                    # Implementations of 5 Quant Strategies
    │   │   ├── volatility_breakout.py  # Strategy A: Volatility Breakout
    │   │   ├── institutional_buying.py # Strategy B: Institutional/Foreign Net Buying
    │   │   ├── mean_reversion.py       # Strategy C: RSI & Bollinger Band Reversion
    │   │   ├── dual_momentum.py        # Strategy D: Factor-Based Dual Momentum
    │   │   └── ai_hybrid.py            # Strategy E: Gemini 2.0 Flash Multimodal Filter
    │   └── ensemble.py                 # Multi-Strategy Portfolio Allocation Engine
    │
    ├── data/                           # Market Data Ingestion
    │   ├── collector.py                # FinanceDataReader & pykrx Data Collector
    │   └── blob_cache.py               # Parquet File Caching to Vercel Blob
    │
    └── risk/                           # Risk & Portfolio Management
        ├── risk_manager.py             # Trailing Stop, Daily Max Loss Circuit Breaker
        └── panic_handler.py            # Emergency Liquidator
```

---

## 4. DB 스키마 정의 (Neon PostgreSQL & Drizzle ORM)

```typescript
// src/lib/db/schema.ts
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
```

---

## 5. KIS Open API 세부 연동 규격 (KIS API Integration Specification)

### 5.1 KIS REST & WebSocket Endpoints Mapping

| 기능 구분 | API Endpoint / TR Code | 설명 및 처리 정책 |
| :--- | :--- | :--- |
| **OAuth2 토큰 발급** | `POST /oauth2/tokenP` | 24시간 유효. 발급 후 In-Memory 및 DB 저장. 만료 1시간 전 자동 갱신 |
| **Hashkey 생성** | `POST /uapi/hashkey` | POST 주문 전송 시 보안 검증용 Hashkey 생성 |
| **주식 현금 주문** | `POST /uapi/domestic-stock/v1/trading/order-cash` (TR: `TTTC0802U` 실전, `VTTC0802U` 모의) | 지정가/시장가 매수 및 매도 주문 |
| **주식 정정/취소** | `POST /uapi/domestic-stock/v1/trading/order-rvsecncl` (TR: `TTTC0803U` 실전) | 미체결 주문 수정 및 취소 |
| **주식 잔고 조회** | `GET /uapi/domestic-stock/v1/trading/inquire-balance` (TR: `TTTC8434R`) | 보유 주식, 평가 손익, 유량 자산 조회 |
| **주식 현재가 시세** | `GET /uapi/domestic-stock/v1/quotations/inquire-price` (TR: `FHKST01010100`) | 현재가, 전일대비, 거래량, PER/PBR 조회 |
| **당일 분봉 시세** | `GET /uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice` | 분봉 기술적 지표 생성용 시계열 수집 |
| **외인/기관 동향** | `GET /uapi/domestic-stock/v1/quotations/inquire-investor` | 기관 및 외국인 순매수 합산 동향 |
| **실시간 체결가 (WS)** | TR Code: `H0STCNT0` | WebSocket을 통한 종목별 실시간 틱 데이터 수신 |
| **실시간 체결 통보 (WS)**| TR Code: `H0STCNNI0` (실전), `H0STCNNI8` (모의) | 사용자 계좌의 주문 체결 발생 시 즉시 Push 수신 |

### 5.2 Rate Limiter (Token Bucket Algorithm - 20 TPS)

```python
# python_engine/core/rate_limiter.py
import asyncio
import time

class TokenBucketRateLimiter:
    def __init__(self, rate_limit: int = 20, time_period: float = 1.0):
        self.rate_limit = rate_limit
        self.time_period = time_period
        self.tokens = rate_limit
        self.last_update = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            time_passed = now - self.last_update
            self.tokens = min(self.rate_limit, self.tokens + time_passed * (self.rate_limit / self.time_period))
            self.last_update = now

            if self.tokens < 1:
                wait_time = (1 - self.tokens) * (self.time_period / self.rate_limit)
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1
```

---

## 6. 동적 퀀트 전략 엔진 설계 (Dynamic Strategy Engine)

### 6.1 Python Base Strategy Abstract Interface

```python
# python_engine/strategy/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class SignalResult(BaseModel):
    ticker: str
    ticker_name: str
    action: str  # "BUY", "SELL", "HOLD"
    target_price: float = Field(description="주문 목표가")
    stop_loss_price: float = Field(description="손절 기준가")
    take_profit_price: float = Field(description="익절 기준가")
    weight: float = Field(default=1.0, description="전략 내 수량 비중")
    reason: str = Field(description="신호 발생 사유")

class BaseStrategy(ABC):
    def __init__(self, strategy_id: str, name: str, params: Dict[str, Any]):
        self.strategy_id = strategy_id
        self.name = name
        self.params = params

    @abstractmethod
    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        """시세 및 지표 데이터를 입력받아 매매 신호를 반환"""
        pass

    def update_params(self, new_params: Dict[str, Any]):
        """웹 UI에서 변경된 동적 파라미터 실시간 적용"""
        self.params.update(new_params)
```

### 6.2 Strategy Registry & Dynamic Loader Pattern

```python
# python_engine/strategy/registry.py
from typing import Dict, Type
from python_engine.strategy.base import BaseStrategy

class StrategyRegistry:
    _registry: Dict[str, Type[BaseStrategy]] = {}
    _active_instances: Dict[str, BaseStrategy] = {}

    @classmethod
    def register(cls, strategy_id: str):
        def decorator(subclass: Type[BaseStrategy]):
            cls._registry[strategy_id] = subclass
            return subclass
        return decorator

    @classmethod
    def initialize_active_strategies(cls, db_strategies: list):
        """Neon DB의 `quant_strategies` 상태를 기반으로 활성 인스턴스 로드"""
        cls._active_instances.clear()
        for item in db_strategies:
            if item['enabled'] and item['id'] in cls._registry:
                strategy_cls = cls._registry[item['id']]
                instance = strategy_cls(
                    strategy_id=item['id'],
                    name=item['name'],
                    params=item['parameters']
                )
                cls._active_instances[item['id']] = instance

    @classmethod
    def get_active_strategies(cls) -> Dict[str, BaseStrategy]:
        return cls._active_instances
```

---

### 6.3 5대 퀀트 전략 카탈로그 명세 (Strategy Catalog Specifications)

#### [Strategy A] 변동성 돌파 & 거래량 폭발 (Volatility Breakout)
* **ID:** `volatility_breakout`
* **기본 파라미터:** `{ "k_value": 0.5, "volume_multiplier": 2.0, "stop_loss_pct": 2.0 }`
* **로직:**  
  $$\text{Target Price} = \text{Today Open} + (\text{Yesterday High} - \text{Yesterday Low}) \times K$$
  현재가가 Target Price를 돌파하고, 5분봉 거래량이 전일 동시간대 평균 대비 `volume_multiplier`배 이상일 때 매수 신호 발생.

#### [Strategy B] 외인/기관 쌍끌이 모멘텀 (Institutional Net Buying)
* **ID:** `institutional_buying`
* **기본 파라미터:** `{ "consecutive_days": 3, "min_net_buy_amt": 5000000000 }` (50억원 이상)
* **로직:** KIS `inquire-investor` API 기준 외국인과 기관이 동시에 `consecutive_days` 이상 순매수한 종목 중 수급합계 상위 종목 매수.

#### [Strategy C] RSI 역추세 & 볼린저밴드 하단 반등 (Mean Reversion)
* **ID:** `mean_reversion`
* **기본 파라미터:** `{ "rsi_period": 14, "rsi_oversold": 30, "bb_period": 20, "bb_std": 2.0 }`
* **로직:** 일봉/30분봉 RSI < 30 이하, 볼린저밴드 Lower Band 하한을 오버슈팅 후 양봉 반등 시 과매도 기술적 반등 매수.

#### [Strategy D] 팩터 기반 밸류-모멘텀 (Low PBR/PER Dual Momentum)
* **ID:** `dual_momentum`
* **기본 파라미터:** `{ "max_pbr": 1.0, "max_per": 12.0, "momentum_days": 20, "top_n": 5 }`
* **로직:** KOSPI/KOSDAQ 전체 종목 중 low PBR/PER 가치주 필터링 후, 최근 20일 수익률 상위 `top_n` 종목을 선정하여 균등 자산 배분 매수.

#### [Strategy E] Gemini 2.0 Flash AI 멀티모달 하이브리드 필터 (AI Hybrid Filter)
* **ID:** `ai_hybrid`
* **기본 파라미터:** `{ "min_confidence": 0.80, "use_chart_vision": true }`
* **로직:** Strategy A~D에서 산출된 1차 매수 후보 종목의 재무 데이터 및 차트 이미지(Vercel Blob)를 Gemini 2.0 Flash `google-genai` SDK로 전달. Structured Output JSON 형태로 심사하여 `confidence >= 0.80` 및 `RECOMMENDATION == "BUY"`인 경우에만 최종 주문 집행.

---

## 7. AI 심층 진단 모듈 (Google Gen AI SDK / Gemini 2.0 Flash)

```python
# python_engine/ai/gemini_analyzer.py
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
import os

class StockAnalysisResponse(BaseModel):
    ticker: str
    recommendation: str = Field(description="BUY, HOLD, AVOID 중 하나")
    confidence_score: float = Field(description="0.0 ~ 1.0 신뢰도 점수")
    key_drivers: list[str] = Field(description="매수/비매수 핵심 이유 3가지")
    target_price_3m: float = Field(description="3개월 목표가")
    risk_factors: list[str] = Field(description="주요 리스크 요인")

async def analyze_stock_with_gemini(ticker: str, chart_image_bytes: bytes, financial_summary: str) -> StockAnalysisResponse:
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    prompt = f"""
    당신은 엘리트 자산운용사의 수석 퀀트 분석가입니다.
    종목코드 {ticker}의 재무 데이터와 제공된 차트 이미지를 종합 분석하여 
    엄격한 투자 판단을 전달하십시오.
    
    [재무 및 수급 요약]
    {financial_summary}
    """

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            types.Part.from_bytes(data=chart_image_bytes, mime_type="image/png"),
            prompt
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StockAnalysisResponse,
            temperature=0.2,
        ),
    )

    return StockAnalysisResponse.model_validate_json(response.text)
```

---

## 8. 리스크 관리 & 비상 청산 시스템 (Risk Management & Panic Button)

1. **자동 손절/익절 (Stop-Loss / Take-Profit):**
   * 매수 체결 직후 Neon DB의 `positions` 테이블에 손절가(`avg_buy_price * (1 - stop_loss_pct/100)`) 및 익절가 기록.
   * KIS WebSocket 체결가 수신 시 즉시 비교 후 한계값 돌파 시 시장가 매도 주문 자동 송신.
2. **트레일링 스탑 (Trailing Stop):**
   * 주가 상승 시 최고가 대비 설정 비율(예: -2.5%) 하락 시 수익 확정 매도.
3. **일일 최대 손실한도 서킷 브레이커 (Daily Max Drawdown Limit):**
   * 당일 총 자산 평가액이 장 시작 시점 대비 `-3.0%` 초과 하락 시, 모든 신규 매수 주문을 즉시 중단(Trading Freeze)하고 경고 알림 발송.
4. **비상 전량 청산 (Emergency Panic Button):**
   * `/api/orders/panic` 호출 시, 현재 보유 중인 모든 종목에 대해 KIS 시장가 매도(`01`) 주문을 병렬 전송하고, 모든 자동매매 스케줄러를 즉시 비활성화.

---

## 9. 안티그래비티 에이전트 구현 실행 가이드 (Step-by-Step Task Checklist)

개발 에이전트는 다음 순서대로 작업을 수행해야 합니다.

- [ ] **Step 1: 환경 설정 및 의존성 설치**
  - Next.js 15, Drizzle ORM, `@neondatabase/serverless`, `@vercel/blob`, `shadcn/ui`, `lucide-react` 설정.
  - Python 3.11 Virtual environment 구축 및 `fastapi`, `google-genai`, `finance-datareader`, `pykrx`, `pydantic` 설치.
- [ ] **Step 2: Neon DB 스키마 생성 및 Migration**
  - `src/lib/db/schema.ts` 작성 및 `npx drizzle-kit push` 실행하여 Neon Postgres에 테이블(quant_strategies, orders, positions 등) 생성.
- [ ] **Step 3: Next.js 프론트엔드 대시보드 및 전략 교체 UI 개발**
  - `/strategies` 페이지: Neon DB 연동 전략 목록, ON/OFF 토글 Switch, 자산 배분 Slider, 파라미터 JSON 에디터 모달 구현.
  - `/trading` 페이지: 보유 주식 잔고, 실시간 손익, KIS 주문 이력 표, 비상 Panic Button 버튼 구현.
  - `/search` 페이지: TradingView Lightweight Charts 및 Gemini AI 분석 요청 UI 구현.
- [ ] **Step 4: Python KIS OpenAPI 모듈 및 Rate Limiter 구축**
  - KIS OAuth2 토큰 자동 발급/갱신 및 Token Bucket Rate Limiter (20 TPS) 구현.
  - REST 주문 및 WebSocket (`H0STCNT0`, `H0STCNNI0`) 리스너 구현.
- [ ] **Step 5: Dynamic Strategy Engine 구현**
  - `BaseStrategy` 추상 클래스 및 `StrategyRegistry` 구축.
  - 5대 퀀트 전략 클래스 (`volatility_breakout.py`, `institutional_buying.py` 등) 완성.
- [ ] **Step 6: Vercel Cron & API Sync 연결 및 테스트**
  - Vercel Cron Jobs 매 분 단위 트리거 API 작성 및 Python Worker 간 통신 검증.
- [ ] **Step 7: 최종 리스크 테스트 및 배포**
  - KIS 모의투자 계좌 기반 주문 테스트, Panic Button 동작 검증 후 Vercel & Worker 서버에 최종 배포.
