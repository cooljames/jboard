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

# Singleton instance for KIS API calls
kis_rate_limiter = TokenBucketRateLimiter(rate_limit=20, time_period=1.0)
