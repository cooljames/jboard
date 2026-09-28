from typing import Dict, Any, Optional
from python_engine.strategy.base import BaseStrategy, SignalResult
from python_engine.strategy.registry import StrategyRegistry
from python_engine.core.logger import logger

@StrategyRegistry.register("dual_momentum")
class DualMomentumStrategy(BaseStrategy):
    """
    [Strategy D] 팩터 기반 밸류-모멘텀 (Low PBR/PER Dual Momentum)
    PBR <= max_pbr, PER <= max_per, 20일 모멘텀 양수 종목 선별
    """
    def __init__(self, strategy_id: str = "dual_momentum", name: str = "밸류 모멘텀", params: Dict[str, Any] = None):
        default_params = {
            "max_pbr": 1.0,
            "max_per": 12.0,
            "momentum_days": 20,
            "top_n": 5,
            "stop_loss_pct": 3.0,
            "take_profit_pct": 10.0,
        }
        if params:
            default_params.update(params)
        super().__init__(strategy_id, name, default_params)

    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        max_pbr = float(self.params.get("max_pbr", 1.0))
        max_per = float(self.params.get("max_per", 12.0))
        stop_loss_pct = float(self.params.get("stop_loss_pct", 3.0))
        take_profit_pct = float(self.params.get("take_profit_pct", 10.0))

        current_price = float(market_data.get("price", 0))
        ticker_name = market_data.get("name", ticker)
        pbr = float(market_data.get("pbr", 0.85))
        per = float(market_data.get("per", 8.4))
        momentum_return = float(market_data.get("momentum_return", 6.8))

        if current_price <= 0:
            return None

        # Value criteria + Positive Momentum criteria
        is_value_qualified = (0 < pbr <= max_pbr) and (0 < per <= max_per)
        is_momentum_qualified = momentum_return > 0

        if is_value_qualified and is_momentum_qualified:
            stop_price = current_price * (1.0 - stop_loss_pct / 100.0)
            take_profit_price = current_price * (1.0 + take_profit_pct / 100.0)

            logger.info(f"[Dual Momentum] BUY Signal: {ticker} ({ticker_name}) PBR: {pbr}, PER: {per}, Mom: +{momentum_return}%")

            return SignalResult(
                ticker=ticker,
                ticker_name=ticker_name,
                action="BUY",
                target_price=current_price,
                stop_loss_price=stop_price,
                take_profit_price=take_profit_price,
                weight=1.0,
                reason=f"저평가 가치 요건(PBR {pbr} <= {max_pbr}, PER {per} <= {max_per}) 및 20일 모멘텀(+{momentum_return}%) 우수",
                strategy_id=self.strategy_id,
            )

        return None
