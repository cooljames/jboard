"""기술적 지표 라이브러리 (멀티레짐 BB 전략 공용).

원칙: 모든 지표는 trailing 연산만 사용 — 미래 데이터 누수 없음.
입력 df: datetime 오름차순 인덱스, columns = open, high, low, close, volume.
"""
import numpy as np
import pandas as pd

BB_PERIOD = 20
BB_MULT = 2.0


def sma(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=n).mean()


def ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=n, adjust=False, min_periods=n).mean()


def rolling_std(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=n).std(ddof=0)


def bollinger(close: pd.Series, period: int = BB_PERIOD, mult: float = BB_MULT):
    mid = sma(close, period)
    sd = rolling_std(close, period)
    upper = mid + mult * sd
    lower = mid - mult * sd
    return mid, upper, lower


def bbp(close: pd.Series, upper: pd.Series, lower: pd.Series) -> pd.Series:
    width = (upper - lower).replace(0, np.nan)
    return (close - lower) / width


def bbb(upper: pd.Series, lower: pd.Series, mid: pd.Series) -> pd.Series:
    return (upper - lower) / mid.replace(0, np.nan)


def rsi_wilder(close: pd.Series, period: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100.0 - (100.0 / (1.0 + rs))
    # 무변동 구간: avg_loss==0 & avg_gain==0 → 50, 상승만 → 100
    flat = (avg_gain == 0) & (avg_loss == 0)
    out = out.mask(flat, 50.0)
    return out


def atr_wilder(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    prev_close = close.shift(1)
    tr = pd.concat([
        (high - low),
        (high - prev_close).abs(),
        (low - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()


def adx_wilder(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = pd.Series(np.where((up_move > down_move) & (up_move > 0), up_move, 0.0), index=high.index)
    minus_dm = pd.Series(np.where((down_move > up_move) & (down_move > 0), down_move, 0.0), index=high.index)
    prev_close = close.shift(1)
    tr = pd.concat([
        (high - low),
        (high - prev_close).abs(),
        (low - prev_close).abs(),
    ], axis=1).max(axis=1)
    atr_s = tr.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()
    plus_di = 100.0 * plus_dm.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean() / atr_s.replace(0, np.nan)
    minus_di = 100.0 * minus_dm.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean() / atr_s.replace(0, np.nan)
    dx = 100.0 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    return dx.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()


def rolling_volatility(close: pd.Series, period: int = 20) -> pd.Series:
    logret = np.log(close / close.shift(1))
    return logret.rolling(period, min_periods=period).std(ddof=0)


def rolling_percentile(s: pd.Series, window: int) -> pd.Series:
    """trailing window 내 마지막 값의 백분위 (0~1). 미래 미사용."""
    def _pct_rank(w):
        w = pd.Series(w)
        if w.isna().any():
            return np.nan
        return w.rank(pct=True).iloc[-1]
    return s.rolling(window, min_periods=window).apply(_pct_rank, raw=False)


def add_all_indicators(df: pd.DataFrame, bb_period: int = BB_PERIOD, bb_mult: float = BB_MULT) -> pd.DataFrame:
    """지표 컬럼 일괄 추가. NaN 앞구간은 전략에서 warmup으로 제외."""
    out = df.copy()
    close, high, low, volume = out["close"], out["high"], out["low"], out["volume"]
    mid, upper, lower = bollinger(close, bb_period, bb_mult)
    out["bb_mid"] = mid
    out["bb_up"] = upper
    out["bb_low"] = lower
    out["bbp"] = bbp(close, upper, lower)
    out["bbb"] = bbb(upper, lower, mid)
    out["ema20"] = ema(close, 20)
    out["ema50"] = ema(close, 50)
    out["ema200"] = ema(close, 200)
    out["adx14"] = adx_wilder(high, low, close, 14)
    out["atr14"] = atr_wilder(high, low, close, 14)
    out["rsi2"] = rsi_wilder(close, 2)
    out["rsi14"] = rsi_wilder(close, 14)
    out["vol_sma20"] = sma(volume, 20)
    out["roll_vol20"] = rolling_volatility(close, 20)
    out["bbb_pct20"] = rolling_percentile(out["bbb"], 20)
    return out


INDICATOR_COLS = [
    "bb_mid", "bb_up", "bb_low", "bbp", "bbb",
    "ema20", "ema50", "ema200", "adx14", "atr14",
    "rsi2", "rsi14", "vol_sma20", "roll_vol20", "bbb_pct20",
]
