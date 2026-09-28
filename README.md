# QuantAntigravity-KIS Web (v2.0.0) 🚀

> **차세대 KIS Open API + Next.js 15 + Neon Serverless DB + Gemini 2.0 Flash 멀티모달 하이브리드 퀀트 자동매매 플랫폼**

---

## 1. 프로젝트 개요 (Executive Summary)

본 프로젝트는 **한국투자증권(KIS) Open API**, **Next.js 15 (App Router)**, **Neon Serverless PostgreSQL (Drizzle ORM)**, **Vercel Blob**, 그리고 **Google Gemini 2.0 Flash LLM**을 결합한 클라우드 네이티브 모노레포(Monorepo) 퀀트 자동매매 및 스마트 주식 분석 시스템입니다.

### 핵심 시스템 기능
1. **Zero-Downtime Dynamic Strategy Switching**: 서버 재시작이나 코드 수정 없이 웹 UI에서 5대 퀀트 전략을 즉시 ON/OFF 및 실시간 파라미터/자산 비중 동적 튜닝(Hot-Reload).
2. **Robust Brokerage Gateway**: KIS Open API 공식 규격(REST & WebSocket) 연동. 초당 20TPS 제한을 엄격히 준수하는 **Token Bucket Rate Limiter**, 24시간 유효 OAuth2 토큰 자동 갱신, 주문 보안 검증용 Hashkey 생성.
3. **5대 퀀트 알고리즘 탑재**:
   - **Strategy A (변동성 돌파)**: 래리 윌리엄스 변동성 돌파(K-Value) + 거래량 급증 추세 추종
   - **Strategy B (외인/기관 쌍끌이)**: 3일 이상 외인 및 기관 동시 순매수 수급 주도주 포착
   - **Strategy C (RSI 역추세 & 볼린저밴드)**: RSI 과매도(<30) 및 볼린저밴드 하단 기술적 반등 매수
   - **Strategy D (밸류 모멘텀)**: Low PBR / Low PER 저평가 팩터 + 20일 모멘텀 최상위 종목
   - **Strategy E (Gemini 2.0 Flash AI 하이브리드)**: 1차 선정 종목에 대한 재무/수급/차트 멀티모달 정밀 심사 (Confidence Score >= 0.80)
4. **리스크 관리 & 비상 청산 시스템 (Panic Button)**:
   - 보유 전 종목 즉시 시장가 매도 및 매매 동결 기능 (웹 상단 비상 버튼 연동)
   - 트레일링 스탑, 자동 손절/익절(Stop-Loss / Take-Profit)
   - 당일 자산 대비 -3.0% 초과 하락 시 신규 매수 즉시 차단(Circuit Breaker)

---

## 2. 모노레포 디렉토리 구조 (Architecture Layout)

```
quant-kis-system-v2/
├── package.json                        # Next.js 15, Drizzle ORM, @vercel/blob, Tailwind
├── tsconfig.json                       # TypeScript 설정
├── drizzle.config.ts                   # Neon Postgres Drizzle ORM 설정
├── next.config.mjs                     # Next.js 설정 (Vercel Blob 이미지 도메인 등)
├── vercel.json                         # Vercel Cron 스케줄러 (매 분 단위 트리거)
├── .env.local.example                  # 환경 변수 템플릿
│
├── scripts/
│   └── db-init.mjs                     # Neon PostgreSQL DDL 테이블 생성 및 기본 전략 시딩 스크립트
│
├── src/                                # Next.js 15 App Router
│   ├── app/
│   │   ├── layout.tsx                  # 전역 루트 레이아웃 & 네비게이션 & 다크 테마
│   │   ├── page.tsx                    # Trading Control Tower 통합 대시보드
│   │   ├── globals.css                 # 퀀트 터미널 다크 테마 CSS 변수
│   │   ├── strategies/                 # 전략 허브: 무중단 동적 전환 & 파라미터 튜닝
│   │   │   └── page.tsx
│   │   ├── search/                     # 스마트 주식 검색 & 차트 & Gemini AI 진단
│   │   │   └── page.tsx
│   │   ├── trading/                    # 실시간 수동 주문 전송, 계좌 잔고 및 주문 이력
│   │   │   └── page.tsx
│   │   └── api/                        # Vercel Serverless API 엔드포인트
│   │       ├── cron/trading/route.ts   # Vercel Cron 매매 감시 트리거
│   │       ├── strategies/route.ts     # 전략 CRUD 및 파라미터 튜닝 API
│   │       ├── orders/route.ts         # 주문 내역 조회 및 수동 즉시 주문 API
│   │       ├── orders/panic/route.ts   # 비상 전량 시장가 청산 (Panic Button) API
│   │       ├── market/route.ts         # 종목 검색 및 TradingView 캔들 시세 API
│   │       └── ai/analyze/route.ts     # Google Gemini 2.0 Flash 멀티모달 진단 API
│   │
│   ├── components/
│   │   ├── navbar.tsx                  # 상단 네비게이션 & Panic Button 모달
│   │   ├── chart/
│   │   │   └── tradingview-chart.tsx   # TradingView Lightweight Charts 캔들스틱/거래량 래퍼
│   │   ├── dashboard/                  # 대시보드 위젯
│   │   │   ├── account-summary.tsx     # 총자산, 예수금, 주식평가액, 당일손익 카드
│   │   │   ├── position-table.tsx      # 실시간 보유 종목 테이블 및 개별 청산
│   │   │   └── execution-log.tsx       # 주문 및 체결 내역 로그
│   │   └── strategy/                   # 전략 관리 컴포넌트
│   │       ├── strategy-card.tsx       # 전략 카드 (토글 스위치, 자산비중 슬라이더)
│   │       └── parameter-modal.tsx     # 실시간 JSON/파라미터 튜닝 모달
│   │
│   └── lib/
│       ├── db/                         # Neon DB 인프라
│       │   ├── index.ts                # Drizzle ORM 클라이언트 & 초기 전략 시드
│       │   └── schema.ts               # Drizzle ORM 스키마 (quant_strategies, orders 등)
│       ├── blob.ts                     # Vercel Blob 업로드/다운로드 유틸
│       ├── kis-client.ts               # Node.js KIS OpenAPI 클라이언트 & 모의 주문 폴백
│       └── utils.ts                    # 화폐 포맷(KRW), 수익률, 날짜 유틸
│
├── python_engine/                      # Python FastAPI 워커 마이크로서비스
│   ├── requirements.txt                # FastAPI, google-genai, pykrx, fdr, pydantic 등
│   ├── main.py                         # FastAPI 서버 엔트리포인트 및 백그라운드 퀀트 루프
│   ├── config.py                       # pydantic-settings 기반 환경변수 로더
│   ├── core/
│   │   ├── logger.py                   # 구조화 로거
│   │   ├── rate_limiter.py             # Token Bucket 알고리즘 (20 TPS)
│   │   └── db_sync.py                  # Neon PostgreSQL DB 동기화
│   ├── kis/
│   │   ├── auth.py                     # OAuth2 토큰 갱신 & Hashkey 생성
│   │   ├── client.py                   # KIS REST 클라이언트 (현금주문, 시세, 잔고)
│   │   ├── websocket.py                # KIS 실시간 WebSocket (H0STCNT0, H0STCNNI0)
│   │   └── models.py                   # Pydantic 데이터 모델
│   ├── strategy/
│   │   ├── base.py                     # BaseStrategy 추상 클래스 & SignalResult
│   │   ├── registry.py                 # StrategyRegistry 동적 로더 및 핫 리로드
│   │   ├── ensemble.py                 # 다중 전략 앙상블 및 포트폴리오 가중 주문 집행
│   │   └── catalog/                    # 5대 퀀트 전략 구현체
│   │       ├── volatility_breakout.py  # [Strategy A] 변동성 돌파
│   │       ├── institutional_buying.py # [Strategy B] 외인/기관 쌍끌이
│   │       ├── mean_reversion.py       # [Strategy C] RSI 역추세
│   │       ├── dual_momentum.py        # [Strategy D] 밸류 모멘텀
│   │       └── ai_hybrid.py            # [Strategy E] Gemini 2.0 멀티모달 필터
│   ├── data/
│   │   ├── collector.py                # FinanceDataReader & pykrx 데이터 파이프라인
│   │   └── blob_cache.py               # Vercel Blob 캐싱
│   ├── risk/
│   │   ├── risk_manager.py             # 트레일링 스탑, 서킷 브레이커(-3%)
│   │   └── panic_handler.py            # 긴급 전량 청산 핸들러
│   └── ai/
│       └── gemini_analyzer.py          # Google Gen AI SDK (Gemini 2.0 Flash) 분석기
│
└── legacy/                             # 기존 레거시 파일 안전 보관 아카이브
```

---

## 3. 설치 및 실행 가이드 (Quick Start)

### 3.1 환경 변수 설정
프로젝트 루트의 `.env.local.example` 파일을 참조하여 `.env` 파일에 필요한 키를 입력합니다:
```bash
# Neon PostgreSQL Database
DATABASE_URL=postgresql://...

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Korea Investment & Securities (KIS)
KIS_APP_KEY=your_kis_app_key
KIS_APP_SECRET=your_kis_app_secret
KIS_ACCOUNT_NO=12345678
KIS_ACCOUNT_PRDT_CD=01
KIS_IS_PAPER_TRADING=true

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### 3.2 Neon DB 테이블 초기화 및 시딩
```bash
node scripts/db-init.mjs
```
*실행 시 Neon PostgreSQL에 `quant_strategies`, `orders`, `positions`, `ai_analysis_logs`, `account_snapshots` 테이블이 생성되고 기본 5개 전략이 자동 등록됩니다.*

### 3.3 Next.js 프론트엔드 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 접속:
- `/`: Control Tower 통합 대시보드
- `/strategies`: 전략 실시간 ON/OFF 및 무중단 파라미터 튜닝
- `/search`: 스마트 주식 검색, TradingView 차트 및 Gemini AI 진단
- `/trading`: KIS 실시간 주문 및 잔고 관리

### 3.4 Python FastAPI 워커 실행 (선택: Option A 하이브리드 모드 시)
```bash
# 가상환경 활성화 (Windows)
.\python_engine\venv\Scripts\activate

# FastAPI 서버 구동
python -m uvicorn python_engine.main:app --host 0.0.0.0 --port 8000 --reload
```
API 문서: `http://localhost:8000/docs`
