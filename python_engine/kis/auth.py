import time
import httpx
from typing import Optional
from python_engine.config import settings
from python_engine.core.logger import logger

class KisAuthManager:
    def __init__(self):
        self.app_key = settings.kis_app_key
        self.app_secret = settings.kis_app_secret
        self.rest_base_url = settings.kis_rest_base_url
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    def is_configured(self) -> bool:
        return bool(self.app_key and self.app_secret)

    async def get_token(self) -> str:
        """
        Returns a valid OAuth2 Access Token.
        Refreshes token automatically if within 1 hour of expiration.
        """
        if not self.is_configured():
            return "SIMULATED_KIS_TOKEN"

        now = time.time()
        if self._access_token and (self._token_expires_at - now > 3600):
            return self._access_token

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
                    logger.info(f"[KIS Auth] OAuth2 Token refreshed successfully. Valid for {expires_in}s")
                    return self._access_token
                else:
                    logger.warning(f"[KIS Auth] Token request returned status {res.status_code}: {res.text}")
                    return "SIMULATED_KIS_TOKEN"
        except Exception as e:
            logger.error(f"[KIS Auth] Failed to fetch access token: {e}")
            return "SIMULATED_KIS_TOKEN"

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
