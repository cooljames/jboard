import io
import httpx
from python_engine.config import settings
from python_engine.core.logger import logger

class BlobCacheManager:
    """
    Parquet and artifact caching interface with Vercel Blob
    """
    def __init__(self):
        self.token = settings.blob_read_write_token

    async def upload_bytes(self, filename: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        if not self.token:
            logger.info(f"[Blob Cache] No BLOB_READ_WRITE_TOKEN. Returning local mock URI for {filename}")
            return f"https://mock-blob.vercel.app/{filename}"

        try:
            url = f"https://blob.vercel-storage.com/{filename}"
            headers = {
                "authorization": f"Bearer {self.token}",
                "x-content-type": content_type,
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.put(url, content=content, headers=headers)
                if res.status_code in [200, 201]:
                    data = res.json()
                    return data.get("url", url)
        except Exception as e:
            logger.error(f"[Blob Cache] Failed to upload {filename} to Vercel Blob: {e}")

        return f"https://mock-blob.vercel.app/{filename}"

blob_cache = BlobCacheManager()
