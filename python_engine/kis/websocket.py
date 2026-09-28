import asyncio
import json
import websockets
from typing import Callable, Set, Dict, Any
from python_engine.config import settings
from python_engine.core.logger import logger
from python_engine.kis.auth import kis_auth

class KisWebSocketClient:
    """
    KIS WebSocket Client for:
    - H0STCNT0: Real-time stock tick price (호가/체결)
    - H0STCNNI0 / H0STCNNI8: Real-time order execution notice
    """
    def __init__(self):
        self.ws_url = settings.kis_ws_base_url
        self.subscribed_tickers: Set[str] = set()
        self.callbacks: list[Callable[[Dict[str, Any]], None]] = []
        self._running = False
        self._task = None

    def register_callback(self, cb: Callable[[Dict[str, Any]], None]):
        self.callbacks.append(cb)

    async def subscribe(self, ticker: str):
        self.subscribed_tickers.add(ticker)
        logger.info(f"[KIS WS] Registered subscription for ticker {ticker}")

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._listen_loop())

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

    async def _listen_loop(self):
        if not kis_auth.is_configured():
            logger.info("[KIS WS] Unconfigured credentials. Running in simulated tick generator mode.")
            await self._run_simulated_stream()
            return

        while self._running:
            try:
                token = await kis_auth.get_token()
                async with websockets.connect(self.ws_url, ping_interval=30) as ws:
                    logger.info("[KIS WS] Connected to KIS WebSocket server.")

                    # Register subscribed tickers
                    for ticker in self.subscribed_tickers:
                        sub_msg = {
                            "header": {
                                "approval_key": token,
                                "custtype": "P",
                                "tr_type": "1",
                                "content-type": "utf-8"
                            },
                            "body": {
                                "input": {
                                    "tr_id": "H0STCNT0",
                                    "tr_key": ticker
                                }
                            }
                        }
                        await ws.send(json.dumps(sub_msg))

                    async for message in ws:
                        if not self._running:
                            break
                        # Handle ping/pong and parse data
                        parsed = self._parse_kis_ws_message(message)
                        if parsed:
                            for cb in self.callbacks:
                                try:
                                    if asyncio.iscoroutinefunction(cb):
                                        await cb(parsed)
                                    else:
                                        cb(parsed)
                                except Exception as e:
                                    logger.error(f"[KIS WS Callback] Error: {e}")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"[KIS WS] Connection lost: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)

    def _parse_kis_ws_message(self, raw_message: str) -> Optional[Dict[str, Any]]:
        try:
            if raw_message.startswith("0") or raw_message.startswith("1"):
                # Data format: Encrypted/Pipe-delimited
                parts = raw_message.split("|")
                if len(parts) >= 4:
                    tr_id = parts[1]
                    body_str = parts[3]
                    fields = body_str.split("^")
                    if tr_id == "H0STCNT0" and len(fields) > 10:
                        return {
                            "type": "TICK",
                            "ticker": fields[0],
                            "price": float(fields[2]),
                            "change_rate": float(fields[5]),
                            "volume": int(fields[12]),
                        }
            return None
        except Exception:
            return None

    async def _run_simulated_stream(self):
        """Simulated ticks generator for development/paper-testing without broker account"""
        import random
        base_prices = {"005930": 61500.0, "000660": 184500.0, "035420": 172000.0}
        while self._running:
            await asyncio.sleep(2.0)
            tickers = list(self.subscribed_tickers) or list(base_prices.keys())
            for ticker in tickers:
                base = base_prices.get(ticker, 50000.0)
                delta = random.choice([-200, -100, 0, 100, 200, 300])
                new_price = max(100.0, base + delta)
                base_prices[ticker] = new_price
                tick_data = {
                    "type": "TICK",
                    "ticker": ticker,
                    "price": new_price,
                    "change_rate": round((new_price - base) / base * 100, 2),
                    "volume": random.randint(100, 5000),
                }
                for cb in self.callbacks:
                    try:
                        if asyncio.iscoroutinefunction(cb):
                            await cb(tick_data)
                        else:
                            cb(tick_data)
                    except Exception:
                        pass

kis_ws = KisWebSocketClient()
