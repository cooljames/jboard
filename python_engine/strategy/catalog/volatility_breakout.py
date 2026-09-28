from typing import Dict, Any, Optional
from python_engine.strategy.base import BaseStrategy, SignalResult
from python_engine.strategy.registry import StrategyRegistry
from python_engine.core.logger import logger

@StrategyRegistry.register("volatility_breakout")
class VolatilityBreakoutStrategy(BaseStrategy):
    """
    [Strategy A] 변동성 돌파 & 거래량 폭발 (Volatility Breakout)
    Target Price = Today Open + (Yesterday High - Yesterday Low) * K
    신호: 현재가 >= Target Price & 거래량 급증 시 매수 신호
    """
    def __init__(self, strategy_id: str = "volatility_breakout", name: str = "변동성 돌파", params: Dict[str, Any] = None):
        default_params = {
            "k_value": 0.5,
            "volume_multiplier": 2.0,
            "stop_loss_pct": 2.0,
            "take_profit_pct": 5.0,
        }
        if params:
            default_params.update(params)
        super().__init__(strategy_id, name, default_params)

    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        k = float(self.params.get("k_value", 0.5))
        vol_mult = float(self.params.get("volume_multiplier", 2.0))
        stop_loss_pct = float(self.params.get("stop_loss_pct", 2.0))
        take_profit_pct = float(self.params.get("take_profit_pct", 5.0))

        today_open = float(market_data.get("open", 0))
        yesterday_high = float(market_data.get("yesterday_high", today_open * 1.02))
        yesterday_low = float(market_data.get("yesterday_low", today_open * 0.98))
        current_price = float(market_data.get("price", 0))
        current_volume = float(market_data.get("volume", 0))
        avg_volume = float(market_data.get("avg_volume", current_volume / 2.5 or 1))
        ticker_name = market_data.get("name", ticker)

        if today_open <= 0 or current_price <= 0:
            return None

        # Calculate breakout target
        prev_range = max(0.0, yesterday_high - yesterday_low)
        breakout_target = today_open + (prev_range * k)

        # Condition 1: Price breaks above target
        # Condition 2: Volume is surging
        is_breakout = current_price >= breakout_target
        is_volume_surge = current_volume >= (avg_volume * vol_mult)

        if is_breakout and is_volume_surge:
            stop_price = current_price * (1.0 - stop_loss_pct / 100.0)
            take_profit_price = current_price * (1.0 + take_profit_pct / 100.0)

            logger.info(f"[Volatility Breakout] BUY Signal: {ticker} ({ticker_name}) Target: {breakout_target:.0f}, Current: {current_price:.0f}")

            return SignalResult(
                ticker=ticker,
                ticker_name=ticker_name,
                action="BUY",
                target_price=current_price,
                stop_loss_price=stop_price,
                take_profit_price=take_profit_price,
                weight=1.0,
                reason=f"변동성 돌파 달성(돌파선 {breakout_target:.0f}원 대비 현재 {current_price:.0f}원) 및 거래량 폭발({vol_mult}배)",
                strategy_id=self.strategy_id,
            )

        return None
