'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  data: CandleData[];
  tickerName?: string;
  ticker?: string;
  currentPrice?: number;
}

export function TradingViewChart({ data, tickerName, ticker, currentPrice }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        vertLine: { color: '#475569', width: 1, style: 2 },
        horzLine: { color: '#475569', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#334155',
        textColor: '#cbd5e1',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 420,
    });

    chartRef.current = chart;

    // Candlestick series (Korean styling: Red = Up, Blue = Down)
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderVisible: false,
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Volume histogram series
    const volumeSeries = chart.addHistogramSeries({
      color: '#334155',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    });
    volumeSeriesRef.current = volumeSeries;

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Populate chart data
    if (data && data.length > 0) {
      candlestickSeries.setData(
        data.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeries.setData(
        data.map((c) => ({
          time: c.time,
          value: c.volume || 100000,
          color: c.close >= c.open ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)',
        }))
      );

      chart.timeScale().fitContent();
    }

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div className="relative w-full rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 text-lg">{tickerName || '종목 차트'}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {ticker || '005930'}
          </span>
          <span className="text-xs text-slate-500 font-mono">일봉 (Daily)</span>
        </div>
        {currentPrice !== undefined && (
          <div className="text-right">
            <span className="font-bold font-mono text-xl text-slate-100">
              {currentPrice.toLocaleString('ko-KR')}원
            </span>
          </div>
        )}
      </div>

      <div ref={chartContainerRef} className="w-full h-[420px]" />
    </div>
  );
}
