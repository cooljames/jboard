from typing import List, Dict, Any
from python_engine.kis.client import kis_client
from python_engine.kis.models import KisOrderRequest
from python_engine.core.logger import logger
from python_engine.core.db_sync import db_sync
from python_engine.risk.risk_manager import risk_manager

class PanicLiquidator:
    """
    Emergency Full Liquidation (Panic Button)
    - Liquidates all open positions at market price ('01')
    - Records orders in DB
    - Freezes further strategy triggers
    """
    async def execute_panic_liquidation(self) -> Dict[str, Any]:
        logger.critical("🚨 [PANIC BUTTON TRIGGERED] Initiating immediate liquidation of all positions!")
        risk_manager.circuit_breaker_tripped = True

        balance = await kis_client.get_balance()
        positions = [p for p in balance.positions if p.quantity > 0]

        results: List[Dict[str, Any]] = []
        for pos in positions:
            try:
                order_req = KisOrderRequest(
                    ticker=pos.ticker,
                    side="SELL",
                    order_type="01",  # 시장가 매도
                    price=0,
                    quantity=pos.quantity,
                )
                res = await kis_client.send_order(order_req)
                results.append({
                    "ticker": pos.ticker,
                    "ticker_name": pos.ticker_name,
                    "quantity": pos.quantity,
                    "order_no": res.order_no,
                    "success": True,
                })
                # DB logging
                db_sync.record_order({
                    "strategy_id": "PANIC_BUTTON",
                    "source": "PANIC",
                    "ticker": pos.ticker,
                    "ticker_name": pos.ticker_name,
                    "side": "SELL",
                    "order_type": "01",
                    "price": pos.current_price,
                    "quantity": pos.quantity,
                    "executed_price": pos.current_price,
                    "executed_quantity": pos.quantity,
                    "kis_order_no": res.order_no,
                    "status": "EXECUTED",
                    "fail_reason": None,
                })
            except Exception as e:
                logger.error(f"[Panic Button] Failed to liquidate {pos.ticker}: {e}")
                results.append({
                    "ticker": pos.ticker,
                    "ticker_name": pos.ticker_name,
                    "quantity": pos.quantity,
                    "success": False,
                    "error": str(e),
                })

        return {
            "success": True,
            "liquidated_count": len([r for r in results if r["success"]]),
            "total_positions": len(positions),
            "details": results,
        }

panic_liquidator = PanicLiquidator()
