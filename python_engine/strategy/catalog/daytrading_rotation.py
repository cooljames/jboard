from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from python_engine.strategy.base import BaseStrategy, SignalResult
from python_engine.strategy.registry import StrategyRegistry
from python_engine.core.logger import logger

KST = timezone(timedelta(hours=9))

@StrategyRegistry.register("daytrading_rotation")
class DayTradingRotationStrategy(BaseStrategy):
    """
    [Strategy F] 당일 전액 회전 데이트레이딩 (Day Trading Rotation)
    - 보유 자산 전체(가용 현금 100%)를 당일 종목 회전에 투입
    - 시초가 대비 돌파 + 거래량 급증 시 진입 (장중 모멘텀)
    - 손절/익절/트레일링 + 장마감 강제 전량 청산으로 오버나잇(익일 보유) 없음
    """
    def __init__(self, strategy_id: str = "daytrading_rotation", name: str = "당일 전액 회전 데이트레이딩", params: Dict[str, Any] = None):
        default_params = {
            "capital_usage_pct": 100.0,      # 1회 진입에 투입할 가용현금 비율 (100 = 전액 회전)
            "breakout_pct": 0.3,             # 시초가 대비 돌파 기준 (%) — 장중 박스 상단 돌파
            "volume_multiplier": 1.5,        # 평균 대비 거래량 급증 배수
            "rsi_max": 70.0,                 # 과매수 구간 진입 방지 (RSI 상한)
            "stop_loss_pct": 1.5,            # 당일 손절선 (타이트)
            "take_profit_pct": 3.0,          # 당일 익절선
            "trailing_stop_pct": 1.0,        # 당일 트레일링 스탑
            "force_exit_time": "15:20",      # 장마감 강제청산 시각 (KST HH:MM)
            "entry_cutoff_minutes": 10,      # 강제청산 N분 전부터 신규 진입 차단
            "max_trades_per_day": 10,        # 일별 최대 진입 신호 수 (과매매 방지)
            "min_order_amount": 100000.0,    # 최소 주문금액 (미만 시 진입 스킵)
        }
        if params:
            default_params.update(params)
        super().__init__(strategy_id, name, default_params)
        self._trade_day = None
        self._signals_today = 0

    def _today(self):
        return datetime.now(KST).date()

    def _reset_day_if_needed(self):
        today = self._today()
        if self._trade_day != today:
            self._trade_day = today
            self._signals_today = 0

    def _is_entry_blocked_by_time(self) -> bool:
        """강제청산 시각 임박 시 신규 진입 차단 (청산 직전 매수 방지)"""
        try:
            exit_hm = str(self.params.get("force_exit_time", "15:20"))
            eh, em = (int(x) for x in exit_hm.split(":"))
            now = datetime.now(KST)
            cutoff_min = int(self.params.get("entry_cutoff_minutes", 10))
            now_min = now.hour * 60 + now.minute
            exit_min = eh * 60 + em - cutoff_min
            return now_min >= exit_min
        except Exception:
            return False

    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        self._reset_day_if_needed()

        open_price = float(market_data.get("open", 0))
        current_price = float(market_data.get("price", 0))
        current_volume = float(market_data.get("volume", 0))
        avg_volume = float(market_data.get("avg_volume", current_volume / 1.5 or 1))
        rsi = float(market_data.get("rsi", 50.0))
        ticker_name = market_data.get("name", ticker)

        if open_price <= 0 or current_price <= 0:
            return None

        # 1) 일별 진입 횟수 제한 (과매매 방지)
        max_trades = int(self.params.get("max_trades_per_day", 10))
        if self._signals_today >= max_trades:
            return None

        # 2) 장마감 임박 시 신규 진입 차단
        if self._is_entry_blocked_by_time():
            return None

        # 3) 당일 돌파 + 거래량 + 과열 필터
        breakout_pct = float(self.params.get("breakout_pct", 0.3))
        vol_mult = float(self.params.get("volume_multiplier", 1.5))
        rsi_max = float(self.params.get("rsi_max", 70.0))

        breakout_line = open_price * (1.0 + breakout_pct / 100.0)
        is_breakout = current_price >= breakout_line
        is_volume_surge = current_volume >= (avg_volume * vol_mult)
        is_not_overheated = rsi <= rsi_max

        if not (is_breakout and is_volume_surge and is_not_overheated):
            return None

        stop_loss_pct = float(self.params.get("stop_loss_pct", 1.5))
        take_profit_pct = float(self.params.get("take_profit_pct", 3.0))
        capital_usage_pct = float(self.params.get("capital_usage_pct", 100.0))
        min_order_amount = float(self.params.get("min_order_amount", 100000.0))

        self._signals_today += 1

        logger.info(
            f"[DayTrading Rotation] BUY Signal({self._signals_today}/{max_trades}): "
            f"{ticker} ({ticker_name}) 시초가 {open_price:.0f} → 현재 {current_price:.0f} "
            f"(돌파선 {breakout_line:.0f}, RSI {rsi:.1f})"
        )

        return SignalResult(
            ticker=ticker,
            ticker_name=ticker_name,
            action="BUY",
            target_price=current_price,
            stop_loss_price=current_price * (1.0 - stop_loss_pct / 100.0),
            take_profit_price=current_price * (1.0 + take_profit_pct / 100.0),
            weight=1.0,
            reason=f"당일 돌파(시초가 대비 +{breakout_pct}%) + 거래량 {vol_mult}배 + RSI {rsi:.1f} (전액 회전 {self._signals_today}/{max_trades}회차)",
            strategy_id=self.strategy_id,
            use_full_capital=True,
            capital_pct=max(0.0, min(1.0, capital_usage_pct / 100.0)),
            min_order_amount=min_order_amount,
        )
