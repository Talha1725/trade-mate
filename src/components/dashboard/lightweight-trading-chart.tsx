"use client";

import * as React from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { AlertTriangle, Loader2 } from "lucide-react";

import { ChartToolbar } from "@/components/dashboard/chart-toolbar";
import { useChartMarketData } from "@/hooks/use-chart-market-data";
import {
  buildIndicatorSeries,
  buildRebasedCompareSeries,
  calculateCandleTrackLine,
  calculateEma,
  calculateEmaUpperEnvelope,
  calculateRollingVwap,
  calculateSessionVwap,
  normalizeIndicatorPanelValues,
} from "@/lib/utils/chart-indicators";
import { formatChartSymbolLabel } from "@/lib/utils/eodhd-symbol";
import { mergeLiveQuoteIntoCandles } from "@/lib/utils/merge-live-quote-candles";
import { cn } from "@/lib/utils";
import type { ChartCandle } from "@/types/eodhd";
import type { ChartLegendValues, LightweightTradingChartProps } from "@/types/lightweight-trading-chart";

const CHART_BACKGROUND = "transparent";
const GRID_COLOR = "rgba(255, 255, 255, 0.06)";
const TEXT_COLOR = "#ffffff";
const LAST_PRICE_COLOR = "#22E0A2";
const MAIN_CHART_AXIS_FONT_SIZE = 16;
const SUB_CHART_X_AXIS_FONT_SIZE = 10;
const SUB_CHART_AXIS_COLOR = "#ffffff";
const CANDLE_UP = "#10B981";
const CANDLE_DOWN = "#EF4444";
const EMA50_COLOR = "#3B82F6";
const VWAP_COLOR = "#FF8000";
const ROLLING_VWAP_COLOR = "#03D5D5";
const COMPARE_LINE_COLOR = "#C084FC";
const EMPTY_CANDLES: ChartCandle[] = [];

function formatLegendValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildLegendValues(candles: ChartCandle[]): ChartLegendValues {
  if (candles.length === 0) {
    return {
      ema20: null,
      ema50: null,
      vwap: null,
      vwapRolling: null,
      lastPrice: null,
    };
  }

  const closes = candles.map((candle) => candle.close);
  const ema20Series = calculateEma(closes, 20);
  const ema50Series = calculateEmaUpperEnvelope(candles, 50);
  const vwapSeries = calculateSessionVwap(candles);
  const rollingVwapSeries = calculateRollingVwap(candles, 20);
  const lastIndex = candles.length - 1;

  return {
    ema20: ema20Series[lastIndex],
    ema50: ema50Series[lastIndex],
    vwap: vwapSeries[lastIndex],
    vwapRolling: rollingVwapSeries[lastIndex],
    lastPrice: candles[lastIndex]?.close ?? null,
  };
}

function toSeriesTime(time: number) {
  return time as UTCTimestamp;
}

function syncLastPriceLabel(
  series: ISeriesApi<"Candlestick">,
  price: number,
  labelElement: HTMLDivElement | null,
) {
  if (!labelElement) {
    return;
  }

  const top = series.priceToCoordinate(price);

  if (top === null) {
    labelElement.style.display = "none";
    return;
  }

  labelElement.style.display = "block";
  labelElement.style.top = `${top}px`;
  labelElement.textContent = formatLegendValue(price);
}

function ChartLegend({
  symbol,
  compareSymbol,
  timeframe,
  values,
}: {
  symbol: string;
  compareSymbol?: string | null;
  timeframe: string;
  values: ChartLegendValues;
}) {
  const compareLabel = compareSymbol ? formatChartSymbolLabel(compareSymbol) : null;

  return (
    <div className="pointer-events-none absolute right-6 top-6 z-10 min-w-[360px] rounded-[12px] border-[1.5px] border-white/20 bg-linear-to-t from-white/7 to-white/5 px-4 py-3 backdrop-blur-[6px]">
      <p className="mb-4 text-[14.50px] font-semibold text-white">
        {symbol}
        {compareLabel ? ` vs ${compareLabel}` : null} · {timeframe} · TradeMate
      </p>
      <div className="flex gap-x-3.5">
        <div className="flex flex-col">
          <span className="text-white/60 text-[13.3px]">EMA20</span>
          <span className="font-semibold text-[14.5px] text-[#10B981]">{formatLegendValue(values.ema20)}</span>
        </div>
        <div className="flex flex-col ">
          <span className="text-white/60 text-[13.3px]">EMA50</span>
          <span className="font-semibold text-[14.5px] text-[#3B82F6]">{formatLegendValue(values.ema50)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-white/60 text-[13.3px]">VWAP</span>
          <span className="font-semibold text-[14.5px] text-[#FF8000]">{formatLegendValue(values.vwap)}</span>
        </div>
        <div className="flex flex-col ">
          <span className="text-white/60 text-[13.3px]">VWAP Rolling</span>
          <span className="font-semibold text-[14.5px] text-[#03D5D5]">{formatLegendValue(values.vwapRolling)}</span>
        </div>
      </div>
    </div>
  );
}

export function LightweightTradingChart({
  symbol,
  compareSymbol = null,
  timeframe = "4H",
  liveQuote = null,
  className,
}: LightweightTradingChartProps) {
  const mainContainerRef = React.useRef<HTMLDivElement>(null);
  const subContainerRef = React.useRef<HTMLDivElement>(null);
  const mainChartRef = React.useRef<IChartApi | null>(null);
  const subChartRef = React.useRef<IChartApi | null>(null);
  const mainSeriesRef = React.useRef<ISeriesApi<"Candlestick" | "Line" | "Area">[]>([]);
  const subSeriesRef = React.useRef<ISeriesApi<"Area">[]>([]);
  const candleSeriesRef = React.useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLineRef = React.useRef<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]> | null>(null);
  const priceLabelRef = React.useRef<HTMLDivElement>(null);
  const lastCloseRef = React.useRef<number | null>(null);

  const normalizedCompareSymbol = React.useMemo(() => {
    if (!compareSymbol) {
      return null;
    }

    const primary = symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const compare = compareSymbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    if (!compare || primary === compare) {
      return null;
    }

    return compareSymbol;
  }, [compareSymbol, symbol]);

  const { data, isLoading, isError } = useChartMarketData(symbol, timeframe);
  const {
    data: compareData,
    isLoading: isCompareLoading,
  } = useChartMarketData(normalizedCompareSymbol ?? "", timeframe, {
    enabled: !!normalizedCompareSymbol,
  });
  const candles = data?.candles ?? EMPTY_CANDLES;
  const compareCandles = compareData?.candles ?? EMPTY_CANDLES;
  const displayCandles = React.useMemo(() => {
    if (!liveQuote) {
      return candles;
    }

    return mergeLiveQuoteIntoCandles(candles, liveQuote, timeframe);
  }, [candles, liveQuote, timeframe]);
  const chartDataKey = React.useMemo(() => {
    const lastPrimaryTime = candles[candles.length - 1]?.time ?? 0;
    const lastCompareTime = compareCandles[compareCandles.length - 1]?.time ?? 0;

    return [
      symbol,
      timeframe,
      normalizedCompareSymbol ?? "",
      candles.length,
      lastPrimaryTime,
      compareCandles.length,
      lastCompareTime,
    ].join("|");
  }, [symbol, timeframe, normalizedCompareSymbol, candles, compareCandles]);
  const usesEodFallback = data?.dataSource === "eod" && timeframe !== "D" && timeframe !== "W";
  const legendValues = React.useMemo(() => buildLegendValues(displayCandles), [displayCandles]);
  const displaySymbol = formatChartSymbolLabel(symbol);
  const displayCompareSymbol = normalizedCompareSymbol
    ? formatChartSymbolLabel(normalizedCompareSymbol)
    : null;
  const isChartLoading = isLoading || (normalizedCompareSymbol ? isCompareLoading : false);
  const lastDisplayedClose = displayCandles[displayCandles.length - 1]?.close ?? null;

  React.useEffect(() => {
    const mainContainer = mainContainerRef.current;
    const subContainer = subContainerRef.current;

    if (!mainContainer || !subContainer) {
      return undefined;
    }

    const mainChart = createChart(mainContainer, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BACKGROUND },
        textColor: TEXT_COLOR,
        fontSize: MAIN_CHART_AXIS_FONT_SIZE,
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
      },
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: true,
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      handleScroll: true,
      handleScale: true,
    });

    const subChart = createChart(subContainer, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BACKGROUND },
        textColor: SUB_CHART_AXIS_COLOR,
        fontSize: SUB_CHART_X_AXIS_FONT_SIZE,
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
      },
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: true,
        borderColor: "rgba(255,255,255,0.08)",
        textColor: SUB_CHART_AXIS_COLOR,
        scaleMargins: { top: 0.2, bottom: 0.05 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      handleScroll: true,
      handleScale: true,
    });

    subChart.priceScale("left").applyOptions({
      textColor: SUB_CHART_AXIS_COLOR,
    });

    mainChartRef.current = mainChart;
    subChartRef.current = subChart;

    const isSyncingTimeRangeRef = { current: false };

    const syncCharts = (source: IChartApi, target: IChartApi) => {
      source.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (!range || isSyncingTimeRangeRef.current) {
          return;
        }

        isSyncingTimeRangeRef.current = true;
        target.timeScale().setVisibleLogicalRange(range);
        isSyncingTimeRangeRef.current = false;
      });
    };

    syncCharts(mainChart, subChart);
    syncCharts(subChart, mainChart);

    const resizeObserver = new ResizeObserver(() => {
      const mainWidth = mainContainer.clientWidth;
      const mainHeight = mainContainer.clientHeight;
      const subWidth = subContainer.clientWidth;
      const subHeight = subContainer.clientHeight;

      if (mainWidth > 0 && mainHeight > 0) {
        mainChart.applyOptions({ width: mainWidth, height: mainHeight });
      }

      if (subWidth > 0 && subHeight > 0) {
        subChart.applyOptions({ width: subWidth, height: subHeight });
      }

      const series = candleSeriesRef.current;
      const lastClose = lastCloseRef.current;

      if (series && lastClose !== null) {
        syncLastPriceLabel(series, lastClose, priceLabelRef.current);
      }
    });

    resizeObserver.observe(mainContainer);
    resizeObserver.observe(subContainer);

    return () => {
      resizeObserver.disconnect();
      mainChart.remove();
      subChart.remove();
      mainChartRef.current = null;
      subChartRef.current = null;
      mainSeriesRef.current = [];
      subSeriesRef.current = [];
      candleSeriesRef.current = null;
      priceLineRef.current = null;
      lastCloseRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const mainChart = mainChartRef.current;
    const subChart = subChartRef.current;

    if (!mainChart || !subChart) {
      return;
    }

    for (const series of mainSeriesRef.current) {
      mainChart.removeSeries(series);
    }
    mainSeriesRef.current = [];

    for (const series of subSeriesRef.current) {
      subChart.removeSeries(series);
    }
    subSeriesRef.current = [];

    candleSeriesRef.current = null;
    priceLineRef.current = null;
    lastCloseRef.current = null;

    if (priceLabelRef.current) {
      priceLabelRef.current.style.display = "none";
    }

    mainChart.priceScale("right").applyOptions({
      visible: false,
    });

    if (displayCandles.length === 0) {
      return;
    }

    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      priceScaleId: "left",
      upColor: CANDLE_UP,
      downColor: CANDLE_DOWN,
      borderUpColor: CANDLE_UP,
      borderDownColor: CANDLE_DOWN,
      wickUpColor: CANDLE_UP,
      wickDownColor: CANDLE_DOWN,
    });

    const ema50 = buildIndicatorSeries(displayCandles, calculateEmaUpperEnvelope(displayCandles, 50));
    const vwapTrack = buildIndicatorSeries(
      displayCandles,
      calculateCandleTrackLine(displayCandles),
    );
    const rollingVwapValues = calculateRollingVwap(displayCandles, 20);

    const ema50AreaSeries = mainChart.addSeries(AreaSeries, {
      priceScaleId: "left",
      lineColor: EMA50_COLOR,
      topColor: "rgba(59, 130, 246, 0.22)",
      bottomColor: "rgba(59, 130, 246, 0.01)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const vwapSeries = mainChart.addSeries(LineSeries, {
      priceScaleId: "left",
      color: VWAP_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const compareTrack = normalizedCompareSymbol
      ? buildRebasedCompareSeries(displayCandles, compareCandles)
      : [];

    const compareSeries = compareTrack.length > 0
      ? mainChart.addSeries(LineSeries, {
          priceScaleId: "left",
          color: COMPARE_LINE_COLOR,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: displayCompareSymbol ?? "Compare",
        })
      : null;

    mainChart.priceScale("right").applyOptions({
      visible: false,
    });

    const rollingVwapPanelValues = normalizeIndicatorPanelValues(rollingVwapValues, 12);
    const rollingVwapArea = subChart.addSeries(AreaSeries, {
      lineColor: ROLLING_VWAP_COLOR,
      topColor: "rgba(3, 213, 213, 0.5)",
      bottomColor: "rgba(3, 213, 213, 0.02)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    mainSeriesRef.current = [
      ema50AreaSeries,
      candleSeries,
      vwapSeries,
      ...(compareSeries ? [compareSeries] : []),
    ];
    subSeriesRef.current = [rollingVwapArea];

    const candleData = displayCandles.map((candle) => ({
      time: toSeriesTime(candle.time),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeries.setData(candleData);
    ema50AreaSeries.setData(ema50.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    vwapSeries.setData(vwapTrack.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));

    if (compareSeries && compareTrack.length > 0) {
      compareSeries.setData(
        compareTrack.map((point) => ({ time: toSeriesTime(point.time), value: point.value })),
      );
    }

    rollingVwapArea.setData(
      displayCandles.map((candle, index) => ({
        time: toSeriesTime(candle.time),
        value: rollingVwapPanelValues[index] ?? 0,
      })),
    );

    candleSeriesRef.current = candleSeries;

    const lastClose = displayCandles[displayCandles.length - 1]?.close;
    lastCloseRef.current = lastClose ?? null;

    if (lastClose) {
      priceLineRef.current = candleSeries.createPriceLine({
        price: lastClose,
        color: LAST_PRICE_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        lineVisible: true,
        title: "",
      });

      syncLastPriceLabel(candleSeries, lastClose, priceLabelRef.current);
    }

    let labelFrameId = 0;

    const updateLastPriceLabel = () => {
      const price = lastCloseRef.current;

      if (price === null) {
        return;
      }

      cancelAnimationFrame(labelFrameId);
      labelFrameId = requestAnimationFrame(() => {
        syncLastPriceLabel(candleSeries, price, priceLabelRef.current);
      });
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(updateLastPriceLabel);

    mainChart.timeScale().fitContent();
    subChart.timeScale().fitContent();

    return () => {
      cancelAnimationFrame(labelFrameId);
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(updateLastPriceLabel);
    };
  }, [chartDataKey]);

  React.useEffect(() => {
    const series = candleSeriesRef.current;

    if (!series || !liveQuote) {
      return;
    }

    const merged = mergeLiveQuoteIntoCandles(candles, liveQuote, timeframe);
    const last = merged[merged.length - 1];

    if (!last) {
      return;
    }

    lastCloseRef.current = last.close;

    series.update({
      time: toSeriesTime(last.time),
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
    });

    if (priceLineRef.current) {
      priceLineRef.current.applyOptions({ price: last.close });
    } else {
      priceLineRef.current = series.createPriceLine({
        price: last.close,
        color: LAST_PRICE_COLOR,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        lineVisible: true,
        title: "",
      });
    }

    syncLastPriceLabel(series, last.close, priceLabelRef.current);
  }, [candles, liveQuote, timeframe]);

  return (
    <div
      className={cn(
        "overflow-hidden h-full",
        className,
      )}
    >
      <div className="flex min-h-[560px] gap-x-2 h-full">
        <ChartToolbar />

        <div className="relative flex min-w-0 flex-1 flex-col h-full rounded-[12px] border-[1.5px] border-white/20 bg-linear-to-t from-white/7 to-white/5">
          {isChartLoading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center gap-2  text-sm text-white/60">
              <Loader2 className="size-4 animate-spin text-primary" />
              Loading chart data...
            </div>
          ) : null}

          {isError ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/60">
              <AlertTriangle className="size-5 text-orange" />
              <p className="font-medium text-white">Chart data unavailable</p>
              <p>Verify the EODHD token and selected symbol, then try again.</p>
            </div>
          ) : null}

          <div className="relative min-h-[420px] flex-1 ">
            <div ref={mainContainerRef} className="absolute inset-0 [&_.tv-lightweight-charts]:bg-transparent" />
            {lastDisplayedClose !== null ? (
              <div
                ref={priceLabelRef}
                className="pointer-events-none absolute left-0 z-10 hidden -translate-y-1/2 rounded-[4px] border-[1.36px] border-[#22E0A2] bg-[#22E0A2] px-2 py-0.5 text-xs font-medium text-white"
              />
            ) : null}
            <ChartLegend
              symbol={displaySymbol}
              compareSymbol={displayCompareSymbol}
              timeframe={timeframe}
              values={legendValues}
            />
          </div>

          <div className="h-[140px] border-t border-white/10">
            <div ref={subContainerRef} className="h-full w-full [&_.tv-lightweight-charts]:bg-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
