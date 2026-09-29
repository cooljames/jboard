import asyncio
import time
import httpx
from typing import Dict, Any, Optional, List
from python_engine.config import settings
from python_engine.core.logger import logger
from python_engine.core.rate_limiter import kis_rate_limiter, kis_trading_rate_limiter
from python_engine.kis.auth import kis_auth
from python_engine.kis.models import (
    KisOrderRequest,
    KisOrderResponse,
    StockPriceInfo,
    AccountBalanceInfo,
    PositionInfo,
)

STOCK_NAMES: Dict[str, str] = {
    "005930": "삼성전자",
    "000660": "SK하이닉스",
    "373220": "LG에너지솔루션",
    "207940": "삼성바이오로직스",
    "005380": "현대차",
    "000270": "기아",
    "068270": "셀트리온",
    "035420": "NAVER",
    "035720": "카카오",
    "005490": "POSCO홀딩스",
    "105560": "KB금융",
    "055550": "신한지주",
    "051910": "LG화학",
    "247540": "에코프로비엠",
    "086520": "에코프로",
    "028300": "HLB",
    "277810": "레인보우로보틱스",
}

RATE_LIMIT_CODES = {"EGW00201", "EGW00215", "EGW00133"}

class KisClient:
    def __init__(self):
        self.base_url = settings.kis_rest_base_url
        self.is_paper = settings.kis_is_paper_trading
        self.cano = settings.kis_account_no
        self.acnt_prdt_cd = settings.kis_account_prdt_cd
        self.app_key = settings.kis_app_key
        self.app_secret = settings.kis_app_secret

        # 잔고 인메모리 캐시 및 중복/과다 조회 방지책 (10초 TTL)
        self._cached_balance: Optional[AccountBalanceInfo] = None
        self._cached_balance_time: float = 0.0
        self._balance_ttl: float = 10.0
        self._balance_lock = asyncio.Lock()

    def invalidate_balance_cache(self):
        """주문 체결 직후 등 잔고를 즉각 재동기화해야 할 때 캐시 무효화"""
        self._cached_balance_time = 0.0

    async def _make_request(
        self,
        method: str,
        path: str,
        tr_id: str,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """
        Executes an HTTP request to KIS with:
        1. 원장/주문(/trading/*) 전용 초당 거래건수 제한기 (최소 1.1초 간격) -> EGW00201/EGW00215 사전 차단
        2. 시세(/quotations/*) 전용 Token Bucket (20 TPS)
        3. ReadTimeout(25s) 확장 및 네트워크 지연 시 지수 백오프 자동 재시도
        4. EGW00201/EGW00215(초당거래초과) 감지 시 2초 쿨다운 후 안전 1회 재시도
        5. EGW00121/EGW00123(토큰 무효) 시 1회 재발급 후 재시도
        """
        from python_engine.kis.auth import TokenRateLimited, TOKEN_INVALID_CODES

        if "/trading/" in path:
            await kis_trading_rate_limiter.acquire()
        else:
            await kis_rate_limiter.acquire()

        token = await kis_auth.get_token()

        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": tr_id,
        }

        if method.upper() == "POST" and json_body:
            hashkey = await kis_auth.get_hashkey(json_body)
            if hashkey:
                headers["hashkey"] = hashkey

        url = f"{self.base_url}{path}"
        timeout_config = httpx.Timeout(connect=10.0, read=25.0, write=10.0, pool=10.0)

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=timeout_config) as client:
                    if method.upper() == "GET":
                        res = await client.get(url, params=params, headers=headers)
                    else:
                        res = await client.post(url, json=json_body, headers=headers)
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.TimeoutException, httpx.NetworkError) as e:
                if attempt < max_retries - 1:
                    backoff = 1.5 * (attempt + 1)
                    logger.warning(
                        f"[KIS REST 방지책] {path} 통신 지연 감지 ({type(e).__name__}). "
                        f"{backoff:.1f}초 대기 후 자동 재시도합니다 (시도 {attempt + 1}/{max_retries})."
                    )
                    await asyncio.sleep(backoff)
                    continue
                logger.warning(f"[KIS REST 방지책] {path} 요청이 {max_retries}회 시도 후 타임아웃되었습니다.")
                raise

            # HTTP 상태코드가 200이 아닌 경우
            if res.status_code != 200:
                raw_text = res.text
                try:
                    err_json = res.json()
                    msg_cd = err_json.get("msg_cd", "")
                    msg1 = err_json.get("msg1", "")
                except Exception:
                    err_json = {}
                    msg_cd = ""
                    msg1 = raw_text

                # 1) 초당 거래건수 초과 (EGW00201 / EGW00215)
                if msg_cd in RATE_LIMIT_CODES or "초당 거래건수" in msg1 or "원장" in msg1:
                    if attempt < max_retries - 1:
                        cooldown = 2.0 * (attempt + 1)
                        logger.warning(
                            f"[KIS RateLimit 방지책] KIS 초당 거래건수 한도 감지 ([{msg_cd}] {msg1}). "
                            f"{cooldown:.1f}초 쿨다운 후 안전하게 재호출합니다 ({attempt + 1}/{max_retries})."
                        )
                        await asyncio.sleep(cooldown)
                        continue
                    raise RuntimeError(f"KIS API Rate Limit [{msg_cd}]: {msg1}")

                logger.error(f"[KIS REST] Request to {path} failed: {res.status_code} - {raw_text}")
                raise RuntimeError(f"KIS API Error ({res.status_code}): {raw_text}")

            data = res.json()
            msg_cd = str(data.get("msg_cd", ""))
            msg1 = str(data.get("msg1", ""))

            # 2) 응답 본문에 초당 거래건수 초과가 포함된 경우
            if msg_cd in RATE_LIMIT_CODES or "초당 거래건수" in msg1:
                if attempt < max_retries - 1:
                    cooldown = 2.0 * (attempt + 1)
                    logger.warning(
                        f"[KIS RateLimit 방지책] 응답 내 초당 거래건수 한도 감지 ([{msg_cd}] {msg1}). "
                        f"{cooldown:.1f}초 쿨다운 후 재시도 ({attempt + 1}/{max_retries})."
                    )
                    await asyncio.sleep(cooldown)
                    continue
                raise RuntimeError(f"KIS API Rate Limit [{msg_cd}]: {msg1}")

            # 3) 토큰 무효 시 1회 재발급 후 재시도
            if attempt == 0 and msg_cd in TOKEN_INVALID_CODES:
                logger.warning(
                    f"[KIS REST] 토큰 만료 또는 무효 ({msg_cd}). 토큰 재발급 후 1회 재시도합니다."
                )
                kis_auth.drop_token()
                try:
                    token = await kis_auth.get_token()
                except TokenRateLimited as e:
                    raise RuntimeError(f"KIS token refresh rate-limited, retry later: {e}")
                headers["authorization"] = f"Bearer {token}"
                if method.upper() == "POST" and json_body:
                    hashkey = await kis_auth.get_hashkey(json_body)
                    if hashkey:
                        headers["hashkey"] = hashkey
                    else:
                        headers.pop("hashkey", None)
                continue

            return data

        raise RuntimeError(f"KIS API Error: max retries reached for {path}")


    async def get_current_price(self, ticker: str) -> StockPriceInfo:
        """
        Inquire stock price (TR: FHKST01010100)
        """
        if not kis_auth.is_configured():
            try:
                import httpx
                url = f"https://polling.finance.naver.com/api/realtime/domestic/stock/{ticker}"
                with httpx.Client(timeout=3.0) as client:
                    resp = client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                    if resp.status_code == 200:
                        datas = resp.json().get("datas", [])
                        if datas:
                            d = datas[0]
                            cp = float(str(d.get("closePrice", 0)).replace(",", ""))
                            cr = float(str(d.get("fluctuationsRatio", 0)).replace(",", ""))
                            ca = float(str(d.get("compareToPreviousClosePrice", 0)).replace(",", ""))
                            op = float(str(d.get("openPrice", cp)).replace(",", ""))
                            hp = float(str(d.get("highPrice", cp)).replace(",", ""))
                            lp = float(str(d.get("lowPrice", cp)).replace(",", ""))
                            vol = int(str(d.get("accumulatedTradingVolume", 0)).replace(",", ""))
                            val = int(str(d.get("accumulatedTradingValue", 0)).replace(",", ""))
                            nm = d.get("stockName", f"종목-{ticker}")
                            return StockPriceInfo(
                                ticker=ticker, ticker_name=nm, current_price=cp, change_rate=cr,
                                change_amount=ca, high_price=hp, low_price=lp, open_price=op,
                                volume=vol, trading_value=val, per=11.2, pbr=0.95
                            )
            except Exception:
                pass

            return StockPriceInfo(
                ticker=ticker, ticker_name=f"종목-{ticker}", current_price=60000.0, change_rate=0.0,
                change_amount=0.0, high_price=60000.0, low_price=60000.0, open_price=60000.0,
                volume=100000, trading_value=6000000000, per=11.0, pbr=1.0
            )

        tr_id = "FHKST01010100"
        params = {
            "fid_cond_mrkt_div_code": "J",
            "fid_input_iscd": ticker,
        }
        data = await self._make_request("GET", "/uapi/domestic-stock/v1/quotations/inquire-price", tr_id, params=params)
        out = data.get("output", {})

        return StockPriceInfo(
            ticker=ticker,
            ticker_name=STOCK_NAMES.get(ticker) or out.get("hts_kor_isnm") or out.get("rprs_mrkt_kor_name") or f"종목-{ticker}",
            current_price=float(out.get("stck_prpr", 0.0)),
            change_rate=float(out.get("prdy_ctrt", 0.0)),
            change_amount=float(out.get("prdy_vrss", 0.0)),
            high_price=float(out.get("stck_hgpr", 0.0)),
            low_price=float(out.get("stck_lwpr", 0.0)),
            open_price=float(out.get("stck_oprc", 0.0)),
            volume=int(out.get("acml_vol", 0)),
            trading_value=float(out.get("acml_tr_pbmn", 0.0)),
            per=float(out.get("per", 0.0)) if out.get("per") else None,
            pbr=float(out.get("pbr", 0.0)) if out.get("pbr") else None,
        )

    async def send_order(self, req: KisOrderRequest) -> KisOrderResponse:
        """
        Executes Cash Buy/Sell Order (TR: TTTC0802U/VTTC0802U or TTTC0801U/VTTC0801U)
        """
        if not kis_auth.is_configured():
            mock_odno = f"SIM-{int(req.price)}-{req.quantity}"
            logger.info(f"[KIS Mock Order] {req.side} {req.ticker} Qty: {req.quantity} Price: {req.price}")
            return KisOrderResponse(
                success=True,
                order_no=mock_odno,
                message="[시뮬레이션 모의주문] 주문이 체결 대기열에 등록되었습니다.",
                ticker=req.ticker,
                side=req.side,
                quantity=req.quantity,
                price=req.price,
            )

        if req.side.upper() == "BUY":
            tr_id = "VTTC0802U" if self.is_paper else "TTTC0802U"
        else:
            tr_id = "VTTC0801U" if self.is_paper else "TTTC0801U"

        body = {
            "CANO": self.cano,
            "ACNT_PRDT_CD": self.acnt_prdt_cd,
            "PDNO": req.ticker,
            "ORD_DVSN": req.order_type,
            "ORD_QTY": str(req.quantity),
            "ORD_UNPR": "0" if req.order_type == "01" else str(int(req.price)),
        }

        data = await self._make_request(
            "POST",
            "/uapi/domestic-stock/v1/trading/order-cash",
            tr_id,
            json_body=body,
        )

        rt_cd = data.get("rt_cd")
        msg = data.get("msg1", "")
        if rt_cd != "0":
            raise RuntimeError(f"Order rejected: [{data.get('msg_cd')}] {msg}")

        out = data.get("output", {})
        order_no = out.get("ODNO", f"OD-{req.ticker}")

        # 주문 체결 접수 직후 잔고 캐시 무효화 (다음 조회 시 실계좌 최신 데이터 반영)
        self.invalidate_balance_cache()

        return KisOrderResponse(
            success=True,
            order_no=order_no,
            message=msg or "주문이 정상 접수되었습니다.",
            ticker=req.ticker,
            side=req.side,
            quantity=req.quantity,
            price=req.price,
        )

    async def get_balance(self, force: bool = False) -> AccountBalanceInfo:
        """
        Inquire Account Balance & Positions (TR: TTTC8434R / VTTC8434R)
        [미연 방지책 핵심 설계]:
        1. 10초 TTL 인메모리 캐싱: 대시보드와 트레이딩 루프의 중복 호출 흡수
        2. 페이지네이션 간격 강제 (1.1초): 원장 초당 거래건수 한도(EGW00201/EGW00215) 완벽 차단
        3. 비동기 락(Lock): 동시 다발적 잔고조회 요청의 직렬화
        4. KIS 타임아웃 / 네트워크 순단 시 이전 유효 잔고 스냅샷으로 안전 폴백(Fallback) -> 루프 중단 방지
        """
        if not kis_auth.is_configured():
            return AccountBalanceInfo(
                total_asset=104500000.0,
                cash_balance=42500000.0,
                stock_valuation=62000000.0,
                daily_pnl=1450000.0,
                positions=[
                    PositionInfo(
                        ticker="005930", ticker_name="삼성전자", quantity=500,
                        avg_buy_price=59800.0, current_price=61500.0, unrealized_pnl=850000.0, return_pct=2.84
                    ),
                    PositionInfo(
                        ticker="000660", ticker_name="SK하이닉스", quantity=120,
                        avg_buy_price=181000.0, current_price=184500.0, unrealized_pnl=420000.0, return_pct=1.93
                    ),
                    PositionInfo(
                        ticker="035420", ticker_name="NAVER", quantity=50,
                        avg_buy_price=168400.0, current_price=172000.0, unrealized_pnl=180000.0, return_pct=2.14
                    ),
                ]
            )

        now = time.monotonic()
        # 1. 캐시가 유효하고 강제 갱신이 아닌 경우 즉시 캐시 반환 (API 호출 0회)
        if not force and self._cached_balance is not None and (now - self._cached_balance_time) < self._balance_ttl:
            return self._cached_balance

        async with self._balance_lock:
            # 락 획득 후 재검사 (동시 대기하던 다른 요청 흡수)
            now = time.monotonic()
            if not force and self._cached_balance is not None and (now - self._cached_balance_time) < self._balance_ttl:
                return self._cached_balance

            tr_id = "VTTC8434R" if self.is_paper else "TTTC8434R"

            def _to_float(v: object) -> float:
                try:
                    if v is None or v == "":
                        return 0.0
                    return float(str(v).replace(",", ""))
                except (ValueError, TypeError):
                    return 0.0

            def _to_qty(p: dict) -> int:
                raw = p.get("hldg_qty", p.get("hld_qty", 0))
                try:
                    if raw is None or raw == "":
                        return 0
                    return int(float(str(raw).replace(",", "")))
                except (ValueError, TypeError):
                    return 0

            all_output1: list = []
            output2: dict = {}
            ctx_fk = ""
            ctx_nk = ""

            try:
                for page_idx in range(10):
                    if page_idx > 0:
                        # 원장 조회 연속 호출 시 초당 거래건수(EGW00201/EGW00215) 초과 사전 차단
                        await asyncio.sleep(1.1)

                    params = {
                        "CANO": self.cano,
                        "ACNT_PRDT_CD": self.acnt_prdt_cd,
                        "AFHR_FLPR_YN": "N",
                        "OFL_YN": "",
                        "INQR_DVSN": "02",
                        "UNPR_DVSN": "01",
                        "FUND_STTL_ICLD_YN": "N",
                        "FNCG_AMT_AUTO_RDPT_YN": "N",
                        "PRCS_DVSN": "00",
                        "CTX_AREA_FK100": ctx_fk,
                        "CTX_AREA_NK100": ctx_nk,
                    }

                    data = await self._make_request("GET", "/uapi/domestic-stock/v1/trading/inquire-balance", tr_id, params=params)
                    page_output1 = data.get("output1", []) or []
                    all_output1.extend(page_output1)
                    if data.get("output2"):
                        output2 = data["output2"][0] or {}

                    next_fk = str(data.get("ctx_area_fk100", "") or "").strip()
                    next_nk = str(data.get("ctx_area_nk100", "") or "").strip()
                    if not next_nk:
                        break
                    if next_fk == ctx_fk and next_nk == ctx_nk:
                        break
                    ctx_fk, ctx_nk = next_fk, next_nk

                positions = [
                    PositionInfo(
                        ticker=str(p.get("pdno", "") or "").strip(),
                        ticker_name=str(p.get("prdt_name", "") or "").strip(),
                        quantity=_to_qty(p),
                        avg_buy_price=_to_float(p.get("pchs_avg_pric", 0.0)),
                        current_price=_to_float(p.get("prpr", 0.0)),
                        unrealized_pnl=_to_float(p.get("evlu_pfls_amt", 0.0)),
                        return_pct=_to_float(p.get("evlu_pfls_rt", 0.0)),
                    )
                    for p in all_output1
                    if _to_qty(p) > 0 and str(p.get("pdno", "") or "").strip()
                ]

                fresh_balance = AccountBalanceInfo(
                    total_asset=_to_float(output2.get("tot_evlu_amt", 0.0)),
                    cash_balance=_to_float(output2.get("dnca_tot_amt", 0.0)),
                    stock_valuation=_to_float(output2.get("scts_evlu_amt", 0.0)),
                    daily_pnl=_to_float(output2.get("evlu_pfls_smtl_amt", 0.0)),
                    unsettled_amount=_to_float(output2.get("prvs_rcdl_excc_amt", 0.0)),
                    positions=positions,
                )

                self._cached_balance = fresh_balance
                self._cached_balance_time = time.monotonic()
                return fresh_balance

            except Exception as e:
                # KIS 일시 지연 또는 초과 시 기존 캐시 스냅샷으로 무중단 폴백
                if self._cached_balance is not None:
                    cached_age = time.monotonic() - self._cached_balance_time
                    logger.warning(
                        f"[KIS 잔고 방지책] KIS 잔고 조회 일시 지연 ({type(e).__name__}: {e}). "
                        f"이전 잔고 스냅샷({cached_age:.1f}초 전)으로 안전 폴백하여 트레이딩 루프를 정상 유지합니다."
                    )
                    return self._cached_balance

                logger.warning(
                    f"[KIS 잔고 방지책] 초기 잔고 조회 불가 ({type(e).__name__}: {e}). "
                    f"시스템 안전 기본 잔고 스냅샷을 적용합니다."
                )
                return AccountBalanceInfo(
                    total_asset=0.0,
                    cash_balance=0.0,
                    stock_valuation=0.0,
                    daily_pnl=0.0,
                    unsettled_amount=0.0,
                    positions=[],
                )

kis_client = KisClient()
