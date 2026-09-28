import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load root .env
root_dir = Path(__file__).resolve().parent.parent
env_path = root_dir / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    # App Settings
    app_name: str = "QuantAntigravity-KIS Trading Worker"
    app_version: str = "2.0.0"
    debug: bool = False
    port: int = 8000
    host: str = "0.0.0.0"
    worker_secret_key: str = os.getenv("WORKER_SECRET_KEY", "antigravity_kis_secret_sync_key_2026")

    # Neon PostgreSQL Database
    database_url: str = os.getenv("DATABASE_URL", "")

    # Vercel Blob
    blob_read_write_token: str = os.getenv("BLOB_READ_WRITE_TOKEN", "")

    # Korea Investment & Securities (KIS)
    kis_app_key: str = os.getenv("KIS_APP_KEY", "")
    kis_app_secret: str = os.getenv("KIS_APP_SECRET", "")
    kis_account_no: str = os.getenv("KIS_ACCOUNT_NO", "")
    kis_account_prdt_cd: str = os.getenv("KIS_ACCOUNT_PRDT_CD", "01")
    kis_is_paper_trading: bool = os.getenv("KIS_IS_PAPER_TRADING", "true").lower() != "false"
    kis_rest_base_url: str = os.getenv(
        "KIS_REST_BASE_URL",
        "https://openapivts.koreainvestment.com:29443" if os.getenv("KIS_IS_PAPER_TRADING", "true").lower() != "false" else "https://openapi.koreainvestment.com:9443"
    )
    kis_ws_base_url: str = os.getenv(
        "KIS_WS_BASE_URL",
        "ws://ops.koreainvestment.com:21000" if os.getenv("KIS_IS_PAPER_TRADING", "true").lower() != "false" else "ws://ops.koreainvestment.com:31000"
    )

    # Google Gen AI (Gemini 2.0 Flash)
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # Rate Limiter & Trading Rules
    max_tps: int = 20
    daily_max_drawdown_pct: float = 3.0  # -3.0% circuit breaker

    class Config:
        case_sensitive = False

settings = Settings()
