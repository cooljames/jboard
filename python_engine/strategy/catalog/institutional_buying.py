from typing import Dict, Any, Optional
from python_engine.strategy.base import BaseStrategy, SignalResult
from python_engine.strategy.registry import StrategyRegistry
from python_engine.core.logger import logger

@StrategyRegistry.register("institutional_buying")
class InstitutionalBuyingStrategy(BaseStrategy):
    """
    [Strategy B] 외인/기관 쌍끌이 모멘텀 (Institutional Net Buying)
    외인 및 기관 동시 순매수 일수 >= consecutive_days & 순매수 금액 >= min_net_buy_amt
    """
    def __init__(self, strategy_id: str = "institutional_buying", name: str = "외인/기관 쌍끌이", params: Dict[str, Any] = None):
        default_params = {
            "consecutive_days": 3,
            "min_net_buy_amt": 5000000000,  # 50억원
            "trailing_stop_pct": 2.5,
            "stop_loss_pct": 2.5,
            "take_profit_pct": 7.0,
        }
        if params:
            default_params.update(params)
        super().__init__(strategy_id, name, default_params)

    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        consecutive_days = int(self.params.get("consecutive_days", 3))
        min_net_buy_amt = float(self.params.get("min_net_buy_amt", 5000000000))
        stop_loss_pct = float(self.params.get("stop_loss_pct", 2.5))
        take_profit_pct = float(self.params.get("take_profit_pct", 7.0))

        current_price = float(market_data.get("price", 0))
        ticker_name = market_data.get("name", ticker)
        foreign_buy_days = int(market_data.get("foreign_buy_days", 3))
        inst_buy_days = int(market_data.get("inst_buy_days", 3))
        foreign_net_amt = float(market_data.get("foreign_net_amt", 3000000000))
        inst_net_amt = float(market_data.get("inst_net_amt", 3000000000))

        if current_price <= 0:
            return None

        total_net_buy = foreign_net_amt + inst_net_amt
        is_dual_buying = (
            foreign_buy_days >= consecutive_days and
            inst_buy_days >= consecutive_days and
            total_net_buy >= min_net_buy_amt
        )

        if is_dual_buying:
            stop_price = current_price * (1.0 - stop_loss_pct / 100.0)
            take_profit_price = current_price * (1.0 + take_profit_pct / 100.0)

            logger.info(f"[Institutional Buying] BUY Signal: {ticker} ({ticker_name}) Total Net: {total_net_buy/100000000:.1f}억")

            return SignalResult(
                ticker=ticker,
                ticker_name=ticker_name,
                action="BUY",
                target_price=current_price,
                stop_loss_price=stop_price,
                take_profit_price=take_profit_price,
                weight=1.0,
                reason=f"외인({foreign_buy_days}일)/기관({inst_buy_days}일) 쌍끌이 순매수 {total_net_buy/100000000:.1f}억원 달성",
                strategy_id=self.strategy_id,
            )

        return None
