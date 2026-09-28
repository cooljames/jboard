from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class SignalResult(BaseModel):
    ticker: str
    ticker_name: str
    action: str = Field(description="'BUY', 'SELL', or 'HOLD'")
    target_price: float = Field(description="주문 목표가")
    stop_loss_price: float = Field(description="손절 기준가")
    take_profit_price: float = Field(description="익절 기준가")
    weight: float = Field(default=1.0, description="전략 내 수량 비중")
    reason: str = Field(description="신호 발생 사유")
    strategy_id: Optional[str] = Field(default=None, description="신호 발생 전략 식별자")

class BaseStrategy(ABC):
    def __init__(self, strategy_id: str, name: str, params: Dict[str, Any]):
        self.strategy_id = strategy_id
        self.name = name
        self.params = params

    @abstractmethod
    async def analyze(self, ticker: str, market_data: Dict[str, Any]) -> Optional[SignalResult]:
        """시세 및 기술적/수급 지표 데이터를 분석하여 매매 신호(SignalResult) 반환"""
        pass

    def update_params(self, new_params: Dict[str, Any]):
        """웹 UI에서 변경된 동적 파라미터 실시간 적용 (무중단 리로드)"""
        self.params.update(new_params)
