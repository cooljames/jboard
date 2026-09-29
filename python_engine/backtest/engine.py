"""BB 멀티레짐 포트폴리오 백테스트 엔진.

준수사항:
- 신호(i봉 마감) → 체결(i+1봉 시가) 분리 (지연 실행).
- 지표는 trailing 연산만으로 사전 계산 후 i행까지만 읽음 (구조적 no-lookahead).
- 비용: 수수료(양방향) + 매도 거래세 + 슬리피지 + 스프레드 절반 + 부분체결(참여율 상한, 3봉 carry).
- 리스크: 거래당 0.25%, 종목 10% 캡, 총위험 2%, 상관계수 0.7 합산, 일손실 1.5% 중단.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from python_engine.strategy.indicators import add_all_indicators


@dataclass
class CostModel:
    commission_pct: float = 0.015   # 편도 수수료 %
    tax_pct: float = 0.18           # 매도 거래세 %
    slippage_bps: float = 5.0       # 편도 슬리피지 bps
    spread_bps: float = 0.0         # 편도 스프레드 절반 bps (0이면 봉레인지 프록시 사용)
    participation: float = 0.10     # 봉 거래량 대비 최대 체결 비중
    max_carry_bars: int = 3         # 부분체결 이월 한도


@dataclass
class RiskModel:
    risk_fraction: float = 0.0025  # 거래당 0.25%
    max_weight: float = 0.10       # 종목별 최대 비중
    max_total_risk: float = 0.02   # 총위험 2%
    corr_threshold: float = 0.7    # 상관계수 임계
    corr_window: int = 60
    daily_halt_pct: float = 1.5    # 일손실 중단선


@dataclass
class Trade:
    ticker: str
    side: str  # "LONG" | "SHORT"
    qty: int
    entry_bar: int
    entry_price: float
    stop: float
    target: float
    trail_atr: float
    time_stop: int
    partial: bool
    regime: str
    half_taken: bool = False
    peak: float = 0.0
    trough: float = 0.0
    exit_bar: Optional[int] = None
    exit_price: float = 0.0
    exit_reason: str = ""
    entry_cost: float = 0.0


@dataclass
class PendingOrder:
    ticker: str
    side: str
    qty_total: int
    qty_left: int
    trade: Trade
    bars_waited: int = 0


def _exec_price(open_price: float, side: str, atr_now: float, costs: CostModel,
                high: float, low: float) -> float:
    slip = open_price * costs.slippage_bps / 10000.0
    if costs.spread_bps > 0:
        half_spread = open_price * costs.spread_bps / 10000.0
    else:
        half_spread = max(0.0, (high - low) / 2.0 * 0.1)  # 레인지 프록시의 10%
    return open_price + slip + half_spread if side == "BUY" else open_price - slip - half_spread


def run_backtest(
    bars: Dict[str, pd.DataFrame],
    strategy,
    start_equity: float = 100_000_000.0,
    costs: Optional[CostModel] = None,
    risk: Optional[RiskModel] = None,
    start: Optional[pd.Timestamp] = None,
    end: Optional[pd.Timestamp] = None,
) -> dict:
    costs = costs or CostModel()
    risk = risk or RiskModel()
    data = {k: add_all_indicators(v.copy()) for k, v in bars.items()}
    dates = sorted(set.intersection(*[set(v.index) for v in data.values()]))
    if start:
        dates = [d for d in dates if d >= pd.Timestamp(start)]
    if end:
        dates = [d for d in dates if d <= pd.Timestamp(end)]
    dates = sorted(dates)
    if len(dates) < 30:
        raise ValueError("not enough overlapping bars")

    equity = start_equity
    cash = start_equity
    open_trades: List[Trade] = []
    pending: List[PendingOrder] = []
    closed: List[dict] = []
    daily_rows: List[dict] = []
    realized_day = 0.0
    day_key = None
    halted_day = None
    rets_hist: Dict[str, List[float]] = {k: [] for k in data}

    def open_risk() -> float:
        tot = 0.0
        for tr in open_trades:
            df = data[tr.ticker]
            i = date_idx[tr.ticker]
            atr = float(df["atr14"].iloc[i]) if i < len(df) else 0.0
            stop_d = abs(tr.entry_price - tr.stop)
            tot += tr.qty * (stop_d if stop_d > 0 else atr * 2.0)
        return tot / equity if equity > 0 else 0.0

    date_idx: Dict[str, int] = {}
    n = len(dates)
    for di in range(n):
        d = dates[di]
        if day_key != d.date():
            day_key = d.date()
            realized_day = 0.0
            halted_day = None
        for k in data:
            df = data[k]
            loc = df.index.get_loc(d)
            date_idx[k] = int(loc) if isinstance(loc, (int, np.integer)) else int(loc.stop - 1) if hasattr(loc, "stop") else 0
            if date_idx[k] > 0:
                c0, c1 = float(df["close"].iloc[date_idx[k] - 1]), float(df["close"].iloc[date_idx[k]])
                rets_hist[k].append(np.log(c1 / c0) if c0 > 0 and c1 > 0 else 0.0)

        # 1) 부분체결 잔량 처리 (i+1봉 시가 아님: 당일 봉 시가에 carry 체결)
        for po in list(pending):
            df = data[po.ticker]
            i = date_idx[po.ticker]
            if i <= 0 or i >= len(df) - 0:
                continue
            row = df.iloc[i]
            fill = min(po.qty_left, int(float(row["volume"]) * costs.participation))
            if fill > 0:
                px = _exec_price(float(row["open"]), po.side, float(row["atr14"] or 0),
                                 costs, float(row["high"]), float(row["low"]))
                po.qty_left -= fill
                po.trade.qty += fill
                fee = px * fill * costs.commission_pct / 100.0
                cash -= (px * fill + fee) if po.side == "BUY" else 0
                if po.side == "BUY":
                    cash -= 0
                else:
                    cash += px * fill - fee
                po.trade.entry_cost += fee
                po.trade.entry_price = (
                    (po.trade.entry_price * (po.trade.qty - fill) + px * fill) / po.trade.qty
                    if po.trade.qty else px
                )
            po.bars_waited += 1
            if po.qty_left <= 0 or po.bars_waited > costs.max_carry_bars:
                if po.trade.qty > 0:
                    open_trades.append(po.trade)
                pending.remove(po)

        # 2) 보유 청산 평가 (당일 봉 고저 기준)
        for tr in list(open_trades):
            df = data[tr.ticker]
            i = date_idx[tr.ticker]
            if i <= 0:
                continue
            row = df.iloc[i]
            high, low, close = float(row["high"]), float(row["low"]), float(row["close"])
            atr = float(row["atr14"]) if pd.notna(row["atr14"]) and row["atr14"] > 0 else 0.0

            def close_out(qty: int, px: float, reason: str):
                nonlocal cash, realized_day
                side = "SELL" if tr.side == "LONG" else "BUY"
                fee = px * qty * costs.commission_pct / 100.0
                tax = px * qty * costs.tax_pct / 100.0 if side == "SELL" else 0.0
                if tr.side == "LONG":
                    pnl = (px - tr.entry_price) * qty - fee - tax - tr.entry_cost * (qty / tr.qty if tr.qty else 1)
                    cash += px * qty - fee - tax
                else:
                    pnl = (tr.entry_price - px) * qty - fee - tax - tr.entry_cost * (qty / tr.qty if tr.qty else 1)
                    cash -= px * qty + fee + tax
                realized_day += pnl
                closed.append({
                    "ticker": tr.ticker, "side": tr.side, "qty": qty,
                    "entry_bar": dates[tr.entry_bar] if tr.entry_bar < len(dates) else d,
                    "exit_bar": d, "entry_price": tr.entry_price, "exit_price": px,
                    "reason": reason, "regime": tr.regime, "pnl": pnl,
                    "ret_pct": pnl / (tr.entry_price * qty) * 100.0 if tr.entry_price * qty else 0.0,
                })
                tr.qty -= qty
                if tr.qty <= 0 and tr in open_trades:
                    open_trades.remove(tr)

            if tr.side == "LONG":
                tr.peak = max(tr.peak or tr.entry_price, high)
                if tr.partial and not tr.half_taken and tr.target > 0 and high >= tr.target:
                    tr.half_taken = True
                    tr.stop = max(tr.stop, tr.entry_price)
                    close_out(max(1, tr.qty // 2), tr.target, "TP1_HALF")
                    continue
                if tr.trail_atr > 0 and atr > 0 and tr.peak > tr.entry_price:
                    tr.stop = max(tr.stop, tr.peak - tr.trail_atr * atr)
                if low <= tr.stop:
                    close_out(tr.qty, tr.stop, "STOP")
                    continue
                if tr.target > 0 and not tr.partial and high >= tr.target:
                    close_out(tr.qty, tr.target, "TARGET")
                    continue
                if tr.time_stop > 0 and (di - tr.entry_bar) >= tr.time_stop:
                    close_out(tr.qty, close, "TIME")
                    continue
            else:
                tr.trough = min(tr.trough or tr.entry_price, low)
                if tr.trail_atr > 0 and atr > 0 and tr.trough < tr.entry_price:
                    tr.stop = min(tr.stop, tr.trough + tr.trail_atr * atr)
                if high >= tr.stop:
                    close_out(tr.qty, tr.stop, "STOP")
                    continue
                if tr.target > 0 and low <= tr.target:
                    close_out(tr.qty, tr.target, "TARGET")
                    continue
                if tr.time_stop > 0 and (di - tr.entry_bar) >= tr.time_stop:
                    close_out(tr.qty, close, "TIME")
                    continue

        # 3) 신규 진입 (다음 봉 시가 예약 → pending)
        if di >= n - 1:
            pass
        else:
            day_pnl_pct = (realized_day + _unrealized(open_trades, data, date_idx)) / equity * 100.0 if equity else 0.0
            halted = day_pnl_pct <= -risk.daily_halt_pct
            if not halted and open_risk() < risk.max_total_risk:
                for k in data:
                    df = data[k]
                    i = date_idx[k]
                    if i < 220 or i >= len(df) - 1:
                        continue
                    if any(po.ticker == k for po in pending) or any(t.ticker == k for t in open_trades):
                        continue
                    sig = _strategy_signal(strategy, df, i, k)
                    if sig is None:
                        continue
                    entry_est = float(df["open"].iloc[i + 1])
                    stop_d = abs(entry_est - sig["stop"])
                    if stop_d <= 0:
                        continue
                    qty = int(equity * risk.risk_fraction / stop_d)
                    qty = min(qty, int(equity * risk.max_weight / entry_est) if entry_est > 0 else qty)
                    if qty <= 0:
                        continue
                    # 상관 0.7 합산: 기존 보유와 합산 위험이 2% 초과면 스킵
                    if _corr_blocked(k, qty * stop_d / equity if equity else 0, open_trades, data, rets_hist, risk, equity):
                        continue
                    if (open_risk() + qty * stop_d / equity) > risk.max_total_risk:
                        continue
                    tr = Trade(ticker=k, side=sig["side"], qty=0, entry_bar=di + 1,
                               entry_price=entry_est, stop=sig["stop"], target=sig["target"],
                               trail_atr=sig["trail"], time_stop=sig["time_stop"],
                               partial=sig["partial"], regime=sig["regime"],
                               peak=entry_est, trough=entry_est)
                    pending.append(PendingOrder(ticker=k, side="BUY" if sig["side"] == "LONG" else "SELL",
                                                qty_total=qty, qty_left=qty, trade=tr))

        # 일말 평가
        mtm = _unrealized(open_trades, data, date_idx)
        equity = cash + sum(
            (float(data[t.ticker]["close"].iloc[date_idx[t.ticker]]) * t.qty)
            if t.side == "LONG" else
            (2 * t.entry_price * t.qty - float(data[t.ticker]["close"].iloc[date_idx[t.ticker]]) * t.qty)
            for t in open_trades
        )
        daily_rows.append({"date": d, "equity": equity, "cash": cash, "mtm": mtm,
                           "n_open": len(open_trades), "realized_day": realized_day})

    return {
        "start_equity": start_equity, "end_equity": equity,
        "trades": closed, "daily": daily_rows,
        "dates": dates,
    }


def _unrealized(open_trades, data, date_idx) -> float:
    tot = 0.0
    for tr in open_trades:
        df = data[tr.ticker]
        i = date_idx.get(tr.ticker, 0)
        if i <= 0 or i >= len(df):
            continue
        c = float(df["close"].iloc[i])
        tot += (c - tr.entry_price) * tr.qty if tr.side == "LONG" else (tr.entry_price - c) * tr.qty
    return tot


def _corr_blocked(ticker, new_risk_frac, open_trades, data, rets_hist, risk, equity) -> bool:
    if not open_trades or len(rets_hist.get(ticker, [])) < risk.corr_window:
        return False
    try:
        mine = np.array(rets_hist[ticker][-risk.corr_window:])
        agg = 0.0
        for tr in open_trades:
            his = rets_hist.get(tr.ticker, [])
            if len(his) < risk.corr_window:
                continue
            other = np.array(his[-risk.corr_window:])
            if np.std(mine) == 0 or np.std(other) == 0:
                continue
            corr = float(np.corrcoef(mine, other)[0, 1])
            if abs(corr) >= risk.corr_threshold:
                df = data[tr.ticker]
                atr = 0.0
                stop_d = abs(tr.entry_price - tr.stop)
                agg += tr.qty * (stop_d if stop_d > 0 else atr)
        return (agg + new_risk_frac * equity) / equity > risk.max_total_risk if equity else False
    except Exception:
        return False


def _strategy_signal(strategy, df: pd.DataFrame, i: int, ticker: str) -> Optional[dict]:
    """i봉 마감 기준 신호 산출 (i행까지만 읽음). 실전 _regime/_mr/_trend/_breakout 로직 재사용."""
    row_ok = all(pd.notna(df[c].iloc[i]) for c in
                 ("bb_mid", "bb_up", "bb_low", "adx14", "atr14", "rsi2", "rsi14",
                  "vol_sma20", "bbb", "bbb_pct20", "ema20", "ema50", "ema200",
                  "close", "high", "low", "volume", "open"))
    if not row_ok:
        return None
    regime = strategy._regime(df, i)
    if regime == "NoTrade" or not strategy._spread_ok(df, i):
        return None
    atr = float(df["atr14"].iloc[i])
    p = strategy.params
    if regime == "MeanReversion":
        c_prev, c_now = float(df["close"].iloc[i - 1]), float(df["close"].iloc[i])
        if c_prev < float(df["bb_low"].iloc[i - 1]) and c_now > float(df["bb_low"].iloc[i]) and \
                (float(df["rsi2"].iloc[i]) < 10 or float(df["rsi14"].iloc[i]) < 35):
            return {"side": "LONG", "stop": c_now - float(p["mr_stop_atr"]) * atr,
                    "target": float(df["bb_mid"].iloc[i]), "trail": 0.0,
                    "time_stop": int(p["mr_time_stop_bars"]), "partial": False, "regime": regime}
        if c_prev > float(df["bb_up"].iloc[i - 1]) and c_now < float(df["bb_up"].iloc[i]) and \
                (float(df["rsi2"].iloc[i]) > 90 or float(df["rsi14"].iloc[i]) > 65):
            return {"side": "SHORT", "stop": c_now + float(p["mr_stop_atr"]) * atr,
                    "target": float(df["bb_mid"].iloc[i]), "trail": 0.0,
                    "time_stop": int(p["mr_time_stop_bars"]), "partial": False, "regime": regime}
    elif regime in ("TrendUp", "TrendDown"):
        close = float(df["close"].iloc[i])
        ema20 = float(df["ema20"].iloc[i])
        mid = float(df["bb_mid"].iloc[i])
        vol = float(df["volume"].iloc[i])
        vol_prev = float(df["volume"].iloc[i - 1])
        if regime == "TrendUp":
            low = float(df["low"].iloc[i])
            if (low <= mid * 1.005 or abs(close - mid) / mid < 0.01) and vol < vol_prev and \
                    (close > ema20 or close > float(df["high"].iloc[i - 1])):
                return {"side": "LONG", "stop": close - float(p["trend_stop_atr"]) * atr,
                        "target": 0.0, "trail": float(p["trend_trail_atr"]),
                        "time_stop": 0, "partial": False, "regime": regime}
        else:
            high_prev = float(df["high"].iloc[i - 1])
            if (high_prev >= mid * 0.995 or abs(close - mid) / mid < 0.01) and vol < vol_prev and \
                    (close < ema20 or close < float(df["low"].iloc[i - 1])):
                return {"side": "SHORT", "stop": close + float(p["trend_stop_atr"]) * atr,
                        "target": 0.0, "trail": float(p["trend_trail_atr"]),
                        "time_stop": 0, "partial": False, "regime": regime}
    elif regime == "Breakout":
        close = float(df["close"].iloc[i])
        up = float(df["bb_up"].iloc[i])
        mid = float(df["bb_mid"].iloc[i])
        if close > up and (close - up) > float(p["bo_min_width_atr"]) * atr:
            entry = close
            stop = max(mid, entry - float(p["bo_stop_atr"]) * atr)
            return {"side": "LONG", "stop": stop,
                    "target": entry + float(p["bo_tp1_atr"]) * atr,
                    "trail": float(p["bo_trail_atr"]),
                    "time_stop": 0, "partial": True, "regime": regime}
    return None
