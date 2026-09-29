from pydantic import BaseModel, Field
from typing import Optional, List

class KisOrderRequest(BaseModel):
    ticker: str = Field(description="종목코드 6자리 (예: 005930)")
    side: str = Field(description="'BUY' or 'SELL'")
    order_type: str = Field(default="00", description="'00' 지정가, '01' 시장가")
    price: float = Field(default=0.0, description="주문단가 (시장가일 시 0)")
    quantity: int = Field(gt=0, description="주문수량")
    strategy_id: Optional[str] = Field(default=None, description="주문 발생 전략 ID")

class KisOrderResponse(BaseModel):
    success: bool
    order_no: str
    message: str
    ticker: str
    side: str
    quantity: int
    price: float

class StockPriceInfo(BaseModel):
    ticker: str
    ticker_name: str
    current_price: float
    change_rate: float
    change_amount: float
    high_price: float
    low_price: float
    open_price: float
    volume: int
    trading_value: float
    per: Optional[float] = None
    pbr: Optional[float] = None

class PositionInfo(BaseModel):
    ticker: str
    ticker_name: str
    quantity: int
    avg_buy_price: float
    current_price: float
    unrealized_pnl: float
    return_pct: float

class AccountBalanceInfo(BaseModel):
    total_asset: float
    cash_balance: float
    stock_valuation: float
    daily_pnl: float
    unsettled_amount: float = Field(default=0.0, description="D+2 미결제금액 (prvs_rcdl_excc_amt)")
    positions: List[PositionInfo]
