"""분봉 데이터 제공자 (실시간 매매용).

1순위: KIS 당일분봉 API (inquire-time-itemchartprice, TR: FHKST03010200)
2순위: 캐시 (60초)
3순위: 빈 DataFrame 반환 → 전략은 NoTrade (없는 데이터로 매매하지 않음)
"""
import time
from datetime import datetime, timezone, timedelta
from typing import Dict
import httpx
import pandas as pd
from python_engine.config import settings
from python_engine.kis.auth import kis_auth
from python_engine.core.logger import logger

CACHE_TTL_SEC = 60.0
TIME_CHART_PATH = "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice"
TIME_CHART_TR_ID = "FHKST03010200"  # 주식당일분봉조회
KST = timezone(timedelta(hours=9))
SESSION_OPEN = "090000"
SESSION_CLOSE = "153000"


class MinuteBarProvider:
    def __init__(self):
        self._cache: Dict[str, tuple] = {}  # ticker -> (timestamp, df)

    def _cached(self, ticker: str):
        item = self._cache.get(ticker)
        if item and (time.monotonic() - item[0]) < CACHE_TTL_SEC:
            return item[1]
        return None

    async def get_minute_bars(self, ticker: str) -> pd.DataFrame:
        """분봉 OHLCV (datetime 오름차순). 형성 중 최신 봉은 제외하고 마감봉만 반환."""
        cached = self._cached(ticker)
        if cached is not None:
            return cached
        df = await self._fetch_kis_minute_bars(ticker)
        if df is not None and not df.empty:
            # 형성 중 봉 제외: 마지막 봉 제거 (마감 확정봉만 사용 = lookahead 방지)
            df = df.iloc[:-1]
            if not df.empty:
                self._cache[ticker] = (time.monotonic(), df)
                return df
        empty_df = pd.DataFrame()
        self._cache[ticker] = (time.monotonic(), empty_df)
        return empty_df

    async def _fetch_kis_minute_bars(self, ticker: str):
        if not kis_auth.is_configured():
            return None
        try:
            # 토큰은 1회만 발급 (페이지마다 호출 시 1분당 1회 제한 EGW00133에 걸림)
            token = await kis_auth.get_token()
            if not token or token == "SIMULATED_KIS_TOKEN":
                logger.warning(f"[MinuteBars] KIS {ticker} no valid token")
                return None
            headers = {
                "content-type": "application/json; charset=utf-8",
                "authorization": f"Bearer {token}",
                "appkey": settings.kis_app_key,
                "appsecret": settings.kis_app_secret,
                "tr_id": TIME_CHART_TR_ID,
            }
            url = f"{settings.kis_rest_base_url}{TIME_CHART_PATH}"
            today = datetime.now(KST).date()

            # 당일분봉은 1회 최대 30건 → 기준시각을 과거로 이동하며 backward pagination.
            # EMA200 warmup(220봉+) 확보용. 분봉 배열은 output2 (output1은 요약이므로 제외).
            import asyncio as _asyncio
            from datetime import timedelta as _td
            all_recs: Dict[datetime, dict] = {}
            hour_param = datetime.now(KST).strftime("%H%M%S")
            for _page in range(12):
                if hour_param < SESSION_OPEN:
                    break  # 장 시작 전 조회 금지 (mock 오물 봉 유입 방지)
                params = {
                    "FID_COND_MRKT_DIV_CODE": "J",
                    "FID_INPUT_ISCD": ticker,
                    "FID_INPUT_HOUR_1": hour_param,
                    "FID_PW_DATA_INCU_YN": "Y",
                    "FID_ETC_CLS_CODE": "",
                }
                # 페이지당 최대 2회 시도 (KIS 간헐 500 대응), 페이지 사이 0.4초 간격
                data = None
                try:
                    async with httpx.AsyncClient(timeout=2.5) as client:
                        res = await client.get(url, params=params, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        if data.get("rt_cd") != "0":
                            data = None
                except Exception:
                    data = None

                if not data:
                    break
                rows = data.get("output2") or []
                if not isinstance(rows, list) or not rows:
                    break
                for r in rows:
                    if not isinstance(r, dict):
                        continue
                    try:
                        dt = datetime.strptime(
                            f"{r.get('stck_bsop_date', '')}{r.get('stck_cntg_hour', '')}",
                            "%Y%m%d%H%M%S",
                        )
                        # 당일 정규장(09:00~15:30) 봉만 채택 — 전일/장외 오물 봉 차단
                        if dt.date() != today:
                            continue
                        hhmmss = dt.strftime("%H%M%S")
                        if hhmmss < SESSION_OPEN or hhmmss > SESSION_CLOSE:
                            continue
                        all_recs[dt] = {
                            "datetime": dt,
                            "open": float(r.get("stck_oprc", 0)),
                            "high": float(r.get("stck_hgpr", 0)),
                            "low": float(r.get("stck_lwpr", 0)),
                            "close": float(r.get("stck_prpr", 0)),
                            "volume": float(r.get("cntg_vol", 0)),
                        }
                    except (ValueError, TypeError):
                        continue
                if len(rows) < 30 or len(all_recs) >= 260:
                    break
                earliest = min(all_recs)
                prev = earliest - _td(minutes=1)
                if prev.date() != earliest.date():
                    break  # 당일 범위 이탈
                hour_param = prev.strftime("%H%M%S")
                if hour_param < SESSION_OPEN:
                    break

            if not all_recs:
                return None
            df = pd.DataFrame(sorted(all_recs.values(), key=lambda r: r["datetime"]))
            df = df.drop_duplicates("datetime")
            df = df[df["close"] > 0].set_index("datetime").asfreq("min")
            # 거래 없는 분봉은 전 종가로 메우지 않고 드랍 — 없는 데이터로 매매하지 않음
            df = df.dropna(subset=["close"])
            for c in ("open", "high", "low"):
                df[c] = df[c].fillna(df["close"])
            df["volume"] = df["volume"].fillna(0.0)
            return df[["open", "high", "low", "close", "volume"]]
        except Exception as e:
            logger.warning(f"[MinuteBars] KIS fetch failed for {ticker}: {e}")
            return None


minute_bar_provider = MinuteBarProvider()
