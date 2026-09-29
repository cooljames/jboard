from typing import List, Dict, Any, Optional
from python_engine.strategy.registry import StrategyRegistry
from python_engine.strategy.base import SignalResult
from python_engine.kis.client import kis_client
from python_engine.kis.models import KisOrderRequest
from python_engine.core.logger import logger
from python_engine.core.db_sync import db_sync
from python_engine.core.order_cooldown import order_cooldown

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

        for strat_id, strategy in list(active_strategies.items()):
            try:
                sig = await strategy.analyze(ticker, market_data)
                if sig and sig.action in ["BUY", "SELL"]:
                    sig.weight = weights.get(strat_id, 0.2)
                    signals.append(sig)
            except Exception as e:
                logger.error(f"[Ensemble] Strategy {strat_id} evaluation failed: {e}")

        return signals

    async def execute_signal(
        self,
        sig: SignalResult,
        total_capital: float = 10000000.0,
        quantity_override: Optional[int] = None,
    ) -> Optional[str]:
        """
        Executes signal by calculating position size from strategy allocation weight and submitting order.
        자금부족·오류 발생 시 즉시 재시도하지 않고 종류별 대기(쿨다운)에 들어간다.
        """
        if sig.target_price <= 0:
            return None

        is_buy = (sig.action or "").upper() == "BUY"

        # 0) 대기중이면 주문 시도 자체를 생략 (실패 로그/DB 폭증 방지)
        if is_buy:
            ok, reason = order_cooldown.can_buy(sig.ticker)
            if not ok:
                logger.info(f"[Ensemble] BUY 대기중, 스킵: {sig.ticker} — {reason}")
                return None
        else:
            ok, reason = order_cooldown.can_sell(sig.ticker)
            if not ok:
                logger.info(f"[Ensemble] SELL 대기중, 스킵: {sig.ticker} — {reason}")
                return None

        quantity: Optional[int] = None
        if quantity_override is not None and quantity_override > 0:
            # 루프가 보유수량 기준으로 확정한 수량 (청산 정량 주문)
            quantity = int(quantity_override)
        elif getattr(sig, "quantity", None):
            # 전략이 지정한 정확한 수량 (추적청산 절반 등) — 최대비중 캡만 적용
            max_w = float(getattr(sig, "max_weight", 0.10) or 0.10)
            cap_qty = int(total_capital * max_w / sig.target_price) if sig.target_price > 0 else 0
            quantity = int(sig.quantity)
            if cap_qty > 0:
                quantity = min(quantity, cap_qty)
        elif float(getattr(sig, "stop_distance", 0.0) or 0.0) > 0:
            # 리스크 기반 사이징: 수량 = 자본*위험비율 / 주당위험거리, 종목 최대비중 캡
            risk_frac = float(getattr(sig, "risk_fraction", 0.0025) or 0.0025)
            max_w = float(getattr(sig, "max_weight", 0.10) or 0.10)
            risk_qty = int(total_capital * risk_frac / float(sig.stop_distance))
            cap_qty = int(total_capital * max_w / sig.target_price) if sig.target_price > 0 else risk_qty
            quantity = max(0, min(risk_qty, cap_qty)) if cap_qty > 0 else risk_qty
            if quantity <= 0:
                detail = (
                    f"리스크사이징 결과 수량 0 "
                    f"(자본 {total_capital:,.0f}원, 위험 {risk_frac*100:.2f}%, 주당거리 {float(sig.stop_distance):,.0f}원)"
                )
                logger.info(f"[Ensemble] Skipped {sig.ticker} {sig.action}: {detail}")
                if is_buy:
                    order_cooldown.register_no_cash(detail)
                return None
        else:
            # 비중/전액 기반 배분 → 아래에서 금액→수량 환산
            use_full = bool(getattr(sig, "use_full_capital", False))
            if use_full:
                # 전액 회전 모드 (데이트레이딩): 전략 비중 무시, 총자본의 capital_pct 투입
                frac = float(getattr(sig, "capital_pct", 1.0) or 1.0)
                frac = max(0.0, min(1.0, frac))
                allocated_capital = total_capital * frac
            else:
                # Allocate capital = Total Capital * Strategy Weight
                allocated_capital = total_capital * sig.weight
            min_amount = float(getattr(sig, "min_order_amount", 0.0) or 0.0)
            # 최소주문금액 검사는 전액모드(명시적 설정)에만 적용. 비중모드는 수량 산정 후 판단.
            if use_full and min_amount > 0 and allocated_capital < min_amount:
                # 매수금 없음 → 소액 주문 남발 대신 대기 등록
                detail = (
                    f"가용 매수금 부족 (가용 {allocated_capital:,.0f}원 < 최소 {min_amount:,.0f}원)"
                    if is_buy else
                    f"주문금액 미달 (가용 {allocated_capital:,.0f}원 < 최소 {min_amount:,.0f}원)"
                )
                logger.info(f"[Ensemble] Skipped {sig.ticker} {sig.action}: {detail}")
                if is_buy:
                    order_cooldown.register_no_cash(detail)
                return None
            quantity = int(allocated_capital / sig.target_price)

        if quantity is None or quantity <= 0:
            # 1주도 못 사는 자금 상태 → 1주 강제주문(먼지주문) 대신 대기
            detail = f"가용 매수금 부족 (1주 매수 불가)"
            logger.info(f"[Ensemble] Skipped {sig.ticker} {sig.action}: {detail}")
            if is_buy:
                order_cooldown.register_no_cash(detail)
            return None

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
            order_cooldown.register_success(sig.ticker)
            # 전략에 체결 수량 통지 (bb_multiregime 부분익절 절반 계산 정확도용)
            try:
                inst = StrategyRegistry.get_active_strategies().get(sig.strategy_id or "")
                note = getattr(inst, "note_fill", None)
                if callable(note):
                    note(sig.ticker, quantity)
            except Exception:
                pass

            # Record in Neon DB
            failure_guidance = ""
            if not order_res.success:
                # KIS 거절(예외 없이 실패 응답)도 대기 정책 적용
                failure_guidance = order_cooldown.register_failure(
                    sig.ticker, sig.action, order_res.message
                )
            db_sync.record_order({
                "strategy_id": sig.strategy_id,
                "source": "AUTO",
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
                "fail_reason": None if order_res.success else (
                    f"{order_res.message} | {failure_guidance}" if failure_guidance
                    else order_res.message
                ),
            })

            return order_res.order_no
        except Exception as e:
            # 오류 종류에 따라 대기 등록 (잔고부족/한도/장마감/인증/연속실패 서킷)
            guidance = order_cooldown.register_failure(sig.ticker, sig.action, e)
            logger.error(f"[Ensemble] Failed to execute order: {e} | {guidance}")
            db_sync.record_order({
                "strategy_id": sig.strategy_id,
                "source": "AUTO",
                "ticker": sig.ticker,
                "ticker_name": sig.ticker_name,
                "side": sig.action,
                "order_type": "00",
                "price": sig.target_price,
                "quantity": quantity,
                "status": "FAILED",
                "fail_reason": f"{e} | {guidance}",
            })
            return None

strategy_ensemble = StrategyEnsemble()
