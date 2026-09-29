"""성과 지표: CAGR, 변동성, Sharpe, Sortino, Calmar, MDD, 승률, 손익, PF, turnover 등."""
import numpy as np
import pandas as pd

TRADING_DAYS = 252


def equity_metrics(daily: pd.DataFrame, periods_per_year: int = TRADING_DAYS) -> dict:
    eq = daily["equity"].astype(float).reset_index(drop=True)
    rets = eq.pct_change().fillna(0.0)
    n = len(eq)
    years = max(n / periods_per_year, 1e-9)
    cagr = (eq.iloc[-1] / eq.iloc[0]) ** (1.0 / years) - 1.0 if eq.iloc[0] > 0 else 0.0
    vol = float(rets.std(ddof=0) * np.sqrt(periods_per_year))
    sharpe = float(rets.mean() / rets.std(ddof=0) * np.sqrt(periods_per_year)) if rets.std(ddof=0) > 0 else 0.0
    downside = rets[rets < 0]
    sortino = float(rets.mean() / downside.std(ddof=0) * np.sqrt(periods_per_year)) if len(downside) > 1 and downside.std(ddof=0) > 0 else 0.0
    peak = eq.cummax()
    dd = (eq - peak) / peak
    mdd = float(dd.min())
    calmar = float(cagr / abs(mdd)) if mdd < 0 else 0.0
    return {
        "cagr_pct": cagr * 100.0, "ann_vol_pct": vol * 100.0,
        "sharpe": sharpe, "sortino": sortino, "calmar": calmar,
        "mdd_pct": mdd * 100.0, "end_equity": float(eq.iloc[-1]),
        "total_ret_pct": (float(eq.iloc[-1] / eq.iloc[0]) - 1.0) * 100.0,
    }


def trade_metrics(trades: pd.DataFrame) -> dict:
    if trades.empty:
        return {"n_trades": 0, "win_rate_pct": None, "avg_pnl": 0.0, "avg_win": 0.0,
                "avg_loss": 0.0, "profit_factor": None, "turnover": 0.0}
    pnl = trades["pnl"].astype(float)
    wins = pnl[pnl > 0]
    losses = pnl[pnl <= 0]
    gross_win = float(wins.sum())
    gross_loss = abs(float(losses.sum()))
    notional = float((trades["entry_price"] * trades["qty"]).sum() + (trades["exit_price"] * trades["qty"]).sum())
    return {
        "n_trades": int(len(trades)),
        "win_rate_pct": float(len(wins) / len(trades) * 100.0),
        "avg_pnl": float(pnl.mean()),
        "avg_win": float(wins.mean()) if len(wins) else 0.0,
        "avg_loss": float(losses.mean()) if len(losses) else 0.0,
        "profit_factor": float(gross_win / gross_loss) if gross_loss > 0 else None,
        "turnover_notional": notional,
    }


def monthly_stats(daily: pd.DataFrame) -> pd.DataFrame:
    d = daily.copy()
    d["date"] = pd.to_datetime(d["date"])
    d = d.set_index("date").asfreq("D", method="ffill")
    m = d["equity"].resample("ME").agg(["first", "last"])
    m["ret_pct"] = (m["last"] / m["first"] - 1.0) * 100.0
    m = m.reset_index().rename(columns={"date": "month"})
    return m[["month", "first", "last", "ret_pct"]]
