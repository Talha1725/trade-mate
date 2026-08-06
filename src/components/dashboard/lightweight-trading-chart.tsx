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
import { useEodhdMarketQuotes } from "@/hooks/use-eodhd-market-quotes";
import {
  buildIndicatorSeries,
  buildRebasedCompareSeries,
  calculateCandleTrackLine,
  calculateEma,
  calculateEmaUpperEnvelope,
  calculateRollingVwap,
  normalizeIndicatorPanelValues,
} from "@/lib/utils/chart-indicators";
import { mergeLiveQuoteIntoCandles } from "@/lib/utils/merge-live-quote-candles";
import { cn } from "@/lib/utils";
import type { ChartCandle } from "@/types/eodhd";
import type {
  ChartDrawing,
  ChartIndicatorId,
  ChartPoint,
  ChartToolId,
  LightweightTradingChartProps,
} from "@/types/lightweight-trading-chart";

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

function getDefaultVisibleBars(timeframe: string) {
  switch (timeframe) {
    case "1m": return 120;
    case "5m": return 140;
    case "15m": return 160;
    case "1H": return 180;
    case "4H": return 150;
    case "D": return 180;
    case "W": return 120;
    default: return 150;
  }
}

function formatLegendValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const ema20SeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = React.useRef<ISeriesApi<"Area"> | null>(null);
  const vwapSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const rollingVwapSeriesRef = React.useRef<ISeriesApi<"Area"> | null>(null);
  const priceLineRef = React.useRef<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]> | null>(null);
  const priceLabelRef = React.useRef<HTMLDivElement>(null);
  const lastCloseRef = React.useRef<number | null>(null);
  const initialViewKeyRef = React.useRef<string | null>(null);
  const drawingOverlayRef = React.useRef<SVGSVGElement>(null);
  const [activeTool, setActiveTool] = React.useState<ChartToolId>("crosshair");
  const [enabledIndicators, setEnabledIndicators] = React.useState<ChartIndicatorId[]>([]);
  const [magnetEnabled, setMagnetEnabled] = React.useState(false);
  const [drawings, setDrawings] = React.useState<ChartDrawing[]>([]);
  const [draftPoints, setDraftPoints] = React.useState<ChartPoint[]>([]);
  const [renderedDrawings, setRenderedDrawings] = React.useState<React.ReactNode[]>([]);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [overlayRevision, setOverlayRevision] = React.useState(0);

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
  const { data: quoteResponse } = useEodhdMarketQuotes([symbol], {
    refetchInterval: 15_000,
  });
  const {
    data: compareData,
    isLoading: isCompareLoading,
  } = useChartMarketData(normalizedCompareSymbol ?? "", timeframe, {
    enabled: !!normalizedCompareSymbol,
  });
  const candles = data?.candles ?? EMPTY_CANDLES;
  const eodhdLiveQuote = quoteResponse?.quotes[symbol.toUpperCase()] ?? null;
  const effectiveLiveQuote = liveQuote ?? eodhdLiveQuote;
  const compareCandles = compareData?.candles ?? EMPTY_CANDLES;
  const displayCandles = React.useMemo(() => {
    if (!effectiveLiveQuote) {
      return candles;
    }

    return mergeLiveQuoteIntoCandles(candles, effectiveLiveQuote, timeframe);
  }, [candles, effectiveLiveQuote, timeframe]);
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
  const isChartLoading = isLoading || (normalizedCompareSymbol ? isCompareLoading : false);
  const lastDisplayedClose = displayCandles[displayCandles.length - 1]?.close ?? null;

  const toggleIndicator = React.useCallback((indicator: ChartIndicatorId) => {
    setEnabledIndicators((current) =>
      current.includes(indicator)
        ? current.filter((item) => item !== indicator)
        : [...current, indicator],
    );
  }, []);

  const getChartPoint = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const overlay = drawingOverlayRef.current;
      const chart = mainChartRef.current;
      const series = candleSeriesRef.current;

      if (!overlay || !chart || !series) {
        return null;
      }

      const bounds = overlay.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const rawTime = chart.timeScale().coordinateToTime(x);
      const rawPrice = series.coordinateToPrice(y);

      if (rawTime === null || rawPrice === null || typeof rawTime !== "number") {
        return null;
      }

      let point: ChartPoint = { time: rawTime, price: rawPrice };

      if (magnetEnabled && displayCandles.length > 0) {
        const nearest = displayCandles.reduce((best, candle) =>
          Math.abs(candle.time - point.time) < Math.abs(best.time - point.time) ? candle : best,
        );
        const prices = [nearest.open, nearest.high, nearest.low, nearest.close];
        const snappedPrice = prices.reduce((best, price) =>
          Math.abs(price - point.price) < Math.abs(best - point.price) ? price : best,
        );
        point = { time: nearest.time, price: snappedPrice };
      }

      return point;
    },
    [displayCandles, magnetEnabled],
  );

  const commitDrawing = React.useCallback(
    (tool: Exclude<ChartToolId, "crosshair">, points: ChartPoint[], text?: string) => {
      if (points.length === 0) {
        return;
      }

      setDrawings((current) => [
        ...current,
        { id: `${tool}-${Date.now()}-${current.length}`, tool, points, text },
      ]);
      setDraftPoints([]);
    },
    [],
  );

  const handleDrawingPointerDown = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (activeTool === "crosshair") {
        return;
      }

      const point = getChartPoint(event);

      if (!point) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);

      if (activeTool === "brush" || activeTool === "path") {
        setIsDrawing(true);
        setDraftPoints([point]);
        return;
      }

      if (activeTool === "text") {
        const text = window.prompt("Enter chart annotation", "Note");

        if (text?.trim()) {
          commitDrawing(activeTool, [point], text.trim());
        }

        return;
      }

      setDraftPoints((current) => {
        const next = [...current, point];

        if (next.length === 2) {
          commitDrawing(activeTool, next);
          return [];
        }

        return next;
      });
    },
    [activeTool, commitDrawing, getChartPoint],
  );

  const handleDrawingPointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!isDrawing) {
        return;
      }

      const point = getChartPoint(event);

      if (point) {
        setDraftPoints((current) => [...current, point]);
      }
    },
    [getChartPoint, isDrawing],
  );

  const handleDrawingPointerUp = React.useCallback(() => {
    if (!isDrawing) {
      return;
    }

    setIsDrawing(false);

    if (activeTool !== "crosshair" && draftPoints.length > 1) {
      commitDrawing(activeTool, draftPoints);
    } else {
      setDraftPoints([]);
    }
  }, [activeTool, commitDrawing, draftPoints, isDrawing]);

  const adjustZoom = React.useCallback((factor: number) => {
    const chart = mainChartRef.current;
    const range = chart?.timeScale().getVisibleLogicalRange();

    if (!chart || !range) {
      return;
    }

    const span = Math.max(range.to - range.from, 10);
    const maxSpan = Math.max(displayCandles.length + 20, 20);
    const nextSpan = Math.min(Math.max(span * factor, 10), maxSpan);
    const center = (range.from + range.to) / 2;

    chart.timeScale().setVisibleLogicalRange({
      from: center - nextSpan / 2,
      to: center + nextSpan / 2,
    });
  }, [displayCandles.length]);

  const zoomIn = React.useCallback(() => adjustZoom(0.7), [adjustZoom]);
  const zoomOut = React.useCallback(() => adjustZoom(1.6), [adjustZoom]);

  const resetView = React.useCallback(() => {
    const chart = mainChartRef.current;
    const subChart = subChartRef.current;

    if (!chart || !subChart || displayCandles.length === 0) {
      return;
    }

    const visibleBars = getDefaultVisibleBars(timeframe);
    const lastIndex = displayCandles.length - 1;
    const from = Math.max(0, lastIndex - visibleBars + 1);
    const to = Math.max(lastIndex + 4, from + visibleBars);
    const range = { from, to };

    chart.timeScale().setVisibleLogicalRange(range);
    subChart.timeScale().setVisibleLogicalRange(range);
  }, [displayCandles.length, timeframe]);

  const undoDrawing = React.useCallback(() => {
    setDrawings((current) => current.slice(0, -1));
    setDraftPoints([]);
    setIsDrawing(false);
  }, []);

  const toPixelPoint = React.useCallback((point: ChartPoint) => {
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current;

    if (!chart || !series) {
      return null;
    }

    const x = chart.timeScale().timeToCoordinate(toSeriesTime(point.time));
    const y = series.priceToCoordinate(point.price);

    return x === null || y === null ? null : { x: Number(x), y: Number(y) };
  }, []);

  const renderDrawing = React.useCallback(
    (drawing: ChartDrawing) => {
      const points = drawing.points.flatMap((point) => {
        const pixel = toPixelPoint(point);
        return pixel ? [{ x: Number(pixel.x), y: Number(pixel.y) }] : [];
      });

      if (points.length === 0) {
        return null;
      }

      if (drawing.tool === "fibonacci" && points.length >= 2) {
        const [start, end] = points;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

        return (
          <g key={drawing.id}>
            {levels.map((level) => {
              const y = start.y + (end.y - start.y) * level;

              return (
                <g key={`${drawing.id}-${level}`}>
                  <line x1={start.x} x2={end.x} y1={y} y2={y} stroke="#F59E0B" strokeDasharray="4 3" />
                  <text x={end.x + 4} y={y - 3} fill="#F59E0B" fontSize="10">{`${Math.round(level * 100)}%`}</text>
                </g>
              );
            })}
          </g>
        );
      }

      if (drawing.tool === "text") {
        return <text key={drawing.id} x={points[0].x + 5} y={points[0].y - 5} fill="#FFFFFF" fontSize="12">{drawing.text}</text>;
      }

      const path = points.map((point) => `${point.x},${point.y}`).join(" ");
      const isRuler = drawing.tool === "ruler";

      return (
        <g key={drawing.id}>
          <polyline points={path} fill="none" stroke={isRuler ? "#F59E0B" : "#22E0A2"} strokeWidth="2" />
          {isRuler && points.length >= 2 ? (
            <text x={points[1].x + 5} y={points[1].y - 5} fill="#F59E0B" fontSize="11">
              {formatLegendValue(Math.abs(drawing.points[1].price - drawing.points[0].price))}
            </text>
          ) : null}
        </g>
      );
    },
    [toPixelPoint],
  );

  React.useEffect(() => {
    const preview =
      draftPoints.length > 0 && activeTool !== "text" && activeTool !== "crosshair"
        ? [{ id: "draft", tool: activeTool, points: draftPoints } satisfies ChartDrawing]
        : [];

    const nextDrawings =
      [...drawings, ...preview]
        .map(renderDrawing)
        .filter((drawing): drawing is React.ReactElement => drawing !== null);
    const frame = window.requestAnimationFrame(() => setRenderedDrawings(nextDrawings));

    return () => window.cancelAnimationFrame(frame);
  }, [activeTool, draftPoints, drawings, overlayRevision, renderDrawing]);

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
        visible: true,
        borderColor: "rgba(255,255,255,0.08)",
      },
      leftPriceScale: {
        visible: false,
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
        setOverlayRevision((current) => current + 1);
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

      setOverlayRevision((current) => current + 1);
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
      ema20SeriesRef.current = null;
      ema50SeriesRef.current = null;
      vwapSeriesRef.current = null;
      rollingVwapSeriesRef.current = null;
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
    ema20SeriesRef.current = null;
    ema50SeriesRef.current = null;
    vwapSeriesRef.current = null;
    rollingVwapSeriesRef.current = null;
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
      upColor: CANDLE_UP,
      downColor: CANDLE_DOWN,
      borderUpColor: CANDLE_UP,
      borderDownColor: CANDLE_DOWN,
      wickUpColor: CANDLE_UP,
      wickDownColor: CANDLE_DOWN,
    });

    const ema20 = enabledIndicators.includes("ema20")
      ? buildIndicatorSeries(displayCandles, calculateEma(displayCandles.map((candle) => candle.close), 20))
      : [];
    const ema50 = enabledIndicators.includes("ema50")
      ? buildIndicatorSeries(displayCandles, calculateEmaUpperEnvelope(displayCandles, 50))
      : [];
    const vwapTrack = enabledIndicators.includes("vwap")
      ? buildIndicatorSeries(displayCandles, calculateCandleTrackLine(displayCandles))
      : [];
    const rollingVwapValues = enabledIndicators.includes("rolling-vwap")
      ? calculateRollingVwap(displayCandles, 20)
      : [];

    const ema50AreaSeries = enabledIndicators.includes("ema50") ? mainChart.addSeries(AreaSeries, {
      priceScaleId: "right",
      lineColor: EMA50_COLOR,
      topColor: "rgba(59, 130, 246, 0.22)",
      bottomColor: "rgba(59, 130, 246, 0.01)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    }) : null;

    const ema20Series = enabledIndicators.includes("ema20") ? mainChart.addSeries(LineSeries, {
      priceScaleId: "right",
      color: CANDLE_UP,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    }) : null;

    const vwapSeries = enabledIndicators.includes("vwap") ? mainChart.addSeries(LineSeries, {
      priceScaleId: "right",
      color: VWAP_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    }) : null;

    const compareTrack = normalizedCompareSymbol
      ? buildRebasedCompareSeries(displayCandles, compareCandles)
      : [];

    const compareSeries = compareTrack.length > 0
      ? mainChart.addSeries(LineSeries, {
          priceScaleId: "right",
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
      visible: false,
    });

    const rollingVwapPanelValues = normalizeIndicatorPanelValues(rollingVwapValues, 12);
    const rollingVwapArea = enabledIndicators.includes("rolling-vwap") ? subChart.addSeries(AreaSeries, {
      lineColor: ROLLING_VWAP_COLOR,
      topColor: "rgba(3, 213, 213, 0.5)",
      bottomColor: "rgba(3, 213, 213, 0.02)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    }) : null;

    mainSeriesRef.current = [
      ...(ema50AreaSeries ? [ema50AreaSeries] : []),
      ...(ema20Series ? [ema20Series] : []),
      candleSeries,
      ...(vwapSeries ? [vwapSeries] : []),
      ...(compareSeries ? [compareSeries] : []),
    ];
    subSeriesRef.current = rollingVwapArea ? [rollingVwapArea] : [];

    const candleData = displayCandles.map((candle) => ({
      time: toSeriesTime(candle.time),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeries.setData(candleData);
    ema20Series?.setData(ema20.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    ema50AreaSeries?.setData(ema50.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    vwapSeries?.setData(vwapTrack.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));

    if (compareSeries && compareTrack.length > 0) {
      compareSeries.setData(
        compareTrack.map((point) => ({ time: toSeriesTime(point.time), value: point.value })),
      );
    }

    rollingVwapArea?.setData(
      displayCandles.map((candle, index) => ({
        time: toSeriesTime(candle.time),
        value: rollingVwapPanelValues[index] ?? 0,
      })),
    );

    candleSeriesRef.current = candleSeries;
    ema20SeriesRef.current = ema20Series;
    ema50SeriesRef.current = ema50AreaSeries;
    vwapSeriesRef.current = vwapSeries;
    rollingVwapSeriesRef.current = rollingVwapArea;

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

    const viewKey = `${symbol}|${timeframe}`;

    if (initialViewKeyRef.current !== viewKey) {
      const visibleBars = getDefaultVisibleBars(timeframe);
      const lastIndex = displayCandles.length - 1;
      const from = Math.max(0, lastIndex - visibleBars + 1);
      const to = Math.max(lastIndex + 4, from + visibleBars);

      mainChart.timeScale().setVisibleLogicalRange({ from, to });
      subChart.timeScale().setVisibleLogicalRange({ from, to });
      initialViewKeyRef.current = viewKey;
    }
    window.requestAnimationFrame(() => setOverlayRevision((current) => current + 1));

    return () => {
      cancelAnimationFrame(labelFrameId);
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(updateLastPriceLabel);
    };
  }, [chartDataKey, enabledIndicators]);

  React.useEffect(() => {
    const series = candleSeriesRef.current;

    if (!series || !effectiveLiveQuote) {
      return;
    }

    const merged = mergeLiveQuoteIntoCandles(candles, effectiveLiveQuote, timeframe);
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

    const ema20 = buildIndicatorSeries(merged, calculateEma(merged.map((candle) => candle.close), 20));
    const ema50 = buildIndicatorSeries(merged, calculateEmaUpperEnvelope(merged, 50));
    const vwap = buildIndicatorSeries(merged, calculateCandleTrackLine(merged));
    const rollingVwap = normalizeIndicatorPanelValues(calculateRollingVwap(merged, 20), 12);

    ema20SeriesRef.current?.setData(ema20.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    ema50SeriesRef.current?.setData(ema50.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    vwapSeriesRef.current?.setData(vwap.map((point) => ({ time: toSeriesTime(point.time), value: point.value })));
    rollingVwapSeriesRef.current?.setData(
      merged.map((candle, index) => ({
        time: toSeriesTime(candle.time),
        value: rollingVwap[index] ?? 0,
      })),
    );

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
  }, [candles, effectiveLiveQuote, timeframe]);

  return (
    <div
      className={cn(
        "overflow-hidden h-full",
        className,
      )}
    >
      <div className="flex min-h-[560px] gap-x-2 h-full">
        <ChartToolbar
          activeTool={activeTool}
          magnetEnabled={magnetEnabled}
          enabledIndicators={enabledIndicators}
          onToolChange={(tool) => {
            setActiveTool(tool);
            setDraftPoints([]);
            setIsDrawing(false);
          }}
          onMagnetToggle={() => setMagnetEnabled((current) => !current)}
          onIndicatorToggle={toggleIndicator}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
          onUndo={undoDrawing}
        />

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
            <svg
              ref={drawingOverlayRef}
              data-revision={overlayRevision}
              className={cn(
                "absolute inset-0 z-[5] h-full w-full",
                activeTool === "crosshair" ? "pointer-events-none" : "pointer-events-auto cursor-crosshair",
              )}
              onPointerDown={handleDrawingPointerDown}
              onPointerMove={handleDrawingPointerMove}
              onPointerUp={handleDrawingPointerUp}
              onPointerCancel={handleDrawingPointerUp}
            >
              {renderedDrawings}
            </svg>
            {lastDisplayedClose !== null ? (
              <div
                ref={priceLabelRef}
                className="pointer-events-none absolute right-0 z-10 hidden -translate-y-1/2 rounded-[4px] border-[1.36px] border-[#22E0A2] bg-[#22E0A2] px-2 py-0.5 text-xs font-medium text-white"
              />
            ) : null}
          </div>

          <div className={cn(
            "h-[140px] border-t border-white/10",
            !enabledIndicators.includes("rolling-vwap") && "hidden",
          )}>
            <div ref={subContainerRef} className="h-full w-full [&_.tv-lightweight-charts]:bg-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
