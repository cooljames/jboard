import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Tuple, Optional
from python_engine.core.logger import logger

KST = timezone(timedelta(hours=9))

# KIS 주문 오류 메시지 분류 키워드
_INSUFFICIENT_KEYWORDS = [
    "주문가능금액", "예수금", "증거금", "잔고부족", "현금부족", "자금부족",
    "매수가능", "가능수량", "가능금액", "부족",
    "insufficient", "buying power", "lack of balance", "no cash", "not enough",
]
_RATE_KEYWORDS = [
    "EGW00133", "1분당", "TPS", "rate limit", "ratelimit", "rate-limited", "too many",
    "초과호출", "호출건수", "잠시 후", "429", "EGW00201",
]
_CLOSED_KEYWORDS = [
    "장마감", "영업시간", "휴장", "시간외", "주문가능시간", "장운영시간",
    "market closed", "not trading hours", "trading hours", "closed market",
]
_AUTH_KEYWORDS = [
    "EGW00123", "토큰", "token", "인증", "unauthorized", "401", "hashkey",
]


def is_market_open_kst(now: Optional[datetime] = None) -> bool:
    """KOSPI/KOSDAQ 정규장 여부 (평일 09:00~15:30 KST)"""
    now = now or datetime.now(KST)
    if now.weekday() >= 5:
        return False
    minutes = now.hour * 60 + now.minute
    return 9 * 60 <= minutes < 15 * 60 + 30


def classify_order_error(message: str) -> str:
    """KIS 주문 오류를 대기 정책별로 분류: INSUFFICIENT | RATE | CLOSED | AUTH | UNKNOWN"""
    msg = (message or "").lower()
    for kw in _RATE_KEYWORDS:
        if kw.lower() in msg:
            return "RATE"
    for kw in _CLOSED_KEYWORDS:
        if kw.lower() in msg:
            return "CLOSED"
    for kw in _AUTH_KEYWORDS:
        if kw.lower() in msg:
            return "AUTH"
    for kw in _INSUFFICIENT_KEYWORDS:
        if kw.lower() in msg:
            return "INSUFFICIENT"
    return "UNKNOWN"


class OrderCooldownManager:
    """
    주문 실패/자금부족에 따른 대기(쿨다운) 관리자:
    - 자금부족/매수금없음 → 신규 매수 일시중단 후 재개
    - KIS 오류 종류별 대기: 잔고부족(10분) / 호출한도(70초) / 장마감(30분) / 인증(15초)
    - 연속 실패 N회 → 전체 신규주문 M분 중단 (서킷)
    - 청산(SELL)·패닉·EOD는 차단하지 않음 (긴급 탈출 우선)
    """
    def __init__(
        self,
        no_cash_cooldown_sec: float = 300.0,        # 가용금 부족 시 매수 대기
        insufficient_funds_cooldown_sec: float = 600.0,  # KIS 잔고부족 오류 시 매수 대기
        rate_limit_cooldown_sec: float = 70.0,      # 호출한도 오류 시 전체 주문 대기
        market_closed_cooldown_sec: float = 1800.0, # 장마감 오류 시 매수 대기
        auth_cooldown_sec: float = 15.0,            # 인증 오류 시 짧은 대기 (토큰 갱신 시간 확보)
        max_consecutive_failures: int = 5,          # 연속 실패 허용 횟수
        failure_circuit_cooldown_sec: float = 600.0,  # 연속 실패 서킷 시 신규주문 대기
        trade_only_when_open: bool = True,          # 정규장 시간 외 신규 매수 차단
    ):
        self.no_cash_cooldown_sec = no_cash_cooldown_sec
        self.insufficient_funds_cooldown_sec = insufficient_funds_cooldown_sec
        self.rate_limit_cooldown_sec = rate_limit_cooldown_sec
        self.market_closed_cooldown_sec = market_closed_cooldown_sec
        self.auth_cooldown_sec = auth_cooldown_sec
        self.max_consecutive_failures = max_consecutive_failures
        self.failure_circuit_cooldown_sec = failure_circuit_cooldown_sec
        self.trade_only_when_open = trade_only_when_open

        self._buy_paused_until: float = 0.0
        self._buy_pause_reason: str = ""
        self._all_paused_until: float = 0.0
        self._all_pause_reason: str = ""
        self._ticker_buy_paused: Dict[str, Tuple[float, str]] = {}
        self._consecutive_failures: int = 0

    @staticmethod
    def _now() -> float:
        return time.monotonic()

    @staticmethod
    def _fmt_secs(secs: float) -> str:
        secs = max(0, int(secs))
        if secs >= 60:
            return f"{secs // 60}분 {secs % 60}초"
        return f"{secs}초"

    def _pause_buy(self, seconds: float, reason: str):
        until = self._now() + seconds
        if until > self._buy_paused_until:
            self._buy_paused_until = until
            self._buy_pause_reason = reason
        logger.warning(f"⏸️ [Order Cooldown] 신규 매수 대기 {self._fmt_secs(seconds)} — {reason}")

    def _pause_all(self, seconds: float, reason: str):
        until = self._now() + seconds
        if until > self._all_paused_until:
            self._all_paused_until = until
            self._all_pause_reason = reason
        logger.warning(f"⏸️ [Order Cooldown] 전체 주문 대기 {self._fmt_secs(seconds)} — {reason}")

    def can_buy(self, ticker: str) -> Tuple[bool, str]:
        """신규 매수 가능 여부. (가능, 사유) — 불가 시 사유에 대기 잔여시간 포함"""
        now = self._now()
        if now < self._all_paused_until:
            left = self._all_paused_until - now
            return False, f"{self._all_pause_reason} ({self._fmt_secs(left)} 후 재개)"
        if now < self._buy_paused_until:
            left = self._buy_paused_until - now
            return False, f"{self._buy_pause_reason} ({self._fmt_secs(left)} 후 재개)"
        key = ticker.strip()
        if key in self._ticker_buy_paused:
            until, reason = self._ticker_buy_paused[key]
            if now < until:
                return False, f"{reason} ({self._fmt_secs(until - now)} 후 재개)"
            del self._ticker_buy_paused[key]
        if self.trade_only_when_open and not is_market_open_kst():
            return False, "정규장 시간 외 (09:00~15:30 KST) — 장 시작 후 재개"
        return True, ""

    def can_sell(self, ticker: str) -> Tuple[bool, str]:
        """청산 매도는 호출한도 대기시에만 차단 (자금·장시간과 무관, 긴급 탈출 우선)"""
        now = self._now()
        if now < self._all_paused_until:
            left = self._all_paused_until - now
            return False, f"{self._all_pause_reason} ({self._fmt_secs(left)} 후 재개)"
        return True, ""

    def register_no_cash(self, detail: str = "가용 매수금 부족"):
        self._pause_buy(self.no_cash_cooldown_sec, detail)
        self._consecutive_failures = 0

    def register_success(self, ticker: str):
        self._consecutive_failures = 0
        self._ticker_buy_paused.pop(ticker.strip(), None)

    def register_failure(self, ticker: str, side: str, error: Exception | str) -> str:
        """실패 등록 + 종류별 대기 설정. UI/로그용 안내문 반환"""
        message = str(error) if not isinstance(error, str) else error
        kind = classify_order_error(message)
        side = (side or "").upper()
        is_buy = side == "BUY"

        if kind == "INSUFFICIENT":
            self._consecutive_failures = 0
            reason = f"잔고 부족 오류 ({message[:60]})"
            if is_buy:
                self._pause_buy(self.insufficient_funds_cooldown_sec, reason)
                self._ticker_buy_paused[ticker.strip()] = (
                    self._now() + self.insufficient_funds_cooldown_sec, reason
                )
            return f"{reason} — 매수 {self._fmt_secs(self.insufficient_funds_cooldown_sec)} 대기"
        if kind == "RATE":
            self._pause_all(self.rate_limit_cooldown_sec, f"호출한도 오류 ({message[:60]})")
            return f"호출한도 초과 — 전체 주문 {self._fmt_secs(self.rate_limit_cooldown_sec)} 대기"
        if kind == "CLOSED":
            self._consecutive_failures = 0
            if is_buy:
                self._pause_buy(self.market_closed_cooldown_sec, f"장 운영시간 외 ({message[:60]})")
            return f"장 운영시간 외 — 매수 {self._fmt_secs(self.market_closed_cooldown_sec)} 대기"
        if kind == "AUTH":
            self._pause_all(self.auth_cooldown_sec, "인증 오류 (토큰 갱신 대기)")
            return f"인증 오류 — {self._fmt_secs(self.auth_cooldown_sec)} 후 재시도"

        # UNKNOWN: 연속 실패 누적 → 서킷
        self._consecutive_failures += 1
        if self._consecutive_failures >= self.max_consecutive_failures:
            self._pause_all(
                self.failure_circuit_cooldown_sec,
                f"연속 {self._consecutive_failures}회 주문 실패",
            )
            self._consecutive_failures = 0
            return (
                f"원인 불명 오류 연속 발생 — 전체 신규주문 "
                f"{self._fmt_secs(self.failure_circuit_cooldown_sec)} 대기 ({message[:60]})"
            )
        return f"주문 실패 ({message[:60]}) — 다음 사이클에 재시도"

    def status(self) -> dict:
        now = self._now()
        buy_left = max(0.0, self._buy_paused_until - now)
        all_left = max(0.0, self._all_paused_until - now)
        paused = buy_left > 0 or all_left > 0
        if all_left > 0:
            reason, resume_in = self._all_pause_reason, all_left
        elif buy_left > 0:
            reason, resume_in = self._buy_pause_reason, buy_left
        else:
            reason, resume_in = "", 0.0
        return {
            "paused": paused,
            "pause_reason": reason,
            "resume_in_sec": int(resume_in),
            "market_open": is_market_open_kst(),
            "consecutive_failures": self._consecutive_failures,
        }


order_cooldown = OrderCooldownManager()
