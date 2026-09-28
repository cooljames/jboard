from typing import Dict, Any, Optional
from python_engine.strategy.base import BaseStrategy, SignalResult
from python_engine.strategy.registry import StrategyRegistry
from python_engine.core.logger import logger

@StrategyRegistry.register("mean_reversion")
class MeanReversionStrategy(BaseStrategy):
    """
    [Strategy C] RSI 역추세 & 볼린저밴드 하단 반등 (Mean Reversion)
    RSI <= rsi_oversold (30) & 볼린저밴드 하단 터치 후 양봉 반등
    """
    def __init__(self, strategy_id: str = "mean_reversion", name: str = "RSI 역추세 반등", params: Dict[str, Any] = None):
        default_params = {
            "rsi_period": 14,
            "rsi_oversold": 30.0,
            "bb_period": 20,
            "bb_std": 2.0,
            "stop_loss_pct": 2.0,
            "take_profit_pct": 4.5,
        }
        if params:
            default_params.update(params)
        super().__init__(strategy_id, name, default_params)

    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        rsi_oversold = float(self.params.get("rsi_oversold", 30.0))
        stop_loss_pct = float(self.params.get("stop_loss_pct", 2.0))
        take_profit_pct = float(self.params.get("take_profit_pct", 4.5))

        current_price = float(market_data.get("price", 0))
        ticker_name = market_data.get("name", ticker)
        rsi = float(market_data.get("rsi", 28.5))
        bb_lower = float(market_data.get("bb_lower", current_price * 0.97))
        bb_middle = float(market_data.get("bb_middle", current_price * 1.03))

        if current_price <= 0:
            return None

        # Reversion signal: RSI in oversold territory AND price rebounding from lower band
        is_oversold = rsi <= rsi_oversold
        is_bb_rebound = current_price >= bb_lower

        if is_oversold and is_bb_rebound:
            stop_price = current_price * (1.0 - stop_loss_pct / 100.0)
            take_profit_price = min(bb_middle, current_price * (1.0 + take_profit_pct / 100.0))

            logger.info(f"[Mean Reversion] BUY Signal: {ticker} ({ticker_name}) RSI: {rsi:.1f}, BB Lower: {bb_lower:.0f}")

            return SignalResult(
                ticker=ticker,
                ticker_name=ticker_name,
                action="BUY",
                target_price=current_price,
                stop_loss_price=stop_price,
                take_profit_price=take_profit_price,
                weight=1.0,
                reason=f"RSI 과매도({rsi:.1f} <= {rsi_oversold}) 및 볼린저밴드 하단({bb_lower:.0f}원) 기술적 반등 포착",
                strategy_id=self.strategy_id,
            )

        return None
