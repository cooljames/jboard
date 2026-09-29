import asyncio
import os
import json
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

# Core and Configuration
from python_engine.config import settings
from python_engine.core.logger import logger
from python_engine.core.db_sync import db_sync
from python_engine.kis.client import kis_client
from python_engine.kis.websocket import kis_ws
from python_engine.kis.models import KisOrderRequest, KisOrderResponse, StockPriceInfo, AccountBalanceInfo
from python_engine.strategy.registry import StrategyRegistry
import python_engine.strategy.catalog  # Auto-registers 5 strategies
from python_engine.strategy.ensemble import strategy_ensemble
from python_engine.data.collector import market_data_collector
from python_engine.risk.risk_manager import risk_manager
from python_engine.core.order_cooldown import order_cooldown
from python_engine.kis.auth import TokenRateLimited
from python_engine.risk.panic_handler import panic_liquidator
from python_engine.ai.gemini_analyzer import analyze_stock_with_gemini

# Background runner task reference
background_trading_task = None

# 자동매매 실행 게이트: 컨트롤타워 시작 버튼으로만 켜짐 (기본 OFF = 안전)
auto_trading_enabled: bool = False

async def market_evaluation_loop():
    """Background task evaluating market data every 10 seconds for active strategies"""
    watchlist = [
        ("005930", "삼성전자"),
        ("000660", "SK하이닉스"),
        ("035420", "NAVER"),
        ("005380", "현대차"),
        ("068270", "셀트리온"),
    ]
    logger.info("[Trading Worker] Background evaluation loop started (waiting for START signal from Control Tower).")

    while True:
        try:
            if not auto_trading_enabled:
                # 대기중: 주문 없이 대기 (다음 사이클까지 슬립)
                pass
            else:
                await _run_single_evaluation_cycle(watchlist)
        except TokenRateLimited as e:
            logger.warning(f"[Trading Loop] Token rate-limited, waiting for next cycle: {e}")
        except (httpx.TimeoutException, httpx.ReadTimeout, httpx.ConnectTimeout) as e:
            logger.warning(f"[Trading Loop 방지책] KIS API 통신 지연/타임아웃 감지 ({type(e).__name__}). 포지션을 안전하게 유지하며 다음 평가 주기까지 대기합니다.")
        except RuntimeError as e:
            err_msg = str(e)
            if "초당 거래건수" in err_msg or "EGW00201" in err_msg or "EGW00215" in err_msg or "Rate Limit" in err_msg:
                logger.warning(f"[Trading Loop 방지책] KIS API 속도 제한 감지 ({err_msg}). 쿨다운 후 안전하게 다음 사이클을 진행합니다.")
            else:
                logger.error(f"[Trading Loop Error] {type(e).__name__}: {e}")
        except Exception as e:
            logger.error(f"[Trading Loop Error] {type(e).__name__}: {e}")

        await asyncio.sleep(15)

async def _run_single_evaluation_cycle(watchlist):
    """1회 매매 평가 사이클 (게이트 ON일 때만 호출)"""
    active_strats = StrategyRegistry.get_active_strategies()
    if not active_strats or risk_manager.circuit_breaker_tripped:
        return

    # Check account balance to monitor daily drawdowns and stop-losses
    try:
        balance = await kis_client.get_balance()
    except Exception as e:
        logger.warning(f"[Trading Loop 방지책] 잔고 동기화 일시 대기 ({type(e).__name__}: {e}). 안전을 위해 이번 사이클 진입을 건너뜁니다.")
        return

    if balance.total_asset <= 0 and not settings.kis_is_paper_trading:
        logger.warning("[Trading Loop 방지책] 계좌 자산 정보가 유효하지 않아 신규 주문을 보류합니다.")
        return

    risk_manager.set_start_asset(balance.total_asset)
    risk_manager.check_circuit_breaker(balance.total_asset)


    # Evaluate risk on open positions
    # 데이트레이딩 활성 시: 타이트한 당일 손절/익절/트레일링 파라미터로 청산 감시
    day_strat = active_strats.get("daytrading_rotation")
    if day_strat is not None:
        dt_params = day_strat.params or {}
        sl_pct = float(dt_params.get("stop_loss_pct", 1.5))
        tp_pct = float(dt_params.get("take_profit_pct", 3.0))
        ts_pct = float(dt_params.get("trailing_stop_pct", 1.0))
    else:
        sl_pct, tp_pct, ts_pct = 2.5, 6.0, 2.5
    for pos in balance.positions:
        await risk_manager.evaluate_position_risk(
            ticker=pos.ticker,
            current_price=pos.current_price,
            avg_buy_price=pos.avg_buy_price,
            quantity=pos.quantity,
            stop_loss_pct=sl_pct,
            take_profit_pct=tp_pct,
            trailing_stop_pct=ts_pct,
        )

    # 장마감 강제 전량 청산 (데이트레이딩 활성 시, 오버나잇 보유 방지)
    # 청산 후 스캔은 그대로 진행하되, 전략 자체가 청산임박 신규진입을 차단함
    if day_strat is not None:
        exit_time = str((day_strat.params or {}).get("force_exit_time", "15:20"))
        if risk_manager.is_past_exit_time(exit_time):
            await risk_manager.force_exit_all(
                positions=balance.positions,
                strategy_id="daytrading_rotation",
                reason=f"장마감 강제청산({exit_time} KST)",
            )

    # Scan watchlist for active strategies
    held_qty = {p.ticker: int(p.quantity or 0) for p in balance.positions}
    cash_capital = balance.cashBalance if hasattr(balance, 'cashBalance') else balance.cash_balance
    # 일손실률 주입 (bb_multiregime 일손실 중단선 등 전략 레벨 리스크 게이트용)
    try:
        base_asset = risk_manager.daily_start_asset or balance.total_asset
        daily_loss_pct = ((balance.total_asset - base_asset) / base_asset * 100.0) if base_asset else 0.0
    except Exception:
        daily_loss_pct = 0.0
    for ticker, name in watchlist:
        market_data = await market_data_collector.get_market_data_for_ticker(ticker, name)
        market_data["daily_loss_pct"] = daily_loss_pct
        market_data["cash_balance"] = cash_capital
        signals = await strategy_ensemble.evaluate_market_data(ticker, market_data)
        for sig in signals:
            if sig.action == "BUY" and risk_manager.can_open_new_position(balance.total_asset):
                await strategy_ensemble.execute_signal(sig, total_capital=cash_capital)
            elif sig.action == "SELL":
                hq = held_qty.get(sig.ticker, 0)
                if hq <= 0:
                    continue
                q = int(sig.quantity or 0) or hq
                await strategy_ensemble.execute_signal(
                    sig, total_capital=cash_capital, quantity_override=min(q, hq)
                )

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("==================================================================")
    logger.info(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"   Environment: {'Paper Trading' if settings.kis_is_paper_trading else 'REAL Trading'}")
    logger.info("==================================================================")

    # 1. Sync strategies from Neon DB
    db_strats = db_sync.get_all_strategies()
    StrategyRegistry.initialize_active_strategies(db_strats)

    # 2. Start KIS WebSocket listener
    await kis_ws.start()

    # 3. Start background quant trading loop
    global background_trading_task
    background_trading_task = asyncio.create_task(market_evaluation_loop())

    yield

    logger.info("🛑 Shutting down Trading Worker service...")
    if background_trading_task:
        background_trading_task.cancel()
    await kis_ws.stop()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class StrategyPatchRequest(BaseModel):
    enabled: Optional[bool] = None
    allocation_weight: Optional[float] = None
    parameters: Optional[Dict[str, Any]] = None

class AiAnalysisRequest(BaseModel):
    ticker: str
    ticker_name: Optional[str] = None
    financial_summary: Optional[str] = ""

# API Endpoints
@app.get("/health")
async def health_check():
    active_strats = list(StrategyRegistry.get_active_strategies().keys())
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "active_strategies": active_strats,
        "circuit_breaker_tripped": risk_manager.circuit_breaker_tripped,
    }

@app.get("/api/strategies")
async def list_strategies():
    all_strats = db_sync.get_all_strategies()
    active_dict = StrategyRegistry.get_active_strategies()
    return {
        "strategies": all_strats,
        "active_ids": list(active_dict.keys()),
        "weights": StrategyRegistry.get_strategy_weights(),
    }

@app.post("/api/strategies/sync")
async def sync_strategies():
    """Hot reload strategies from Neon DB without server restart"""
    db_strats = db_sync.get_all_strategies()
    StrategyRegistry.initialize_active_strategies(db_strats)
    return {
        "success": True,
        "message": "Dynamic Strategy Registry synchronized with DB.",
        "active_strategies": list(StrategyRegistry.get_active_strategies().keys()),
    }

@app.patch("/api/strategies/{strategy_id}")
async def patch_strategy(strategy_id: str, req: StrategyPatchRequest):
    """
    Zero-Downtime dynamic tuning of strategy parameters & ON/OFF toggle
    """
    updated = db_sync.update_strategy(
        strategy_id=strategy_id,
        enabled=req.enabled,
        weight=req.allocation_weight,
        parameters=req.parameters,
    )

    StrategyRegistry.update_strategy_in_memory(
        strategy_id=strategy_id,
        params=req.parameters,
        enabled=req.enabled,
        weight=req.allocation_weight,
    )

    return {
        "success": True,
        "strategy_id": strategy_id,
        "db_updated": updated,
        "message": f"Strategy {strategy_id} updated and hot-reloaded dynamically.",
    }

@app.get("/api/balance")
async def get_balance():
    balance = await kis_client.get_balance()
    return balance

@app.post("/api/orders", response_model=KisOrderResponse)
async def submit_manual_order(order_req: KisOrderRequest):
    res = await kis_client.send_order(order_req)
    # Record to DB
    db_sync.record_order({
        "strategy_id": order_req.strategy_id or "MANUAL",
        "source": "MANUAL",
        "ticker": order_req.ticker,
        "ticker_name": f"종목-{order_req.ticker}",
        "side": order_req.side,
        "order_type": order_req.order_type,
        "price": order_req.price,
        "quantity": order_req.quantity,
        "executed_price": order_req.price,
        "executed_quantity": order_req.quantity,
        "kis_order_no": res.order_no,
        "status": "EXECUTED" if res.success else "FAILED",
        "fail_reason": None if res.success else res.message,
    })
    return res

@app.post("/api/panic")
async def emergency_panic_liquidation():
    """Emergency Panic Button: liquidates all positions at market price"""
    res = await panic_liquidator.execute_panic_liquidation()
    return res

@app.post("/api/ai/analyze")
async def run_ai_analysis(req: AiAnalysisRequest):
    ticker_name = req.ticker_name or f"종목-{req.ticker}"
    market_data = await market_data_collector.get_market_data_for_ticker(req.ticker, ticker_name)
    summary = req.financial_summary or f"현재가 {market_data.get('price')}원, PER {market_data.get('per')}, PBR {market_data.get('pbr')}, RSI {market_data.get('rsi')}"

    result = await analyze_stock_with_gemini(
        ticker=req.ticker,
        ticker_name=ticker_name,
        chart_image_bytes=None,
        financial_summary=summary,
    )

    db_sync.save_ai_analysis({
        "ticker": req.ticker,
        "ticker_name": ticker_name,
        "recommendation": result.recommendation,
        "confidence_score": result.confidence_score,
        "summary": " / ".join(result.key_drivers),
        "structured_json": result.model_dump(),
    })

    return result

@app.get("/api/market/quote")
async def get_market_quote(ticker: str):
    quote = await market_data_collector.get_market_data_for_ticker(ticker)
    return quote

@app.get("/api/market/search")
async def search_market(q: str = "", market: str = "ALL"):
    """전체 한국거래소(KRX) 상장 종목 및 ETF/ETN 검색 (FinanceDataReader / Master 연동)"""
    q_clean = q.strip().lower()
    if not q_clean:
        return {"results": []}

    master_path = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "krx-securities-master.json")
    items = []
    if os.path.exists(master_path):
        try:
            with open(master_path, "r", encoding="utf-8") as f:
                items = json.load(f)
        except Exception:
            pass

    if not items:
        try:
            import FinanceDataReader as fdr
            df = fdr.StockListing("KRX")
            for _, r in df.iterrows():
                m = str(r.get("Market", "")).upper()
                items.append({
                    "ticker": str(r["Code"]).zfill(6),
                    "name": str(r["Name"]),
                    "market": "KOSDAQ" if "KOSDAQ" in m else "KOSPI",
                    "sector": str(r.get("Dept", ""))
                })
        except Exception as e:
            logger.error(f"[Market Search] FDR fallback error: {e}")

    matches = []
    for s in items:
        m_type = s.get("market", "")
        if market != "ALL" and m_type != market:
            continue
        ticker = s.get("ticker", "").lower()
        name = s.get("name", "").lower()
        sector = (s.get("sector") or "").lower()
        underlying = (s.get("underlying") or "").lower()

        if q_clean in ticker or q_clean in name or q_clean in sector or q_clean in underlying:
            matches.append(s)

    return {"results": matches[:25]}

@app.post("/api/cron/trigger")
async def trigger_cron_cycle():
    """Vercel Cron or remote trigger endpoint"""
    db_strats = db_sync.get_all_strategies()
    StrategyRegistry.initialize_active_strategies(db_strats)
    return {"success": True, "message": "Cron evaluation cycle triggered."}

def _trading_status_payload() -> dict:
    return {
        "enabled": auto_trading_enabled,
        "active_strategies": list(StrategyRegistry.get_active_strategies().keys()),
        "circuit_breaker_tripped": risk_manager.circuit_breaker_tripped,
        "is_paper_trading": settings.kis_is_paper_trading,
        "order_cooldown": order_cooldown.status(),
    }

@app.get("/api/trading/status")
async def trading_status():
    """컨트롤타워 시작/중지 버튼용 상태 조회"""
    return {"success": True, **_trading_status_payload()}

@app.post("/api/trading/start")
async def trading_start():
    """자동매매 시작 (컨트롤타워 버튼) — 이후 평가 사이클마다 실제 주문 집행"""
    global auto_trading_enabled
    db_strats = db_sync.get_all_strategies()
    StrategyRegistry.initialize_active_strategies(db_strats)
    auto_trading_enabled = True
    logger.critical("▶️ [AUTO TRADING] Started by Control Tower. Live order execution enabled.")
    return {"success": True, "message": "자동매매를 시작합니다.", **_trading_status_payload()}

@app.post("/api/trading/stop")
async def trading_stop():
    """자동매매 중지 (컨트롤타워 버튼) — 신규 진입 중단, 기존 보유분은 유지"""
    global auto_trading_enabled
    auto_trading_enabled = False
    logger.critical("⏸️ [AUTO TRADING] Stopped by Control Tower. Standing by (no new orders).")
    return {"success": True, "message": "자동매매를 중지했습니다 (대기중).", **_trading_status_payload()}

async def _delayed_worker_exit():
    """응답 전송 후 워커 프로세스 완전 종료"""
    await asyncio.sleep(1.0)
    global auto_trading_enabled, background_trading_task
    auto_trading_enabled = False
    if background_trading_task:
        background_trading_task.cancel()
    try:
        await kis_ws.stop()
    except Exception:
        pass
    logger.critical("🛑 [WORKER] Shutdown requested from Control Tower. Process exiting.")
    await asyncio.sleep(0.5)
    import os
    os._exit(0)

@app.post("/api/worker/shutdown")
async def worker_shutdown():
    """워커 프로세스 완전 종료 (컨트롤타워 종료 버튼) — 재시작은 터미널에서 직접"""
    asyncio.create_task(_delayed_worker_exit())
    return {"success": True, "message": "워커 프로세스를 종료합니다."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)
