from typing import Dict, Any, Optional
from python_engine.strategy.base import BaseStrategy, SignalResult
from python_engine.strategy.registry import StrategyRegistry
from python_engine.ai.gemini_analyzer import analyze_stock_with_gemini
from python_engine.core.logger import logger

@StrategyRegistry.register("ai_hybrid")
class AiHybridStrategy(BaseStrategy):
    """
    [Strategy E] Gemini 2.0 Flash AI 멀티모달 하이브리드 필터 (AI Hybrid Filter)
    매수 후보 종목에 대해 Gemini 2.0 Flash 분석을 수행하여
    신뢰도 >= min_confidence (0.80) 및 recommendation == "BUY" 인 경우 최종 주문 집행
    """
    def __init__(self, strategy_id: str = "ai_hybrid", name: str = "AI 하이브리드 필터", params: Dict[str, Any] = None):
        default_params = {
            "min_confidence": 0.80,
            "use_chart_vision": True,
            "stop_loss_pct": 2.5,
            "take_profit_pct": 6.0,
        }
        if params:
            default_params.update(params)
        super().__init__(strategy_id, name, default_params)

    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        min_conf = float(self.params.get("min_confidence", 0.80))
        stop_loss_pct = float(self.params.get("stop_loss_pct", 2.5))
        take_profit_pct = float(self.params.get("take_profit_pct", 6.0))

        current_price = float(market_data.get("price", 0))
        ticker_name = market_data.get("name", ticker)
        chart_bytes = market_data.get("chart_bytes")

        summary = f"""
        종목: {ticker_name} ({ticker})
        현재가: {current_price}원 (전일대비 {market_data.get('change_rate', 0)}%)
        거래량: {market_data.get('volume', 0)}주
        PER: {market_data.get('per', 'N/A')}, PBR: {market_data.get('pbr', 'N/A')}
        외국인/기관 동향: 외인 {market_data.get('foreign_net_amt', 0):,}원, 기관 {market_data.get('inst_net_amt', 0):,}원
        """

        ai_res = await analyze_stock_with_gemini(
            ticker=ticker,
            ticker_name=ticker_name,
            chart_image_bytes=chart_bytes,
            financial_summary=summary,
        )

        if ai_res.recommendation == "BUY" and ai_res.confidence_score >= min_conf:
            stop_price = current_price * (1.0 - stop_loss_pct / 100.0)
            take_profit_price = ai_res.target_price_3m or (current_price * (1.0 + take_profit_pct / 100.0))

            logger.info(f"[AI Hybrid] Approved BUY for {ticker} ({ticker_name}): Conf={ai_res.confidence_score:.2f}")

            return SignalResult(
                ticker=ticker,
                ticker_name=ticker_name,
                action="BUY",
                target_price=current_price,
                stop_loss_price=stop_price,
                take_profit_price=take_profit_price,
                weight=1.0,
                reason=f"Gemini 2.0 심사 통과: 신뢰도 {ai_res.confidence_score*100:.1f}% ({', '.join(ai_res.key_drivers[:2])})",
                strategy_id=self.strategy_id,
            )

        return None
