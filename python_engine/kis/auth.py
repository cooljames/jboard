import json
import time
from pathlib import Path
import httpx
from typing import Optional
from python_engine.config import settings
from python_engine.core.logger import logger

TOKEN_CACHE_PATH = Path(__file__).resolve().parent.parent.parent / ".kis_token_cache.json"

# KIS 토큰 발급 제한(1분당 1회) 초과 시그널 — 호출자가 대기 후 재시도 판단용
class TokenRateLimited(RuntimeError):
    pass

# 토큰 무효 (재발급 후 1회 재시도 대상)
TOKEN_INVALID_CODES = {"EGW00121", "EGW00123"}

class KisAuthManager:
    def __init__(self):
        self.app_key = settings.kis_app_key
        self.app_secret = settings.kis_app_secret
        self.rest_base_url = settings.kis_rest_base_url
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    def is_configured(self) -> bool:
        return bool(self.app_key and self.app_secret)

    def _read_disk_cache(self) -> Optional[str]:
        """Node/TS와 공유하는 디스크 토큰 캐시 (프로세스 간 발급 경합 방지)."""
        try:
            if not TOKEN_CACHE_PATH.exists():
                return None
            data = json.loads(TOKEN_CACHE_PATH.read_text(encoding="utf-8"))
            if (
                data.get("appKey") == self.app_key
                and data.get("token")
                and isinstance(data.get("expiresAt"), (int, float))
                and float(data["expiresAt"]) > (time.time() + 60) * 1000
            ):
                self._access_token = data["token"]
                self._token_expires_at = float(data["expiresAt"]) / 1000.0
                return self._access_token
        except Exception:
            pass
        return None

    def _write_disk_cache(self):
        try:
            TOKEN_CACHE_PATH.write_text(
                json.dumps({
                    "appKey": self.app_key,
                    "token": self._access_token,
                    "expiresAt": int(self._token_expires_at * 1000),
                    "savedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
                }),
                encoding="utf-8",
            )
        except Exception:
            pass

    def drop_token(self):
        """무효 토큰 폐기 (메모리 + 디스크 공유캐시). 다음 get_token에서 재발급."""
        self._access_token = None
        self._token_expires_at = 0.0
        try:
            if TOKEN_CACHE_PATH.exists():
                TOKEN_CACHE_PATH.unlink()
        except Exception:
            pass

    async def get_token(self) -> str:
        """
        Returns a valid OAuth2 Access Token.
        순서: 메모리 → 디스크 공유캐시 → 신규 발급.
        403(1분당 1회 제한) 시 마지막 토큰으로 폴백, 없으면 TokenRateLimited.
        가짜 토큰을 절대 실API에 흘려보내지 않음 (EGW00121 연쇄 방지).
        """
        if not self.is_configured():
            return "SIMULATED_KIS_TOKEN"

        now = time.time()
        if self._access_token and (self._token_expires_at - now > 3600):
            return self._access_token

        cached = self._read_disk_cache()
        if cached:
            return cached

        url = f"{self.rest_base_url}/oauth2/tokenP"
        payload = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    self._access_token = data.get("access_token")
                    expires_in = int(data.get("expires_in", 86400))
                    self._token_expires_at = now + expires_in
                    self._write_disk_cache()
                    logger.info(f"[KIS Auth] OAuth2 Token refreshed successfully. Valid for {expires_in}s")
                    return self._access_token
                body = res.text
                if res.status_code == 403 or "EGW00133" in body:
                    logger.warning("[KIS Auth] Token rate-limited (1분당 1회). Checking shared cache...")
                    # 다른 프로세스가 방금 발급했을 수 있으니 디스크 재확인
                    retry_cached = self._read_disk_cache()
                    if retry_cached:
                        return retry_cached
                    if self._access_token:
                        logger.warning("[KIS Auth] Using last-known token until limit resets.")
                        return self._access_token
                    raise TokenRateLimited("KIS token rate-limited (1분당 1회). 잠시 후 재시도하세요.")
                logger.warning(f"[KIS Auth] Token request returned status {res.status_code}: {body}")
        except TokenRateLimited:
            raise
        except Exception as e:
            logger.error(f"[KIS Auth] Failed to fetch access token: {e}")
        # 여기까지 오면 발급 실패: 마지막 토큰 폴백, 그것도 없으면 대기 예외
        if self._access_token:
            logger.warning("[KIS Auth] Using last-known token after issuance failure.")
            return self._access_token
        raise TokenRateLimited("KIS token unavailable. 잠시 후 재시도하세요.")

    async def get_hashkey(self, body: dict) -> str:
        """
        Generate Hashkey for POST order requests
        """
        if not self.is_configured():
            return ""

        url = f"{self.rest_base_url}/uapi/hashkey"
        headers = {
            "content-type": "application/json; charset=utf-8",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(url, json=body, headers=headers)
                if res.status_code == 200:
                    return res.json().get("HASH", "")
        except Exception as e:
            logger.warning(f"[KIS Auth] Hashkey generation failed: {e}")
        return ""

kis_auth = KisAuthManager()
