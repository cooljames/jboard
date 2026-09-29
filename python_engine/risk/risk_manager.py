from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from python_engine.kis.client import kis_client
from python_engine.kis.models import KisOrderRequest
from python_engine.core.logger import logger
from python_engine.core.db_sync import db_sync
from python_engine.core.order_cooldown import order_cooldown
from python_engine.config import settings

KST = timezone(timedelta(hours=9))

class RiskManager:
    """
    Risk & Portfolio Safeguard:
    1. Stop Loss & Take Profit automatic monitoring
    2. Trailing Stop
    3. Daily Max Loss Circuit Breaker (-3.0%)
    """
    def __init__(self):
        self.daily_start_asset: Optional[float] = None
        self.circuit_breaker_tripped: bool = False
        self.high_water_marks: Dict[str, float] = {}

    def set_start_asset(self, total_asset: float):
        if self.daily_start_asset is None:
            self.daily_start_asset = total_asset
            logger.info(f"[Risk Manager] Baseline Daily Start Asset set to: {total_asset:,.0f} KRW")

    def check_circuit_breaker(self, current_asset: float) -> bool:
        if self.daily_start_asset is None:
            self.daily_start_asset = current_asset
            return False

        drawdown = (current_asset - self.daily_start_asset) / self.daily_start_asset * 100.0
        max_drawdown = settings.daily_max_drawdown_pct  # 3.0%

        if drawdown <= -max_drawdown:
            if not self.circuit_breaker_tripped:
                self.circuit_breaker_tripped = True
                logger.critical(
                    f"🚨 [CIRCUIT BREAKER] Daily loss exceeded -{max_drawdown}% ({drawdown:.2f}%). "
                    f"ALL NEW BUY ORDERS ARE FROZEN!"
                )
            return True

        return False

    def can_open_new_position(self, current_asset: float) -> bool:
        if self.circuit_breaker_tripped:
            return False
        return not self.check_circuit_breaker(current_asset)

    async def evaluate_position_risk(
        self,
        ticker: str,
        current_price: float,
        avg_buy_price: float,
        quantity: int,
        stop_loss_pct: float = 2.5,
        take_profit_pct: float = 6.0,
        trailing_stop_pct: Optional[float] = 2.5,
    ) -> Optional[str]:
        """
        Evaluates whether an existing position should be automatically exited
        """
        if quantity <= 0 or current_price <= 0:
            return None

        # Update high-water mark for trailing stop
        prev_hwm = self.high_water_marks.get(ticker, avg_buy_price)
        if current_price > prev_hwm:
            self.high_water_marks[ticker] = current_price
            prev_hwm = current_price

        # Check Stop Loss
        loss_pct = (current_price - avg_buy_price) / avg_buy_price * 100.0
        if loss_pct <= -stop_loss_pct:
            logger.warning(f"[Risk Manager] STOP LOSS TRIGGERED for {ticker}: {loss_pct:.2f}% <= -{stop_loss_pct}%")
            return await self._execute_exit(ticker, quantity, f"손절선({stop_loss_pct}%) 도달")

        # Check Take Profit
        if loss_pct >= take_profit_pct:
            logger.info(f"[Risk Manager] TAKE PROFIT TRIGGERED for {ticker}: +{loss_pct:.2f}% >= +{take_profit_pct}%")
            return await self._execute_exit(ticker, quantity, f"목표 익절선({take_profit_pct}%) 도달")

        # Check Trailing Stop
        if trailing_stop_pct and prev_hwm > avg_buy_price:
            drop_from_peak = (current_price - prev_hwm) / prev_hwm * 100.0
            if drop_from_peak <= -trailing_stop_pct:
                logger.info(f"[Risk Manager] TRAILING STOP TRIGGERED for {ticker}: -{drop_from_peak:.2f}% from peak {prev_hwm:.0f}")
                return await self._execute_exit(ticker, quantity, f"트레일링 스탑({trailing_stop_pct}%) 도달")

        return None

    async def _execute_exit(self, ticker: str, quantity: int, reason: str) -> str:
        # 청산은 쿨다운으로 차단하지 않음 (긴급 탈출 우선). 단 호출한도 오류면 신규매수 대기 등록.
        try:
            req = KisOrderRequest(
                ticker=ticker,
                side="SELL",
                order_type="01",  # 시장가 청산
                price=0,
                quantity=quantity,
            )
            res = await kis_client.send_order(req)
        except Exception as e:
            order_cooldown.register_failure(ticker, "SELL", e)
            raise
        self.high_water_marks.pop(ticker, None)
        return res.order_no

    @staticmethod
    def is_past_exit_time(exit_time: str = "15:20") -> bool:
        """장마감 강제청산 시각(KST HH:MM, 평일) 경과 여부"""
        try:
            now = datetime.now(KST)
            if now.weekday() >= 5:  # 토/일: 정규장 없음
                return False
            eh, em = (int(x) for x in str(exit_time).split(":"))
            return (now.hour * 60 + now.minute) >= (eh * 60 + em)
        except Exception:
            return False

    async def force_exit_all(
        self,
        positions: List[Any],
        strategy_id: str = "daytrading_rotation",
        reason: str = "장마감 강제청산",
    ) -> List[Dict[str, Any]]:
        """당일 보유분 전량 시장가 청산 (오버나잇 방지) + DB 기록"""
        results: List[Dict[str, Any]] = []
        for pos in positions:
            qty = int(getattr(pos, "quantity", 0) or 0)
            ticker = str(getattr(pos, "ticker", "") or "").strip()
            if qty <= 0 or not ticker:
                continue
            try:
                order_no = await self._execute_exit(ticker, qty, reason)
                logger.critical(f"🔔 [EOD EXIT] {ticker} {qty}주 청산 완료 ({reason}, 주문번호: {order_no})")
                results.append({"ticker": ticker, "quantity": qty, "order_no": order_no, "success": True})
                db_sync.record_order({
                    "strategy_id": strategy_id,
                    "source": "AUTO",
                    "ticker": ticker,
                    "ticker_name": getattr(pos, "ticker_name", ticker),
                    "side": "SELL",
                    "order_type": "01",
                    "price": float(getattr(pos, "current_price", 0.0) or 0.0),
                    "quantity": qty,
                    "executed_price": float(getattr(pos, "current_price", 0.0) or 0.0),
                    "executed_quantity": qty,
                    "kis_order_no": order_no,
                    "status": "EXECUTED",
                    "fail_reason": None,
                })
            except Exception as e:
                logger.error(f"[EOD EXIT] Failed to liquidate {ticker}: {e}")
                results.append({"ticker": ticker, "quantity": qty, "success": False, "error": str(e)})
        return results

risk_manager = RiskManager()
