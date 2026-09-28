import asyncio
from contextlib import asynccontextmanager
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
from python_engine.risk.panic_handler import panic_liquidator
from python_engine.ai.gemini_analyzer import analyze_stock_with_gemini

# Background runner task reference
background_trading_task = None

async def market_evaluation_loop():
    """Background task evaluating market data every 10 seconds for active strategies"""
    watchlist = [
        ("005930", "삼성전자"),
        ("000660", "SK하이닉스"),
        ("035420", "NAVER"),
        ("005380", "현대차"),
        ("068270", "셀트리온"),
    ]
    logger.info("[Trading Worker] Background evaluation loop started.")

    while True:
        try:
            active_strats = StrategyRegistry.get_active_strategies()
            if active_strats and not risk_manager.circuit_breaker_tripped:
                # Check account balance to monitor daily drawdowns and stop-losses
                balance = await kis_client.get_balance()
                risk_manager.set_start_asset(balance.total_asset)
                risk_manager.check_circuit_breaker(balance.total_asset)

                # Evaluate risk on open positions
                for pos in balance.positions:
                    await risk_manager.evaluate_position_risk(
                        ticker=pos.ticker,
                        current_price=pos.current_price,
                        avg_buy_price=pos.avg_buy_price,
                        quantity=pos.quantity,
                    )

                # Scan watchlist for active strategies
                for ticker, name in watchlist:
                    market_data = await market_data_collector.get_market_data_for_ticker(ticker, name)
                    signals = await strategy_ensemble.evaluate_market_data(ticker, market_data)
                    for sig in signals:
                        if sig.action == "BUY" and risk_manager.can_open_new_position(balance.total_asset):
                            await strategy_ensemble.execute_signal(sig, total_capital=balance.cashBalance if hasattr(balance, 'cashBalance') else balance.cash_balance)
        except Exception as e:
            logger.error(f"[Trading Loop Error] {e}")

        await asyncio.sleep(15)

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

@app.post("/api/cron/trigger")
async def trigger_cron_cycle():
    """Vercel Cron or remote trigger endpoint"""
    db_strats = db_sync.get_all_strategies()
    StrategyRegistry.initialize_active_strategies(db_strats)
    return {"success": True, "message": "Cron evaluation cycle triggered."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)
