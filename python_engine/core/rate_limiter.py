import asyncio
import time

class TokenBucketRateLimiter:
    """
    Token Bucket Algorithm Rate Limiter for KIS Open API (max 20 TPS)
    """
    def __init__(self, rate_limit: int = 20, time_period: float = 1.0):
        self.rate_limit = rate_limit
        self.time_period = time_period
        self.tokens = rate_limit
        self.last_update = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            time_passed = now - self.last_update
            self.tokens = min(self.rate_limit, self.tokens + time_passed * (self.rate_limit / self.time_period))
            self.last_update = now

            if self.tokens < 1:
                wait_time = (1 - self.tokens) * (self.time_period / self.rate_limit)
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

# Singleton instance for KIS Quotation/Market API calls (max 20 TPS)
kis_rate_limiter = TokenBucketRateLimiter(rate_limit=20, time_period=1.0)


class MinimumIntervalRateLimiter:
    """
    Strict Inter-Request Interval Limiter for KIS Trading & Ledger APIs.
    한국투자증권 Open API의 주문/잔고조회(/trading/*)는 초당 거래건수(EGW00201) 및
    원장 초당 거래건수(EGW00215) 제한이 매우 엄격하므로(모의투자 1건/초 이하),
    최소 호출 간격(기본 1.1초)을 보장하여 레이트 리밋을 사전에 원천 차단합니다.
    """
    def __init__(self, min_interval: float = 1.1):
        self.min_interval = min_interval
        self.last_call_time = 0.0
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_call_time
            if elapsed < self.min_interval:
                wait_time = self.min_interval - elapsed
                await asyncio.sleep(wait_time)
            self.last_call_time = time.monotonic()


# Singleton instance for KIS Trading / Ledger / Inquire-Balance API calls (1 req / 1.1s)
kis_trading_rate_limiter = MinimumIntervalRateLimiter(min_interval=1.1)

