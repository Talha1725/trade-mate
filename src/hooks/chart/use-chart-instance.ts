"use client";

import * as React from "react";
import { CandlestickSeries, ColorType, CrosshairMode, LineSeries, LineStyle, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { buildIndicatorSeries, calculateEma, calculateVwap, type VwapCalculationSettings } from "@/lib/utils/chart-indicators";
import { mergeLiveQuoteIntoCandles } from "@/lib/utils/merge-live-quote-candles";
import type { ChartCandle, ChartLiveQuote } from "@/types/eodhd";
import type { TradingTimeframe } from "@/types/trading-filter-bar";
import { CANDLE_DOWN, CANDLE_UP, CHART_BACKGROUND, COMPARE_LINE_COLOR, EMA50_COLOR, GRID_COLOR, LAST_PRICE_COLOR, SUB_CHART_AXIS_COLOR, SUB_CHART_X_AXIS_FONT_SIZE, TEXT_COLOR, VWAP_BAND_COLORS, VWAP_COLOR, getDefaultVisibleBars } from "@/constants/chart/lightweight-chart";
import { formatChartPrice, getChartPriceFormat } from "@/lib/utils/chart/formatters";

function toSeriesTime(time: number) { return time as UTCTimestamp; }

export interface ChartInstanceOptions {
  mainContainerRef: React.RefObject<HTMLDivElement | null>; subContainerRef: React.RefObject<HTMLDivElement | null>;
  mainChartRef: React.MutableRefObject<IChartApi | null>; subChartRef: React.MutableRefObject<IChartApi | null>;
  mainSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick" | "Line" | "Area">[]>; subSeriesRef: React.MutableRefObject<ISeriesApi<"Area">[]>;
  candleSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>; emaSeriesRef: React.MutableRefObject<ISeriesApi<"Line"> | null>; vwapSeriesRef: React.MutableRefObject<ISeriesApi<"Line"> | null>;
  vwapUpperSeriesRefs: React.MutableRefObject<Array<ISeriesApi<"Line"> | null>>; vwapLowerSeriesRefs: React.MutableRefObject<Array<ISeriesApi<"Line"> | null>>;
  priceLineRef: React.MutableRefObject<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]> | null>; priceLabelRef: React.RefObject<HTMLDivElement | null>;
  lastCloseRef: React.MutableRefObject<number | null>; initialViewKeyRef: React.MutableRefObject<string | null>;
  symbol: string; timeframe: TradingTimeframe; normalizedCompareSymbol: string | null; displayCandles: ChartCandle[]; displayCompareCandles: ChartCandle[];
  compareTrack: Array<{ time: number; value: number }>; enabledIndicators: string[]; vwap: Array<{ time: number; value: number; upperBands: Array<number | null>; lowerBands: Array<number | null> }>;
  vwapSettings: VwapCalculationSettings; ema: Array<{ time: number; value: number }>;
  effectiveLiveQuote: ChartLiveQuote | null; candles: ChartCandle[]; chartDataKey: string; overlayRevision: React.Dispatch<React.SetStateAction<number>>; indicatorPeriods: { ema: number };
  syncLastPriceLabel: (series: ISeriesApi<"Candlestick">, price: number, label: HTMLDivElement | null, symbol: string) => void;
}

export function useChartInstance(options: ChartInstanceOptions) {
  const { mainContainerRef, subContainerRef, mainChartRef, subChartRef, mainSeriesRef, subSeriesRef, candleSeriesRef, emaSeriesRef, vwapSeriesRef, vwapUpperSeriesRefs: vwapUpperSeriesRefsRef, vwapLowerSeriesRefs: vwapLowerSeriesRefsRef, priceLineRef, priceLabelRef, lastCloseRef, initialViewKeyRef, symbol, timeframe, normalizedCompareSymbol, displayCandles, displayCompareCandles, compareTrack, enabledIndicators, vwap, vwapSettings, ema, effectiveLiveQuote, candles, chartDataKey, overlayRevision, indicatorPeriods, syncLastPriceLabel } = options;
  const [chartReady, setChartReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let retryFrame = 0;
    let cleanupCharts: (() => void) | undefined;

    const initializeCharts = () => {
      if (cancelled) return;

      const mainContainer = mainContainerRef.current;
      const subContainer = subContainerRef.current;

      if (!mainContainer || !subContainer) {
        retryFrame = window.requestAnimationFrame(initializeCharts);
        return;
      }


    const mainChart = createChart(mainContainer, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BACKGROUND },
        textColor: TEXT_COLOR,
        fontSize: 12,
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
      },
      rightPriceScale: {
        visible: true,
        borderColor: "rgba(255,255,255,0.08)",
        minimumWidth: 64,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
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
        rightOffset: 4,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      handleScroll: true,
      handleScale: true,
    });

    const applyContainerSize = () => {
      const mainWidth = mainContainer.clientWidth;
      const mainHeight = mainContainer.clientHeight;
      const subWidth = subContainer.clientWidth;
      const subHeight = subContainer.clientHeight;
      if (mainWidth > 0 && mainHeight > 0) mainChart.applyOptions({ width: mainWidth, height: mainHeight });
      if (subWidth > 0 && subHeight > 0) subChart.applyOptions({ width: subWidth, height: subHeight });
    };
    applyContainerSize();
    const initialSizeFrame = window.requestAnimationFrame(applyContainerSize);

    subChart.priceScale("left").applyOptions({
      textColor: SUB_CHART_AXIS_COLOR,
    });

    mainChartRef.current = mainChart;
    subChartRef.current = subChart;
    setChartReady(true);

    const isSyncingTimeRangeRef = { current: false };

    const syncCharts = (source: IChartApi, target: IChartApi) => {
      source.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (!range || isSyncingTimeRangeRef.current) {
          return;
        }

        isSyncingTimeRangeRef.current = true;
        target.timeScale().setVisibleLogicalRange(range);
        isSyncingTimeRangeRef.current = false;
        overlayRevision((current) => current + 1);
      });
    };

    syncCharts(mainChart, subChart);
    syncCharts(subChart, mainChart);

    const refreshDrawingOverlay = () => overlayRevision((current) => current + 1);
    mainContainer.addEventListener("pointermove", refreshDrawingOverlay);
    mainContainer.addEventListener("wheel", refreshDrawingOverlay, { passive: true });
    window.addEventListener("resize", refreshDrawingOverlay);

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
        syncLastPriceLabel(series, lastClose, priceLabelRef.current, symbol);
      }

      overlayRevision((current) => current + 1);
    });

    resizeObserver.observe(mainContainer);
    resizeObserver.observe(subContainer);

    cleanupCharts = () => {
      window.cancelAnimationFrame(initialSizeFrame);
      resizeObserver.disconnect();
      mainContainer.removeEventListener("pointermove", refreshDrawingOverlay);
      mainContainer.removeEventListener("wheel", refreshDrawingOverlay);
      window.removeEventListener("resize", refreshDrawingOverlay);
      mainChart.remove();
      subChart.remove();
      mainChartRef.current = null;
      subChartRef.current = null;
      mainSeriesRef.current = [];
      subSeriesRef.current = [];
      candleSeriesRef.current = null;
      emaSeriesRef.current = null;
      vwapSeriesRef.current = null;
      vwapUpperSeriesRefsRef.current = [];
      vwapLowerSeriesRefsRef.current = [];
      priceLineRef.current = null;
      lastCloseRef.current = null;
    };

    if (cancelled) cleanupCharts();
    };

    retryFrame = window.requestAnimationFrame(initializeCharts);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(retryFrame);
      cleanupCharts?.();
      setChartReady(false);
    };
  }, []);

  React.useEffect(() => {
    const mainChart = mainChartRef.current;
    const subChart = subChartRef.current;

    if (!chartReady || !mainChart || !subChart) {
      return;
    }

    mainChart.applyOptions({
      localization: {
        priceFormatter: (price: number) => formatChartPrice(price, symbol),
      },
    });

    for (const series of mainSeriesRef.current) {
      mainChart.removeSeries(series);
    }
    mainSeriesRef.current = [];

    for (const series of subSeriesRef.current) {
      subChart.removeSeries(series);
    }
    subSeriesRef.current = [];

    candleSeriesRef.current = null;
    emaSeriesRef.current = null;
    vwapSeriesRef.current = null;
    vwapUpperSeriesRefsRef.current = [];
    vwapLowerSeriesRefsRef.current = [];
    priceLineRef.current = null;
    lastCloseRef.current = null;

    if (priceLabelRef.current) {
      priceLabelRef.current.style.display = "none";
    }

    mainChart.priceScale("right").applyOptions({
      visible: true,
      borderColor: "rgba(255,255,255,0.08)",
    });
    mainChart.priceScale("left").applyOptions({
      visible: false,
    });

    if (displayCandles.length === 0) {
      return;
    }

    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      priceScaleId: "right",
      priceFormat: getChartPriceFormat(symbol),
      upColor: CANDLE_UP,
      downColor: CANDLE_DOWN,
      borderUpColor: CANDLE_UP,
      borderDownColor: CANDLE_DOWN,
      wickUpColor: CANDLE_UP,
      wickDownColor: CANDLE_DOWN,
    });

    const emaSeries = enabledIndicators.includes("ema") ? mainChart.addSeries(LineSeries, {
      priceScaleId: "right",
      color: EMA50_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    }) : null;

    const vwapSeries = enabledIndicators.includes("vwap") ? mainChart.addSeries(LineSeries, {
      priceScaleId: "right",
      color: VWAP_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "VWAP",
    }) : null;

    const vwapUpperSeries = vwapSettings.bands.map((band, index) => band.visible && enabledIndicators.includes("vwap")
      ? mainChart.addSeries(LineSeries, {
          priceScaleId: "right",
          color: VWAP_BAND_COLORS[index],
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `VWAP B${index + 1} Upper`,
        })
      : null);
    const vwapLowerSeries = vwapSettings.bands.map((band, index) => band.visible && enabledIndicators.includes("vwap")
      ? mainChart.addSeries(LineSeries, {
          priceScaleId: "right",
          color: VWAP_BAND_COLORS[index],
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `VWAP B${index + 1} Lower`,
        })
      : null);

    const compareSeries = compareTrack.length > 0
      ? mainChart.addSeries(LineSeries, {
          priceScaleId: "left",
          color: COMPARE_LINE_COLOR,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: normalizedCompareSymbol ?? "Compare",
        })
      : null;

    mainChart.priceScale("right").applyOptions({
      visible: true,
    });
    mainChart.priceScale("left").applyOptions({
      visible: Boolean(compareSeries),
      borderColor: "rgba(192,132,252,0.35)",
    });

    mainSeriesRef.current = [
      ...(emaSeries ? [emaSeries] : []),
      candleSeries,
      ...(vwapSeries ? [vwapSeries] : []),
      ...vwapUpperSeries.filter((series): series is ISeriesApi<"Line"> => Boolean(series)),
      ...vwapLowerSeries.filter((series): series is ISeriesApi<"Line"> => Boolean(series)),
      ...(compareSeries ? [compareSeries] : []),
    ];
    subSeriesRef.current = [];

    const candleData = displayCandles.map((candle) => ({
      time: toSeriesTime(candle.time),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeries.setData(candleData);
    emaSeries?.setData(ema.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    vwapSeries?.setData(vwap.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    vwapUpperSeries.forEach((series, index) => {
      series?.setData(vwap.flatMap((point) => point.upperBands[index] == null ? [] : [{ time: toSeriesTime(point.time), value: point.upperBands[index] as number }]));
    });
    vwapLowerSeries.forEach((series, index) => {
      series?.setData(vwap.flatMap((point) => point.lowerBands[index] == null ? [] : [{ time: toSeriesTime(point.time), value: point.lowerBands[index] as number }]));
    });

    if (compareSeries && compareTrack.length > 0) {
      compareSeries.setData(
        compareTrack.map((point) => ({ time: toSeriesTime(point.time), value: point.value })),
      );
    }

    candleSeriesRef.current = candleSeries;
    emaSeriesRef.current = emaSeries;
    vwapSeriesRef.current = vwapSeries;
    vwapUpperSeriesRefsRef.current = vwapUpperSeries;
    vwapLowerSeriesRefsRef.current = vwapLowerSeries;

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

        syncLastPriceLabel(candleSeries, lastClose, priceLabelRef.current, symbol);
    }

    let labelFrameId = 0;

    const updateLastPriceLabel = () => {
      const price = lastCloseRef.current;

      if (price === null) {
        return;
      }

      cancelAnimationFrame(labelFrameId);
      labelFrameId = requestAnimationFrame(() => {
        syncLastPriceLabel(candleSeries, price, priceLabelRef.current, symbol);
      });
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(updateLastPriceLabel);

    const viewKey = `${symbol}|${timeframe}`;

    if (initialViewKeyRef.current !== viewKey) {
      const visibleBars = getDefaultVisibleBars(timeframe);
      const lastIndex = displayCandles.length - 1;
      const from = Math.max(0, lastIndex - visibleBars + 1);
      const to = Math.max(lastIndex + 4, from + visibleBars);

      mainChart.timeScale().setVisibleLogicalRange({ from, to });
      subChart.timeScale().setVisibleLogicalRange({ from, to });
      mainChart.timeScale().scrollToRealTime();
      subChart.timeScale().scrollToRealTime();
      initialViewKeyRef.current = viewKey;
    }
    window.requestAnimationFrame(() => overlayRevision((current) => current + 1));

    return () => {
      cancelAnimationFrame(labelFrameId);
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(updateLastPriceLabel);
    };
  }, [chartDataKey, chartReady, displayCompareCandles, enabledIndicators, indicatorPeriods, normalizedCompareSymbol, displayCandles, vwapSettings]);



  React.useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series || !effectiveLiveQuote) return;
    const merged = mergeLiveQuoteIntoCandles(candles, effectiveLiveQuote, timeframe);
    const last = merged[merged.length - 1];
    if (!last) return;
    lastCloseRef.current = last.close;
    series.update({ time: toSeriesTime(last.time), open: last.open, high: last.high, low: last.low, close: last.close });
    const emaData = buildIndicatorSeries(merged, calculateEma(merged.map((candle) => candle.close), indicatorPeriods.ema));
    const vwapData = calculateVwap(merged, vwapSettings);
    emaSeriesRef.current?.setData(emaData.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    vwapSeriesRef.current?.setData(vwapData.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    vwapUpperSeriesRefsRef.current.forEach((series, index) => series?.setData(vwapData.flatMap((point) => point.upperBands[index] == null ? [] : [{ time: toSeriesTime(point.time), value: point.upperBands[index] as number }])));
    vwapLowerSeriesRefsRef.current.forEach((series, index) => series?.setData(vwapData.flatMap((point) => point.lowerBands[index] == null ? [] : [{ time: toSeriesTime(point.time), value: point.lowerBands[index] as number }])));
    if (priceLineRef.current) priceLineRef.current.applyOptions({ price: last.close });
    else priceLineRef.current = series.createPriceLine({ price: last.close, color: LAST_PRICE_COLOR, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, lineVisible: true, title: "" });
    syncLastPriceLabel(series, last.close, priceLabelRef.current, symbol);
  }, [candles, effectiveLiveQuote, indicatorPeriods.ema, timeframe, vwapSettings, symbol, syncLastPriceLabel]);
}
