import httpx
from typing import Dict, Any, Optional, List
from python_engine.config import settings
from python_engine.core.logger import logger
from python_engine.core.rate_limiter import kis_rate_limiter
from python_engine.kis.auth import kis_auth
from python_engine.kis.models import (
    KisOrderRequest,
    KisOrderResponse,
    StockPriceInfo,
    AccountBalanceInfo,
    PositionInfo,
)

class KisClient:
    def __init__(self):
        self.base_url = settings.kis_rest_base_url
        self.is_paper = settings.kis_is_paper_trading
        self.cano = settings.kis_account_no
        self.acnt_prdt_cd = settings.kis_account_prdt_cd
        self.app_key = settings.kis_app_key
        self.app_secret = settings.kis_app_secret

    async def _make_request(
        self,
        method: str,
        path: str,
        tr_id: str,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes an HTTP request to KIS with Token Bucket Rate Limiting (20 TPS).
        EGW00121/EGW00123(토큰 무효) 시 토큰을 버리고 1회 재발급 후 재시도.
        """
        from python_engine.kis.auth import TokenRateLimited, TOKEN_INVALID_CODES

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

        for attempt in range(2):
            async with httpx.AsyncClient(timeout=10.0) as client:
                if method.upper() == "GET":
                    res = await client.get(url, params=params, headers=headers)
                else:
                    res = await client.post(url, json=json_body, headers=headers)

                if res.status_code != 200:
                    logger.error(f"[KIS REST] Request to {path} failed: {res.status_code} - {res.text}")
                    raise RuntimeError(f"KIS API Error ({res.status_code}): {res.text}")

                data = res.json()
                if attempt == 0 and data.get("msg_cd") in TOKEN_INVALID_CODES:
                    logger.warning(
                        f"[KIS REST] Invalid token ({data.get('msg_cd')}). "
                        f"Dropping cached token and retrying once."
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
        raise RuntimeError(f"KIS API Error: invalid token retry failed for {path}")

    async def get_current_price(self, ticker: str) -> StockPriceInfo:
        """
        Inquire stock price (TR: FHKST01010100)
        """
        if not kis_auth.is_configured():
            # Mock fallback
            mock_prices = {
                "005930": ("삼성전자", 61500.0, 1.48, 900.0, 62000.0, 60800.0, 61000.0, 14205000, 875000000000, 11.2, 0.95),
                "000660": ("SK하이닉스", 184500.0, -0.81, -1500.0, 187000.0, 183000.0, 186000.0, 3820000, 705000000000, 14.8, 1.42),
                "035420": ("NAVER", 172000.0, 2.14, 3600.0, 174000.0, 169000.0, 169500.0, 980000, 168000000000, 19.5, 1.15),
                "035720": ("카카오", 38900.0, 0.52, 200.0, 39500.0, 38600.0, 38800.0, 1450000, 56000000000, 35.0, 1.8),
                "005380": ("현대차", 234000.0, -1.26, -3000.0, 238000.0, 233000.0, 237500.0, 840000, 197000000000, 5.8, 0.62),
            }
            if ticker in mock_prices:
                m = mock_prices[ticker]
                return StockPriceInfo(
                    ticker=ticker, ticker_name=m[0], current_price=m[1], change_rate=m[2],
                    change_amount=m[3], high_price=m[4], low_price=m[5], open_price=m[6],
                    volume=m[7], trading_value=m[8], per=m[9], pbr=m[10]
                )
            return StockPriceInfo(
                ticker=ticker, ticker_name=f"종목-{ticker}", current_price=50000.0, change_rate=0.5,
                change_amount=250.0, high_price=51000.0, low_price=49500.0, open_price=49800.0,
                volume=500000, trading_value=25000000000, per=12.0, pbr=1.0
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
            ticker_name=out.get("rprs_mrkt_kor_name") or out.get("hts_kor_isnm") or f"종목-{ticker}",
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

        return KisOrderResponse(
            success=True,
            order_no=order_no,
            message=msg or "주문이 정상 접수되었습니다.",
            ticker=req.ticker,
            side=req.side,
            quantity=req.quantity,
            price=req.price,
        )

    async def get_balance(self) -> AccountBalanceInfo:
        """
        Inquire Account Balance & Positions (TR: TTTC8434R / VTTC8434R)
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

        tr_id = "VTTC8434R" if self.is_paper else "TTTC8434R"

        def _to_float(v: object) -> float:
            try:
                if v is None or v == "":
                    return 0.0
                return float(str(v).replace(",", ""))
            except (ValueError, TypeError):
                return 0.0

        def _to_qty(p: dict) -> int:
            # KIS 공식 필드명은 hldg_qty (보유수량). hld_qty는 오타 폴백용.
            raw = p.get("hldg_qty", p.get("hld_qty", 0))
            try:
                if raw is None or raw == "":
                    return 0
                return int(float(str(raw).replace(",", "")))
            except (ValueError, TypeError):
                return 0

        # KIS는 1회 조회 최대 20종목까지만 반환하므로 CTX_AREA_* 로 전 페이지 순회
        all_output1: list = []
        output2: dict = {}
        ctx_fk = ""
        ctx_nk = ""
        for _ in range(10):
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

        return AccountBalanceInfo(
            total_asset=_to_float(output2.get("tot_evlu_amt", 0.0)),
            cash_balance=_to_float(output2.get("dnca_tot_amt", 0.0)),
            stock_valuation=_to_float(output2.get("scts_evlu_amt", 0.0)),
            daily_pnl=_to_float(output2.get("evlu_pfls_smtl_amt", 0.0)),
            unsettled_amount=_to_float(output2.get("prvs_rcdl_excc_amt", 0.0)),
            positions=positions,
        )

kis_client = KisClient()
