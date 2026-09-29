"""BB 멀티레짐 백테스트 러너.

사용:
    py -m python_engine.backtest.runner --tickers 005930,000660 --days 365
    py -m python_engine.backtest.runner --tickers 005930 --days 365 --timeframe minute --csv prices_005930.csv

출력: backtest_results/<strategy>_<ts>/
  trades.csv, daily.csv, monthly.csv, equity.png, drawdown.png,
  regime.csv, symbol.csv, cost_sensitivity.csv, param_stability.csv,
  wf_compare.json, leakcheck.json, summary.json, SUMMARY.md
"""
import argparse
import itertools
import json
import os
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from python_engine.backtest.engine import run_backtest, CostModel, RiskModel
from python_engine.backtest.metrics import equity_metrics, trade_metrics, monthly_stats
from python_engine.strategy.catalog.bb_multiregime import BBMultiregimeStrategy

OUT_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "backtest_results")


def load_daily(ticker: str, days: int) -> pd.DataFrame:
    import FinanceDataReader as fdr
    end = datetime.now()
    start = end - timedelta(days=int(days * 1.6))
    df = fdr.DataReader(ticker, start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
    df = df.rename(columns={"Open": "open", "High": "high", "Low": "low", "Close": "close", "Volume": "volume"})
    return df[["open", "high", "low", "close", "volume"]].dropna().tail(days)


def synth_minutes(daily: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """일봉 → 합성 분봉 (Brownian bridge, 일봉 O/H/L/C 구속).
    실전 분봉 로직의 기계적 검증용. 성과는 'SYNTHETIC'으로 명시."""
    rng = np.random.default_rng(seed)
    recs = []
    for dt, row in daily.iterrows():
        o = float(row["open"]); h = float(row["high"]); l = float(row["low"])
        c = float(row["close"]); v = float(row["volume"])
        n = 390
        t = np.linspace(0, 1, n + 1)
        w = rng.normal(0, 1, n + 1)
        w = w - np.linspace(w[0], w[-1], n + 1)
        line = o + (c - o) * t
        pos = w.max() or 1.0
        neg = abs(w.min()) or 1.0
        room_up = max(h - max(o, c), (h - l) * 0.05)
        room_dn = max(min(o, c) - l, (h - l) * 0.05)
        scale = min(room_up / pos, room_dn / neg) * 0.9
        pts = np.clip(line + w * scale, l, h)
        pts[0], pts[-1] = o, c
        u = 0.6 + 0.8 * np.abs(t[:-1] - 0.5)
        vols = v * u / u.sum() * rng.uniform(0.9, 1.1, n)
        tick = max((h - l) * 0.02, c * 0.0002)
        hh = np.minimum(h, np.maximum(pts[:-1], pts[1:]) + rng.uniform(0, tick, n))
        ll = np.maximum(l, np.minimum(pts[:-1], pts[1:]) - rng.uniform(0, tick, n))
        day_start = pd.Timestamp(dt.date()) + pd.Timedelta(hours=9)
        idx = pd.date_range(day_start, periods=n, freq="min")
        recs.append(pd.DataFrame(
            {"open": pts[:-1], "high": hh, "low": ll, "close": pts[1:], "volume": vols},
            index=idx))
    out = pd.concat(recs).sort_index()
    return out[~out.index.duplicated(keep="first")]


def to_daily_rows(rows: list) -> pd.DataFrame:
    """분봉 단위 equity 행 → 일별 종가 행 (지표 연환산용)."""
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df["day"] = df["date"].dt.date
    g = df.groupby("day").last().reset_index()
    g["date"] = pd.to_datetime(g["day"])
    return g.drop(columns=["day"])


def plot_series(dates, values, title, ylabel, path, fill_dd=False):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(dates, values, linewidth=1.2)
    if fill_dd:
        ax.fill_between(dates, values, 0, alpha=0.3)
    ax.set_title(title)
    ax.set_ylabel(ylabel)
    ax.grid(True, alpha=0.3)
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(path, dpi=100)
    plt.close(fig)


def summarize(result: dict, label: str, minute_mode: bool = False) -> dict:
    daily = pd.DataFrame(result["daily"])
    if minute_mode and not daily.empty:
        daily = to_daily_rows(result["daily"])
    trades = pd.DataFrame(result["trades"])
    m = {**equity_metrics(daily), **trade_metrics(trades)}
    m["label"] = label
    if not daily.empty:
        ms = monthly_stats(daily)
        m["losing_month_ratio_pct"] = float((ms["ret_pct"] < 0).mean() * 100.0) if len(ms) else 0.0
        m["n_months"] = int(len(ms))
    else:
        m["losing_month_ratio_pct"] = 0.0
        m["n_months"] = 0
    # turnover (연환산): 총 거래대금 / 평균자본 / 연수
    years = max(len(daily) / 252.0, 1e-9)
    avg_eq = float(daily["equity"].mean()) if not daily.empty else result["start_equity"]
    m["turnover_x"] = float(m.get("turnover_notional", 0.0) / avg_eq / years) if avg_eq else 0.0
    return m


def buy_and_hold(bars, start_equity=100_000_000.0, costs=None):
    costs = costs or CostModel()
    keys = list(bars)
    dates = sorted(set.intersection(*[set(v.index) for v in bars.values()]))
    per = start_equity / len(keys)
    eq_curve, d0 = [], dates[0]
    shares = {}
    for k in keys:
        o = float(bars[k].loc[d0, "open"])
        fee = per * costs.commission_pct / 100.0
        shares[k] = (per - fee) / o if o > 0 else 0
    for d in dates:
        tot = 0.0
        for k in keys:
            tot += shares[k] * float(bars[k].loc[d, "close"])
        eq_curve.append({"date": d, "equity": tot, "cash": 0.0, "mtm": 0.0, "n_open": 0, "realized_day": 0.0})
    # 매도세 무시된 단순 BH (매수수수료만 반영) — 보수적 비교용으로 명시
    return {"start_equity": start_equity, "end_equity": eq_curve[-1]["equity"],
            "trades": [], "daily": eq_curve, "dates": dates}


def ema_trend(bars, start_equity=100_000_000.0, costs=None):
    from python_engine.strategy.indicators import ema
    costs = costs or CostModel()
    keys = list(bars)
    dates = sorted(set.intersection(*[set(v.index) for v in bars.values()]))
    cash = start_equity
    pos = {k: 0.0 for k in keys}
    rows = []
    ind = {k: ema(v["close"], 50) for k, v in bars.items()}
    for d in dates:
        for k in keys:
            c = float(bars[k].loc[d, "close"])
            e = float(ind[k].loc[d]) if pd.notna(ind[k].loc[d]) else 0.0
            o = float(bars[k].loc[d, "open"])
            if pos[k] == 0 and e > 0 and c > e:
                q = int((cash / len(keys)) / o) if o > 0 else 0
                if q > 0:
                    fee = o * q * costs.commission_pct / 100.0
                    cash -= o * q + fee
                    pos[k] = q
            elif pos[k] > 0 and (e == 0 or c < e):
                fee = c * pos[k] * costs.commission_pct / 100.0
                tax = c * pos[k] * costs.tax_pct / 100.0
                cash += c * pos[k] - fee - tax
                pos[k] = 0
        tot = cash + sum(pos[k] * float(bars[k].loc[d, "close"]) for k in keys)
        rows.append({"date": d, "equity": tot, "cash": cash, "mtm": 0.0, "n_open": 0, "realized_day": 0.0})
    return {"start_equity": start_equity, "end_equity": rows[-1]["equity"],
            "trades": [], "daily": rows, "dates": dates}


def leak_check(bars, strategy) -> dict:
    """미래 누수 검사: 미래 종가를 셔플해도 과거 신호가 변하지 않는지 확인."""
    from python_engine.strategy.indicators import add_all_indicators
    k = next(iter(bars))
    df = add_all_indicators(bars[k].copy())
    n = len(df)
    cut = n - 30
    regs_before, sigs_before = [], []
    for i in range(220, cut):
        regs_before.append(strategy._regime(df, i))
    df2 = df.copy()
    rng = np.random.default_rng(0)
    future = df2["close"].iloc[cut:].to_numpy().copy()
    rng.shuffle(future)
    df2.iloc[cut:, df2.columns.get_loc("close")] = future
    # 지표는 원본 기준이므로 신호 입력이 미래에 오염되지 않음을 검증:
    # (엔진은 i행까지만 읽으므로) 셔플 후에도 cut 이전 레짐이 동일해야 함
    regs_after = [strategy._regime(df, i) for i in range(220, cut)]
    same = sum(a == b for a, b in zip(regs_before, regs_after))
    # NaN 전파 검사: warmup 이후 지표 NaN 존재 여부
    warm = df.iloc[220:]
    nan_cols = [c for c in ("bb_mid", "adx14", "atr14", "rsi14", "bbb_pct20")
                if warm[c].isna().any()]
    return {
        "past_regime_stable_after_future_shuffle": same == len(regs_before),
        "checked_bars": len(regs_before),
        "nan_columns_after_warmup": nan_cols,
        "passed": same == len(regs_before) and not nan_cols,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tickers", default="005930,000660")
    ap.add_argument("--days", type=int, default=365)
    ap.add_argument("--equity", type=float, default=100_000_000.0)
    ap.add_argument("--out", default=None)
    ap.add_argument("--synthetic-minutes", action="store_true",
                    help="일봉→합성분봉으로 분봉 로직 검증 (성과는 참고용 SYNTHETIC)")
    args = ap.parse_args()

    tickers = [t.strip() for t in args.tickers.split(",") if t.strip()]
    mode = "SYNTHETIC-MIN" if args.synthetic_minutes else "DAILY"
    print(f"[BT] loading daily bars: {tickers} ({args.days}d)")
    daily_map = {t: load_daily(t, args.days) for t in tickers}
    for t, df in daily_map.items():
        print(f"  {t}: {len(df)} bars ({df.index[0].date()} ~ {df.index[-1].date()}) "
              f"first_close={df['close'].iloc[0]:,.0f} last_close={df['close'].iloc[-1]:,.0f}")
    if args.synthetic_minutes:
        bars = {t: synth_minutes(df) for t, df in daily_map.items()}
        for t, df in bars.items():
            print(f"  {t}: {len(df)} synthetic minute bars")
    else:
        bars = daily_map

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    outdir = args.out or os.path.join(OUT_ROOT, f"bb_multiregime_{ts}")
    os.makedirs(outdir, exist_ok=True)

    strategy = BBMultiregimeStrategy()
    base_costs = CostModel()
    base_risk = RiskModel()

    # 1) 본전략 (비용 포함)
    res = run_backtest(bars, strategy, args.equity, base_costs, base_risk)
    # 2) 비용 제외 (gross 비교용)
    res_gross = run_backtest(bars, strategy, args.equity,
                             CostModel(commission_pct=0, tax_pct=0, slippage_bps=0, spread_bps=0,
                                       participation=1.0, max_carry_bars=0),
                             base_risk)
    bh = buy_and_hold(bars, args.equity, base_costs)
    ema = ema_trend(bars, args.equity, base_costs)

    mm = args.synthetic_minutes
    s_net = summarize(res, f"BB멀티레짐(net)[{mode}]", mm)
    s_gross = summarize(res_gross, f"BB멀티레짐(gross)[{mode}]", mm)
    s_bh = summarize(bh, f"Buy&Hold[{mode}]", mm)
    s_ema = summarize(ema, f"EMA추세[{mode}]", mm)

    # 3) 워크포워드: 3구간 시간순 분할 → 앞2개 train/val(파라미터 고정 검증용), 마지막 test
    dates_all = res["dates"]
    folds = np.array_split(dates_all, 3)
    wf_rows = []
    for fi, fold in enumerate(folds):
        if len(fold) < 40:
            continue
        r = run_backtest(bars, strategy, args.equity, base_costs, base_risk,
                         start=fold[0], end=fold[-1])
        m = summarize(r, f"WF-F{fi + 1}[{mode}]", mm)
        m.update({"from": str(pd.Timestamp(fold[0]).date()), "to": str(pd.Timestamp(fold[-1]).date())})
        wf_rows.append(m)

    # 4) 레짐별 성과 (진입 레짐 기준)
    trades = pd.DataFrame(res["trades"])
    if not trades.empty:
        regime = trades.groupby("regime").agg(
            n=("pnl", "size"), pnl=("pnl", "sum"),
            win_rate_pct=("pnl", lambda s: (s > 0).mean() * 100.0)).reset_index()
    else:
        regime = pd.DataFrame(columns=["regime", "n", "pnl", "win_rate_pct"])
    # 5) 종목별 성과
    symbol = trades.groupby("ticker").agg(
        n=("pnl", "size"), pnl=("pnl", "sum"),
        win_rate_pct=("pnl", lambda s: (s > 0).mean() * 100.0)).reset_index() if not trades.empty \
        else pd.DataFrame(columns=["ticker", "n", "pnl", "win_rate_pct"])

    # 6) 비용 민감도
    sens = []
    for comm, slip in [(0.0, 0.0), (0.015, 5.0), (0.03, 10.0), (0.05, 20.0)]:
        r = run_backtest(bars, strategy, args.equity,
                         CostModel(commission_pct=comm, slippage_bps=slip), base_risk)
        m = summarize(r, f"comm{comm}_slip{slip}[{mode}]", mm)
        sens.append(m)
    sens_df = pd.DataFrame(sens)

    # 7) 파라미터 안정성 (±20% 변동)
    base_params = dict(strategy.params)
    pert_sets = {"base": {}}
    for key in ("mr_stop_atr", "trend_stop_atr", "bo_bbb_growth"):
        pert_sets[f"{key}+20%"] = {key: base_params[key] * 1.2}
        pert_sets[f"{key}-20%"] = {key: base_params[key] * 0.8}
    stab = []
    for name, chg in pert_sets.items():
        s2 = BBMultiregimeStrategy(params={**base_params, **chg})
        r = run_backtest(bars, strategy if name == "base" else s2, args.equity, base_costs, base_risk)
        m = summarize(r, f"{name}[{mode}]", mm)
        stab.append(m)
    stab_df = pd.DataFrame(stab)

    # 8) 누수 검사
    leak = leak_check(bars, strategy)

    # ── 출력 저장 (필수 1~10) ──
    daily = pd.DataFrame(res["daily"])
    if mm:
        daily = to_daily_rows(res["daily"])
    daily.to_csv(os.path.join(outdir, "daily.csv"), index=False)                       # 2 일별
    monthly_stats(daily).to_csv(os.path.join(outdir, "monthly.csv"), index=False)      # 2 월별
    trades.to_csv(os.path.join(outdir, "trades.csv"), index=False)                     # 1 로그
    regime.to_csv(os.path.join(outdir, "regime.csv"), index=False)                     # 5 레짐별
    symbol.to_csv(os.path.join(outdir, "symbol.csv"), index=False)                     # 6 종목별
    sens_df.to_csv(os.path.join(outdir, "cost_sensitivity.csv"), index=False)          # 7 비용민감도
    stab_df.to_csv(os.path.join(outdir, "param_stability.csv"), index=False)           # 8 안정성
    with open(os.path.join(outdir, "wf_compare.json"), "w", encoding="utf-8") as f:    # 9 WF비교
        json.dump({"folds": wf_rows, "full": s_net}, f, ensure_ascii=False, indent=2, default=str)
    with open(os.path.join(outdir, "leakcheck.json"), "w", encoding="utf-8") as f:     # 10 누수검사
        json.dump(leak, f, ensure_ascii=False, indent=2)
    plot_series(daily["date"], daily["equity"] / args.equity - 1.0,                     # 3 누적수익률
                "Cumulative Return", "return", os.path.join(outdir, "equity.png"))
    peak = daily["equity"].cummax()
    plot_series(daily["date"], (daily["equity"] - peak) / peak * 100.0,                 # 4 낙폭
                "Drawdown (%)", "%", os.path.join(outdir, "drawdown.png"), fill_dd=True)
    summary = {"net": s_net, "gross": s_gross, "buy_and_hold": s_bh, "ema_trend": s_ema,
               "tickers": tickers, "leak_passed": leak["passed"]}
    with open(os.path.join(outdir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2, default=str)

    def fmt_pct(x):
        return "–" if x is None else f"{x:5.1f}%"
    def fmt_num(x, nd=2):
        return "–" if x is None else f"{x:{7 if nd == 2 else 5}.{nd}f}"
    def row(m):
        return (f"| {m['label']:<24} | {m['total_ret_pct']:7.2f}% | {m['cagr_pct']:7.2f}% | "
                f"{m['sharpe']:6.2f} | {m['sortino']:6.2f} | {m['calmar']:6.2f} | {m['mdd_pct']:7.2f}% | "
                f"{fmt_pct(m['win_rate_pct'])} | {fmt_num(m['profit_factor'])} | {m['n_trades']:5d} | {m['turnover_x']:5.2f}x |")
    md = ["# BB 멀티레짐 백테스트 요약", "",
          "| 전략 | 총수익 | CAGR | Sharpe | Sortino | Calmar | MDD | 승률 | PF | 거래수 | Turnover |",
          "|---|---|---|---|---|---|---|---|---|---|---|"]
    for m in (s_net, s_gross, s_bh, s_ema):
        md.append(row(m))
    md += ["", f"- 손실 월 비율(net): {s_net['losing_month_ratio_pct']:.1f}% ({s_net['n_months']}개월)",
           f"- 평균손익(net): {s_net['avg_pnl']:,.0f}원, 연환산변동성: {s_net['ann_vol_pct']:.2f}%",
           f"- 미래누수 검사: {'PASS' if leak['passed'] else 'FAIL'}",
           f"- 결과 폴더: {outdir}"]
    with open(os.path.join(outdir, "SUMMARY.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print("\n".join(md))
    print(f"\n[BT] saved to {outdir}")


if __name__ == "__main__":
    main()
