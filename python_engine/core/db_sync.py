import json
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional
from python_engine.config import settings
from python_engine.core.logger import logger

class DatabaseSync:
    def __init__(self, db_url: str = settings.database_url):
        self.db_url = db_url

    def _get_connection(self):
        if not self.db_url:
            return None
        try:
            return psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)
        except Exception as e:
            logger.warning(f"[DB] Connection failed: {e}")
            return None

    def get_all_strategies(self) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        if not conn:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, description, enabled, allocation_weight, target_market, parameters, updated_at FROM quant_strategies ORDER BY id ASC")
                rows = cur.fetchall()
                result = []
                for r in rows:
                    item = dict(r)
                    if isinstance(item.get("parameters"), str):
                        try:
                            item["parameters"] = json.loads(item["parameters"])
                        except Exception:
                            pass
                    result.append(item)
                return result
        except Exception as e:
            logger.error(f"[DB] Failed to get strategies: {e}")
            return []
        finally:
            conn.close()

    def update_strategy(self, strategy_id: str, enabled: Optional[bool] = None, weight: Optional[float] = None, parameters: Optional[Dict[str, Any]] = None) -> bool:
        conn = self._get_connection()
        if not conn:
            return False
        try:
            with conn.cursor() as cur:
                updates = []
                params = []
                if enabled is not None:
                    updates.append("enabled = %s")
                    params.append(enabled)
                if weight is not None:
                    updates.append("allocation_weight = %s")
                    params.append(weight)
                if parameters is not None:
                    updates.append("parameters = %s")
                    params.append(json.dumps(parameters))
                updates.append("updated_at = NOW()")

                if not updates:
                    return False

                query = f"UPDATE quant_strategies SET {', '.join(updates)} WHERE id = %s"
                params.append(strategy_id)
                cur.execute(query, tuple(params))
                conn.commit()
                return cur.rowcount > 0
        except Exception as e:
            logger.error(f"[DB] Failed to update strategy {strategy_id}: {e}")
            return False
        finally:
            conn.close()

    def record_order(self, order_data: Dict[str, Any]) -> Optional[int]:
        conn = self._get_connection()
        if not conn:
            return None
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO orders (
                        strategy_id, ticker, ticker_name, side, order_type, price,
                        quantity, executed_price, executed_quantity, kis_order_no,
                        status, fail_reason, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id
                """, (
                    order_data.get("strategy_id"),
                    order_data.get("ticker"),
                    order_data.get("ticker_name"),
                    order_data.get("side"),
                    order_data.get("order_type", "00"),
                    order_data.get("price"),
                    order_data.get("quantity"),
                    order_data.get("executed_price"),
                    order_data.get("executed_quantity", 0),
                    order_data.get("kis_order_no"),
                    order_data.get("status", "PENDING"),
                    order_data.get("fail_reason"),
                ))
                order_id = cur.fetchone()["id"]
                conn.commit()
                return order_id
        except Exception as e:
            logger.error(f"[DB] Failed to record order: {e}")
            return None
        finally:
            conn.close()

    def update_positions(self, positions: List[Dict[str, Any]]):
        conn = self._get_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                for p in positions:
                    cur.execute("""
                        INSERT INTO positions (
                            ticker, ticker_name, quantity, avg_buy_price, current_price,
                            unrealized_pnl, return_pct, strategy_id, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (ticker) DO UPDATE SET
                            quantity = EXCLUDED.quantity,
                            avg_buy_price = EXCLUDED.avg_buy_price,
                            current_price = EXCLUDED.current_price,
                            unrealized_pnl = EXCLUDED.unrealized_pnl,
                            return_pct = EXCLUDED.return_pct,
                            updated_at = NOW();
                    """, (
                        p["ticker"],
                        p.get("ticker_name", p["ticker"]),
                        p["quantity"],
                        p["avg_buy_price"],
                        p["current_price"],
                        p["unrealized_pnl"],
                        p["return_pct"],
                        p.get("strategy_id"),
                    ))
                conn.commit()
        except Exception as e:
            logger.error(f"[DB] Failed to update positions: {e}")
        finally:
            conn.close()

    def save_ai_analysis(self, log_data: Dict[str, Any]):
        conn = self._get_connection()
        if not conn:
            return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO ai_analysis_logs (
                        ticker, ticker_name, recommendation, confidence_score,
                        summary, structured_json, chart_image_url, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    log_data["ticker"],
                    log_data.get("ticker_name", log_data["ticker"]),
                    log_data["recommendation"],
                    log_data["confidence_score"],
                    log_data["summary"],
                    json.dumps(log_data["structured_json"]),
                    log_data.get("chart_image_url"),
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"[DB] Failed to save AI analysis: {e}")
        finally:
            conn.close()

db_sync = DatabaseSync()
