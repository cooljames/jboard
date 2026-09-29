import { NextResponse } from 'next/server';
import { kisClient } from '@/lib/kis-client';
import { getRealDailyCandles, getRealQuote } from '@/lib/real-market';
import { ALL_SECURITIES, searchSecurities, MarketType, MarketSecurity } from '@/lib/stock-universe';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const ticker = searchParams.get('ticker');
  const type = searchParams.get('type'); // 'search' | 'candles' | 'quote' | 'stocks'
  const market = searchParams.get('market') as MarketType | 'ALL' | null;

  // 1. Search Query (KOSPI, KOSDAQ, ETF, ETN & Dynamic 6-digit Ticker Lookup)
  if (type === 'search' || q) {
    const rawQuery = (q || '').trim();
    let results = searchSecurities(rawQuery, market || 'ALL');

    // 1-1. 마스터 검색 결과가 없을 경우 파이썬 엔진 실시간 검색 폴백
    if (results.length === 0 && rawQuery) {
      try {
        const pyRes = await fetch(`http://127.0.0.1:8000/api/market/search?q=${encodeURIComponent(rawQuery)}&market=${market || 'ALL'}`, {
          signal: AbortSignal.timeout(1500),
        });
        if (pyRes.ok) {
          const pyData = await pyRes.json();
          if (pyData.results && pyData.results.length > 0) {
            results = pyData.results;
          }
        }
      } catch (_) {}
    }

    // 6자리 숫자 종목코드 직입력 시, 마스터에 없더라도 실시간 시세 API로 즉시 종목 메타 데이터 자동 합성
    if (/^\d{6}$/.test(rawQuery) && !results.some((r) => r.ticker === rawQuery)) {
      try {
        const liveQ = await getRealQuote(rawQuery);
        if (liveQ && liveQ.price > 0 && liveQ.name && liveQ.name !== `종목-${rawQuery}`) {
          let detectedMarket: MarketType = 'KOSPI';
          const nm = liveQ.name.toUpperCase();
          if (rawQuery.startsWith('5')) {
            detectedMarket = 'ETN';
          } else if (nm.includes('KODEX') || nm.includes('TIGER') || nm.includes('ACE') || nm.includes('SOL') || nm.includes('RISE') || nm.includes('ETF')) {
            detectedMarket = 'ETF';
          } else if (liveQ.market === 'KOSDAQ') {
            detectedMarket = 'KOSDAQ';
          }

          const dynamicSecurity: MarketSecurity = {
            ticker: rawQuery,
            name: liveQ.name,
            market: detectedMarket,
          };
          results = [dynamicSecurity, ...results];
        }
      } catch {}
    }

    return NextResponse.json({ results });
  }

  // 1-1. All stocks list request
  if (type === 'stocks') {
    return NextResponse.json({ stocks: ALL_SECURITIES });
  }


  // 2. Candlestick Data for TradingView chart (100% Real Live Daily Candles)
  if (type === 'candles' && ticker) {
    let quote;
    try {
      if (kisClient.isConfigured()) {
        quote = await kisClient.getStockPrice(ticker);
      } else {
        quote = await getRealQuote(ticker);
      }
    } catch {
      quote = await getRealQuote(ticker);
    }

    const candles = await getRealDailyCandles(ticker, 60);

    // If current quote has updated price, sync the latest candle
    if (candles.length > 0 && quote && quote.price > 0) {
      const lastCandle = candles[candles.length - 1];
      lastCandle.close = quote.price;
      lastCandle.high = Math.max(lastCandle.high, quote.price);
      lastCandle.low = Math.min(lastCandle.low, quote.price);
    }

    return NextResponse.json({
      ticker,
      name: quote.name,
      candles,
      quote,
    });
  }

  // 3. Single Stock Quote (Live Real Data)
  if (ticker) {
    try {
      let quote;
      if (kisClient.isConfigured()) {
        try {
          quote = await kisClient.getStockPrice(ticker);
        } catch {
          quote = await getRealQuote(ticker);
        }
      } else {
        quote = await getRealQuote(ticker);
      }
      return NextResponse.json({ quote });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // 4. Default: Return balance and major stock quotes
  try {
    const balance = await kisClient.getAccountBalance();
    return NextResponse.json({ balance, stocks: ALL_SECURITIES });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

