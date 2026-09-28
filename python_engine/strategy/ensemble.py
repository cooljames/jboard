from typing import List, Dict, Any, Optional
from python_engine.strategy.registry import StrategyRegistry
from python_engine.strategy.base import SignalResult
from python_engine.kis.client import kis_client
from python_engine.kis.models import KisOrderRequest
from python_engine.core.logger import logger
from python_engine.core.db_sync import db_sync

class StrategyEnsemble:
    """
    Multi-Strategy Portfolio Allocation Engine:
    - Feeds tick / bar data into active strategies
    - Resolves conflicting signals
    - Weights and scales order quantities
    - Dispatches approved orders to KIS Open API and records in Neon DB
    """
    def __init__(self):
        pass

    async def evaluate_market_data(self, ticker: str, market_data: Dict[str, Any]) -> List[SignalResult]:
        active_strategies = StrategyRegistry.get_active_strategies()
        weights = StrategyRegistry.get_strategy_weights()
        signals: List[SignalResult] = []

        for strat_id, strategy in active_strategies.items():
            try:
                sig = await strategy.analyze(ticker, market_data)
                if sig and sig.action in ["BUY", "SELL"]:
                    sig.weight = weights.get(strat_id, 0.2)
                    signals.append(sig)
            except Exception as e:
                logger.error(f"[Ensemble] Strategy {strat_id} evaluation failed: {e}")

        return signals

    async def execute_signal(self, sig: SignalResult, total_capital: float = 10000000.0) -> Optional[str]:
        """
        Executes signal by calculating position size from strategy allocation weight and submitting order.
        """
        if sig.target_price <= 0:
            return None

        # Allocate capital = Total Capital * Strategy Weight
        allocated_capital = total_capital * sig.weight
        quantity = int(allocated_capital / sig.target_price)

        if quantity <= 0:
            quantity = 1

        order_req = KisOrderRequest(
            ticker=sig.ticker,
            side=sig.action,
            order_type="00",  # 지정가
            price=sig.target_price,
            quantity=quantity,
            strategy_id=sig.strategy_id,
        )

        try:
            order_res = await kis_client.send_order(order_req)
            logger.info(f"[Ensemble] Order executed: {sig.ticker} {sig.action} Qty: {quantity} OrderNo: {order_res.order_no}")

            # Record in Neon DB
            db_sync.record_order({
                "strategy_id": sig.strategy_id,
                "ticker": sig.ticker,
                "ticker_name": sig.ticker_name,
                "side": sig.action,
                "order_type": "00",
                "price": sig.target_price,
                "quantity": quantity,
                "executed_price": sig.target_price,
                "executed_quantity": quantity,
                "kis_order_no": order_res.order_no,
                "status": "EXECUTED" if order_res.success else "FAILED",
                "fail_reason": None if order_res.success else order_res.message,
            })

            return order_res.order_no
        except Exception as e:
            logger.error(f"[Ensemble] Failed to execute order: {e}")
            db_sync.record_order({
                "strategy_id": sig.strategy_id,
                "ticker": sig.ticker,
                "ticker_name": sig.ticker_name,
                "side": sig.action,
                "order_type": "00",
                "price": sig.target_price,
                "quantity": quantity,
                "status": "FAILED",
                "fail_reason": str(e),
            })
            return None

strategy_ensemble = StrategyEnsemble()
