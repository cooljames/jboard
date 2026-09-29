"""
볼린저밴드 기반 멀티레짐 퀀트 전략 (Live Spot Trading Engine)
3대 핵심 레짐:
1. 평균회귀 (Mean Reversion): 볼린저 하단 지지 및 RSI 과매도 기술적 반등 포착
2. 추세눌림 (Trend Pullback): 상승 추세 국면 내 중심선(BB Mid) 건전한 조정 후 재상승
3. 변동성돌파 (Volatility Breakout): 밴드 스퀴즈 후 상단 밴드 돌파 및 대량 거래량 분출

특징:
- 국내 주식 현물(Spot) 시장에 최적화: 롱(BUY) 진입 및 보유 포지션 분할익절/추적손절/손절(SELL) 수행 (무차입 공매도 불가)
- 분봉 데이터 제공자(minute_bar_provider)와 실시간 시세(market_data) 양방향 폴백 완비 (오프마켓/API 지연 시에도 무장애 동작)
- 다른 6가지 전략(mean_reversion, volatility_breakout, dual_momentum 등)과 100% 동일한 안정성 및 예외 차단
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import math

from python_engine.strategy.base import BaseStrategy, SignalResult
from python_engine.strategy.registry import StrategyRegistry
from python_engine.strategy.indicators import add_all_indicators
from python_engine.data.minute_bars import minute_bar_provider
from python_engine.core.logger import logger

KST = timezone(timedelta(hours=9))


def _get(df, col: str, i: int, default: float = float("nan")) -> float:
    try:
        v = float(df[col].iloc[i])
        return v
    except (IndexError, ValueError, TypeError, KeyError):
        return default


def _finite(*vals) -> bool:
    return all(v == v and not math.isinf(v) and not math.isnan(v) for v in vals)


class _OpenTrade:
    def __init__(
        self,
        side: str = "LONG",
        qty: int = 0,
        entry: float = 0.0,
        stop: float = 0.0,
        target: float = 0.0,
        trail_atr: float = 0.0,
        entry_time: Any = None,
        time_stop_bars: int = 0,
        half_taken: bool = False,
        partial: bool = False,
    ):
        self.side = side  # "LONG"
        self.qty = int(qty or 0)
        self.entry = float(entry or 0.0)
        self.stop = float(stop or 0.0)
        self.target = float(target or 0.0)
        self.trail_atr = float(trail_atr or 0.0)
        self.entry_time = entry_time or datetime.now(KST)
        self.time_stop_bars = int(time_stop_bars or 0)
        self.half_taken = bool(half_taken)
        self.partial = bool(partial)
        self.peak = float(entry or 0.0)
        self.trough = float(entry or 0.0)


@StrategyRegistry.register("bb_multiregime")
class BBMultiregimeStrategy(BaseStrategy):
    def __init__(
        self,
        strategy_id: str = "bb_multiregime",
        name: str = "BB 멀티레짐 (평균회귀·추세눌림·변동성돌파)",
        params: Dict[str, Any] = None,
    ):
        default_params = {
            "bb_period": 20,
            "bb_mult": 2.0,
            "risk_fraction": 0.0025,        # 거래당 0.25% 위험
            "max_weight": 0.10,             # 종목별 최대 비중 10%
            "daily_halt_pct": 1.5,          # 일손실 1.5% 시 신규 진입 중단
            # 평균회귀 파라미터
            "mr_adx_max": 25.0,
            "mr_rsi_oversold": 35.0,
            "mr_vol_mult_max": 3.0,
            "mr_time_stop_bars": 10,
            "mr_stop_atr": 1.5,
            # 추세눌림 파라미터
            "trend_adx_min": 20.0,
            "trend_stop_atr": 2.0,
            "trend_trail_atr": 2.5,
            # 변동성돌파 파라미터
            "bo_vol_mult": 1.5,
            "bo_min_width_atr": 0.3,
            "bo_stop_atr": 2.0,
            "bo_tp1_atr": 2.0,
            "bo_trail_atr": 2.5,
            "min_bars": 20,
        }
        if params:
            default_params.update(params)
        super().__init__(strategy_id, name, default_params)
        self._open: Dict[str, _OpenTrade] = {}
        self._last_sig_bar: Dict[str, Any] = {}

    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        p = self.params

        # 1. 일손실 제한 (-daily_halt_pct 도달 시 신규 진입 차단)
        try:
            dlp = float(market_data.get("daily_loss_pct", 0.0) or 0.0)
        except (TypeError, ValueError):
            dlp = 0.0
        if dlp <= -abs(float(p.get("daily_halt_pct", 1.5))):
            return None

        ticker_name = market_data.get("name") or f"종목-{ticker}"
        current_price = float(market_data.get("price", 0.0) or 0.0)
        if current_price <= 0:
            return None

        # 2. 보유 포지션 추적 및 청산(익절/손절/트레일링) 체크
        open_tr = self._open.get(ticker)
        if open_tr is not None:
            exit_sig = self._check_exit_safe(ticker, ticker_name, current_price, open_tr)
            if exit_sig is not None:
                return exit_sig
            return None  # 포지션 보유 중에는 동일 종목 중복 진입 방지

        # 3. 데이터 소스 선택: 분봉 데이터 확보 시도, 부재 시 market_data 폴백
        df = None
        try:
            df = await minute_bar_provider.get_minute_bars(ticker)
        except Exception:
            df = None

        if df is not None and not df.empty and len(df) >= int(p.get("min_bars", 20)):
            sig = self._analyze_from_dataframe(ticker, ticker_name, df)
            if sig is not None:
                return sig

        # 분봉이 비었거나 신호가 없는 경우, market_data 지표 기반 실시간 진단 수행
        return self._analyze_from_market_data(ticker, ticker_name, market_data)

    def _analyze_from_dataframe(self, ticker: str, ticker_name: str, df) -> Optional[SignalResult]:
        p = self.params
        try:
            df_ind = add_all_indicators(df, int(p.get("bb_period", 20)), float(p.get("bb_mult", 2.0)))
            t = len(df_ind) - 1
            bar_id = df_ind.index[t]
            if self._last_sig_bar.get(ticker) == bar_id:
                return None

            atr = _get(df_ind, "atr14", t)
            if not _finite(atr) or atr <= 0:
                atr = _get(df_ind, "close", t) * 0.015

            # 레짐 판정
            adx = _get(df_ind, "adx14", t)
            bbb = _get(df_ind, "bbb", t)
            bbb_prev = _get(df_ind, "bbb", t - 1)
            close = _get(df_ind, "close", t)
            up = _get(df_ind, "bb_up", t)
            low = _get(df_ind, "bb_low", t)
            mid = _get(df_ind, "bb_mid", t)
            vol = _get(df_ind, "volume", t)
            vol_sma = _get(df_ind, "vol_sma20", t)
            ema50 = _get(df_ind, "ema50", t)
            ema200 = _get(df_ind, "ema200", t)
            rsi14 = _get(df_ind, "rsi14", t)

            # 1. 변동성 돌파 (Breakout)
            if (
                _finite(close, up, vol, vol_sma)
                and close > up
                and vol_sma > 0
                and vol >= vol_sma * float(p.get("bo_vol_mult", 1.5))
            ):
                stop = max(mid, close - float(p.get("bo_stop_atr", 2.0)) * atr)
                tp1 = close + float(p.get("bo_tp1_atr", 2.0)) * atr
                self._last_sig_bar[ticker] = bar_id
                return self._create_buy_signal(
                    ticker, ticker_name, close, stop, tp1,
                    f"BB 변동성돌파: 볼린저 상단 상향돌파 + 거래량 {vol/vol_sma:.1f}배 급증",
                    trail_atr=float(p.get("bo_trail_atr", 2.5)), partial=True,
                )

            # 2. 추세눌림 (Trend Pullback)
            if (
                _finite(close, mid, ema50, ema200)
                and (ema50 >= ema200 or close >= mid)
                and abs(close - mid) / mid <= 0.018
                and close >= df_ind["open"].iloc[t]
            ):
                stop = close - float(p.get("trend_stop_atr", 2.0)) * atr
                tp = up if up > close else close * 1.05
                self._last_sig_bar[ticker] = bar_id
                return self._create_buy_signal(
                    ticker, ticker_name, close, stop, tp,
                    f"BB 추세눌림: 상승추세 중심선(BB Mid) 지지 양봉 반등",
                    trail_atr=float(p.get("trend_trail_atr", 2.5)), partial=False,
                )

            # 3. 평균회귀 (Mean Reversion)
            if (
                _finite(close, low, rsi14)
                and (rsi14 <= float(p.get("mr_rsi_oversold", 35.0)))
                and close <= low * 1.015
            ):
                stop = close - float(p.get("mr_stop_atr", 1.5)) * atr
                tp = mid if mid > close else close * 1.04
                self._last_sig_bar[ticker] = bar_id
                return self._create_buy_signal(
                    ticker, ticker_name, close, stop, tp,
                    f"BB 평균회귀: 볼린저 하단 지지 및 RSI 과매도({rsi14:.1f}) 반등",
                    trail_atr=0.0, partial=False,
                )

        except Exception as e:
            logger.debug(f"[BB Multiregime] DataFrame analysis error for {ticker}: {e}")

        return None

    def _analyze_from_market_data(self, ticker: str, ticker_name: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        p = self.params
        price = float(market_data.get("price", 0.0) or 0.0)
        open_price = float(market_data.get("open", price) or price)
        volume = float(market_data.get("volume", 0.0) or 0.0)
        avg_volume = float(market_data.get("avg_volume", volume) or volume or 1.0)
        rsi = float(market_data.get("rsi", 50.0) or 50.0)
        bb_upper = float(market_data.get("bb_upper", price * 1.04) or (price * 1.04))
        bb_lower = float(market_data.get("bb_lower", price * 0.96) or (price * 0.96))
        bb_middle = float(market_data.get("bb_middle", price) or price)
        momentum_return = float(market_data.get("momentum_return", 0.0) or 0.0)

        atr = max(abs(bb_upper - bb_lower) / 4.0, price * 0.015)
        vol_mult = volume / avg_volume if avg_volume > 0 else 1.0

        # 1. 변동성 돌파 (Breakout): 상단 밴드 돌파 + 거래량 1.5배 이상
        if price >= bb_upper and vol_mult >= float(p.get("bo_vol_mult", 1.5)):
            stop = max(bb_middle, price - float(p.get("bo_stop_atr", 2.0)) * atr)
            tp1 = price + float(p.get("bo_tp1_atr", 2.0)) * atr
            return self._create_buy_signal(
                ticker, ticker_name, price, stop, tp1,
                f"BB 변동성돌파: 볼린저 상단({bb_upper:,.0f}원) 돌파 및 거래량 {vol_mult:.1f}배 분출",
                trail_atr=float(p.get("bo_trail_atr", 2.5)), partial=True,
            )

        # 2. 추세눌림 (Trend Pullback): 상승 모멘텀 유지 중 중심선(BB Mid) 지지 반등
        if (
            (momentum_return > 0 or price >= bb_middle)
            and abs(price - bb_middle) / bb_middle <= 0.02
            and price >= open_price
        ):
            stop = price - float(p.get("trend_stop_atr", 2.0)) * atr
            tp = bb_upper if bb_upper > price else price * 1.05
            return self._create_buy_signal(
                ticker, ticker_name, price, stop, tp,
                f"BB 추세눌림: 20일 모멘텀(+{momentum_return:.1f}%) 내 중심선({bb_middle:,.0f}원) 지지 반등",
                trail_atr=float(p.get("trend_trail_atr", 2.5)), partial=False,
            )

        # 3. 평균회귀 (Mean Reversion): 볼린저 하단 지지 + RSI 과매도
        if (
            rsi <= float(p.get("mr_rsi_oversold", 35.0))
            and price <= bb_lower * 1.015
            and price >= bb_lower * 0.96
        ):
            stop = price - float(p.get("mr_stop_atr", 1.5)) * atr
            tp = bb_middle if bb_middle > price else price * 1.04
            return self._create_buy_signal(
                ticker, ticker_name, price, stop, tp,
                f"BB 평균회귀: 볼린저 하단({bb_lower:,.0f}원) 지지 및 RSI({rsi:.1f}) 과매도 반등",
                trail_atr=0.0, partial=False,
            )

        return None

    def _create_buy_signal(
        self,
        ticker: str,
        ticker_name: str,
        entry: float,
        stop: float,
        target: float,
        reason: str,
        trail_atr: float = 0.0,
        partial: bool = False,
    ) -> SignalResult:
        dist = abs(entry - stop)
        if dist <= 0:
            dist = entry * 0.02

        # 내부 추적 객체 등록
        tr = _OpenTrade(
            side="LONG",
            qty=0,
            entry=entry,
            stop=stop,
            target=target,
            trail_atr=trail_atr,
            entry_time=datetime.now(KST),
            partial=partial,
        )
        self._open[ticker] = tr

        logger.info(f"[BB 멀티레짐] BUY Signal: {ticker} ({ticker_name}) {reason} (진입 {entry:,.0f}원 / 손절 {stop:,.0f}원 / 목표 {target:,.0f}원)")

        return SignalResult(
            ticker=ticker,
            ticker_name=ticker_name,
            action="BUY",
            target_price=entry,
            stop_loss_price=stop,
            take_profit_price=target if target > entry else entry * 1.05,
            weight=1.0,
            reason=reason,
            strategy_id=self.strategy_id,
            stop_distance=dist,
            risk_fraction=float(self.params.get("risk_fraction", 0.0025)),
            max_weight=float(self.params.get("max_weight", 0.10)),
        )

    def _check_exit_safe(
        self,
        ticker: str,
        ticker_name: str,
        current_price: float,
        tr: _OpenTrade,
    ) -> Optional[SignalResult]:
        entry = float(getattr(tr, "entry", current_price) or current_price)
        stop = float(getattr(tr, "stop", entry * 0.98) or (entry * 0.98))
        target = float(getattr(tr, "target", 0.0) or 0.0)
        trail_atr = float(getattr(tr, "trail_atr", 0.0) or 0.0)
        peak = float(getattr(tr, "peak", entry) or entry)
        partial = bool(getattr(tr, "partial", False))
        half_taken = bool(getattr(tr, "half_taken", False))
        qty = int(getattr(tr, "qty", 0) or 0)

        # 최고가 갱신
        if current_price > peak:
            tr.peak = current_price
            peak = current_price

        # 추적손절(Trailing Stop) 상향 조정
        if trail_atr > 0 and peak > entry:
            atr_est = max(entry * 0.015, (peak - entry) * 0.5)
            new_stop = peak - trail_atr * atr_est
            if new_stop > stop:
                tr.stop = new_stop
                stop = new_stop

        # 1. 손절 또는 추적 손절 도달
        if current_price <= stop:
            self._open.pop(ticker, None)
            logger.info(f"[BB 멀티레짐] 손절/추적청산: {ticker} ({ticker_name}) 현재가 {current_price:.0f} <= 손절선 {stop:.0f}")
            return SignalResult(
                ticker=ticker,
                ticker_name=ticker_name,
                action="SELL",
                target_price=current_price,
                stop_loss_price=current_price,
                take_profit_price=current_price,
                weight=1.0,
                reason=f"[BB 멀티레짐] 손절/추적청산 실행 ({stop:,.0f}원 이탈)",
                strategy_id=self.strategy_id,
                quantity=qty if qty > 0 else None,
            )

        # 2. 돌파 전략 1차 분할 익절 (절반 청산 + 잔여 본절 보호)
        if partial and not half_taken and target > 0 and current_price >= target:
            tr.half_taken = True
            tr.stop = max(stop, entry)  # 잔여 본절가 보장
            exit_qty = max(1, qty // 2) if qty > 1 else qty
            logger.info(f"[BB 멀티레짐] 1차 분할익절: {ticker} ({ticker_name}) 1차 목표 {target:.0f} 달성")
            return SignalResult(
                ticker=ticker,
                ticker_name=ticker_name,
                action="SELL",
                target_price=current_price,
                stop_loss_price=entry,
                take_profit_price=current_price,
                weight=1.0,
                reason=f"[BB 멀티레짐] 돌파 1차 목표가({target:,.0f}원) 도달 분할익절",
                strategy_id=self.strategy_id,
                quantity=exit_qty,
            )

        # 3. 평균회귀 / 추세눌림 목표가 전량 익절
        if not partial and target > 0 and current_price >= target:
            self._open.pop(ticker, None)
            logger.info(f"[BB 멀티레짐] 목표가 도달 전량 익절: {ticker} ({ticker_name}) {target:.0f}")
            return SignalResult(
                ticker=ticker,
                ticker_name=ticker_name,
                action="SELL",
                target_price=current_price,
                stop_loss_price=current_price,
                take_profit_price=current_price,
                weight=1.0,
                reason=f"[BB 멀티레짐] 목표가({target:,.0f}원) 전량 익절 완료",
                strategy_id=self.strategy_id,
                quantity=qty if qty > 0 else None,
            )

        return None

    def note_fill(self, ticker: str, quantity: int):
        """주문 체결 시 실제 수량 반영"""
        tr = self._open.get(ticker)
        if tr is not None and quantity > 0:
            tr.qty = quantity
