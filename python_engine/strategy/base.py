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
    use_full_capital: bool = Field(default=False, description="True면 전략 비중 무시하고 총자본 기준으로 수량 산정 (전액 회전용)")
    capital_pct: float = Field(default=1.0, description="use_full_capital=True일 때 투입할 총자본 비율 (0.0~1.0)")
    min_order_amount: float = Field(default=100000.0, description="최소 주문금액 (미만 시 주문 스킵)")
    quantity: Optional[int] = Field(default=None, description="지정 시 ensemble이 사이징 대신 이 수량 그대로 사용 (추적청산 등)")
    stop_distance: float = Field(default=0.0, description="주당 위험거리(원). >0이면 risk_fraction 기반 사이징")
    risk_fraction: float = Field(default=0.0025, description="거래당 위험 비율 (기본 0.25%)")
    max_weight: float = Field(default=0.10, description="종목별 최대 비중 (기본 10%)")

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
