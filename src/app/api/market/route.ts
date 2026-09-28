import { NextResponse } from 'next/server';
import { kisClient } from '@/lib/kis-client';

// Major Korean stocks master list
const KOREAN_STOCKS = [
  { ticker: '005930', name: '삼성전자', market: 'KOSPI', sector: '반도체' },
  { ticker: '000660', name: 'SK하이닉스', market: 'KOSPI', sector: '반도체' },
  { ticker: '373220', name: 'LG에너지솔루션', market: 'KOSPI', sector: '2차전지' },
  { ticker: '207940', name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오' },
  { ticker: '005380', name: '현대차', market: 'KOSPI', sector: '자동차' },
  { ticker: '000270', name: '기아', market: 'KOSPI', sector: '자동차' },
  { ticker: '068270', name: '셀트리온', market: 'KOSPI', sector: '바이오' },
  { ticker: '035420', name: 'NAVER', market: 'KOSPI', sector: '인터넷' },
  { ticker: '035720', name: '카카오', market: 'KOSPI', sector: '인터넷' },
  { ticker: '005490', name: 'POSCO홀딩스', market: 'KOSPI', sector: '철강' },
  { ticker: '105560', name: 'KB금융', market: 'KOSPI', sector: '금융' },
  { ticker: '055550', name: '신한지주', market: 'KOSPI', sector: '금융' },
  { ticker: '051910', name: 'LG화학', market: 'KOSPI', sector: '화학' },
  { ticker: '247540', name: '에코프로비엠', market: 'KOSDAQ', sector: '2차전지' },
  { ticker: '086520', name: '에코프로', market: 'KOSDAQ', sector: '2차전지' },
  { ticker: '028300', name: 'HLB', market: 'KOSDAQ', sector: '바이오' },
  { ticker: '277810', name: '레인보우로보틱스', market: 'KOSDAQ', sector: '로봇' },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const ticker = searchParams.get('ticker');
  const type = searchParams.get('type'); // 'search' | 'candles' | 'quote'

  // 1. Search Query
  if (type === 'search' || q) {
    const query = (q || '').trim().toLowerCase();
    const filtered = KOREAN_STOCKS.filter(
      (s) => s.ticker.includes(query) || s.name.toLowerCase().includes(query)
    );
    return NextResponse.json({ results: filtered });
  }

  // 2. Candlestick Data for TradingView chart
  if (type === 'candles' && ticker) {
    const quote = await kisClient.getStockPrice(ticker);
    const basePrice = quote.price || 60000;

    // Generate realistic daily candles (last 60 trading days)
    const candles = [];
    const now = new Date();
    let currentClose = basePrice * 0.9;

    for (let i = 60; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const dateStr = date.toISOString().split('T')[0];
      const volatility = currentClose * 0.02;
      const change = (Math.random() - 0.48) * volatility;
      const open = Math.round(currentClose);
      const close = Math.round(open + change);
      const high = Math.round(Math.max(open, close) + Math.random() * (volatility * 0.8));
      const low = Math.round(Math.min(open, close) - Math.random() * (volatility * 0.8));
      const volume = Math.round(500000 + Math.random() * 2000000);

      candles.push({
        time: dateStr,
        open,
        high,
        low,
        close,
        volume,
      });

      currentClose = close;
    }

    // Set today's close to current quote price
    if (candles.length > 0) {
      candles[candles.length - 1].close = quote.price;
      candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, quote.price);
      candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, quote.price);
    }

    return NextResponse.json({
      ticker,
      name: quote.name,
      candles,
      quote,
    });
  }

  // 3. Single Stock Quote
  if (ticker) {
    try {
      const quote = await kisClient.getStockPrice(ticker);
      return NextResponse.json({ quote });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Default: Return balance and major stock quotes
  try {
    const balance = await kisClient.getAccountBalance();
    return NextResponse.json({ balance, stocks: KOREAN_STOCKS });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
