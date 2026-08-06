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
  AnyChartDrawing,
  ChartIndicatorId,
  ChartPoint,
  ChartToolId,
  LightweightTradingChartProps,
  TrendlineDrawing,
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
const TRENDLINE_DEFAULT_STYLE = {
  color: "#2962FF",
  opacity: 1,
  width: 2,
  lineStyle: "solid" as const,
  leftEnd: "normal" as const,
  rightEnd: "normal" as const,
  extendLeft: false,
  extendRight: false,
};
const TRENDLINE_DEFAULT_STATS = {
  visible: true,
  showPriceChange: true,
  showPercentChange: true,
  showBarsRange: false,
  showTimeRange: false,
  showAngle: false,
  position: "above" as const,
};
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

function formatSignedLegendValue(value: number) {
  const formatted = formatLegendValue(Math.abs(value));
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

function formatTrendlinePrice(value: number) {
  if (Math.abs(value) < 10) {
    return value.toFixed(5);
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTrendlineTime(time: number) {
  const date = new Date(time * 1000);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = String(date.getUTCFullYear()).slice(-2);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} '${year} ${hours}:${minutes}`;
}

function toSeriesTime(time: number) {
  return time as UTCTimestamp;
}

function getTrendlineStrokeDash(style: TrendlineDrawing["style"]) {
  if (style.lineStyle === "dashed") {
    return "8 5";
  }

  if (style.lineStyle === "dotted") {
    return "2 4";
  }

  return undefined;
}

function getExtendedTrendlinePoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  height: number,
  extendLeft: boolean,
  extendRight: boolean,
) {
  if (Math.abs(end.x - start.x) < 0.0001) {
    return {
      start: extendLeft ? { x: start.x, y: 0 } : start,
      end: extendRight ? { x: end.x, y: height } : end,
    };
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const intersections: Array<{ x: number; y: number }> = [];

  const addAtX = (x: number) => {
    if (Math.abs(dx) < 0.0001) {
      return;
    }

    const y = start.y + ((x - start.x) * dy) / dx;
    if (y >= 0 && y <= height) {
      intersections.push({ x, y });
    }
  };

  const addAtY = (y: number) => {
    if (Math.abs(dy) < 0.0001) {
      return;
    }

    const x = start.x + ((y - start.y) * dx) / dy;
    if (x >= 0 && x <= width) {
      intersections.push({ x, y });
    }
  };

  addAtX(0);
  addAtX(width);
  addAtY(0);
  addAtY(height);

  const direction = dx === 0 ? 1 : dx;
  const leftBoundary = intersections
    .filter((point) => (direction > 0 ? point.x <= start.x : point.x >= start.x))
    .sort((a, b) => Math.abs(a.x - start.x) - Math.abs(b.x - start.x))[0];
  const rightBoundary = intersections
    .filter((point) => (direction > 0 ? point.x >= end.x : point.x <= end.x))
    .sort((a, b) => Math.abs(a.x - end.x) - Math.abs(b.x - end.x))[0];

  return {
    start: extendLeft && leftBoundary ? leftBoundary : start,
    end: extendRight && rightBoundary ? rightBoundary : end,
  };
}

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + projection * dx), point.y - (start.y + projection * dy));
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
  const [drawings, setDrawings] = React.useState<AnyChartDrawing[]>([]);
  const [redoDrawings, setRedoDrawings] = React.useState<AnyChartDrawing[]>([]);
  const [draftPoints, setDraftPoints] = React.useState<ChartPoint[]>([]);
  const [draftPreviewPoint, setDraftPreviewPoint] = React.useState<ChartPoint | null>(null);
  const [renderedDrawings, setRenderedDrawings] = React.useState<React.ReactNode[]>([]);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [selectedDrawingId, setSelectedDrawingId] = React.useState<string | null>(null);
  const [hoveredTrendlineId, setHoveredTrendlineId] = React.useState<string | null>(null);
  const [hoveredTrendlineEndpoint, setHoveredTrendlineEndpoint] = React.useState<0 | 1 | null>(null);
  const [isDraggingTrendline, setIsDraggingTrendline] = React.useState(false);
  const draggingTrendlineRef = React.useRef<{
    id: string;
    mode: "endpoint" | "body";
    endpoint?: 0 | 1;
    start?: ChartPoint;
    originalPoints?: [ChartPoint, ChartPoint];
  } | null>(null);
  const draggingDraftTrendlineRef = React.useRef(false);
  const draftTrendlineAnchorRef = React.useRef<ChartPoint | null>(null);
  const draftTrendlineMovedRef = React.useRef(false);
  const draftTrendlinePointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const draftTrendlinePendingClickPointRef = React.useRef<ChartPoint | null>(null);
  const [overlayRevision, setOverlayRevision] = React.useState(0);
  const drawingsStorageKey = `trade-mate:chart-drawings:${symbol}:${timeframe}`;
  const drawingsHydratedRef = React.useRef(false);

  React.useEffect(() => {
    drawingsHydratedRef.current = false;

    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(drawingsStorageKey);
        setDrawings(stored ? JSON.parse(stored) as AnyChartDrawing[] : []);
      } catch {
        setDrawings([]);
      }

      setRedoDrawings([]);
      setSelectedDrawingId(null);
      drawingsHydratedRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [drawingsStorageKey]);

  React.useEffect(() => {
    if (drawingsHydratedRef.current) {
      window.localStorage.setItem(drawingsStorageKey, JSON.stringify(drawings));
    }
  }, [drawings, drawingsStorageKey]);

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

      let point: ChartPoint = { time: rawTime, price: rawPrice, snappedField: null };

      if (magnetEnabled && displayCandles.length > 0) {
        const nearestIndex = displayCandles.reduce(
          (bestIndex, candle, index) =>
            Math.abs(candle.time - point.time) < Math.abs(displayCandles[bestIndex].time - point.time)
              ? index
              : bestIndex,
          0,
        );
        const nearest = displayCandles[nearestIndex];
        const fields = [
          ["open", nearest.open],
          ["high", nearest.high],
          ["low", nearest.low],
          ["close", nearest.close],
        ] as const;
        const [snappedField, snappedPrice] = fields.reduce((best, current) =>
          Math.abs(current[1] - point.price) < Math.abs(best[1] - point.price) ? current : best,
        );
        point = { time: nearest.time, price: snappedPrice, logicalIndex: nearestIndex, snappedField };
      }

      return point;
    },
    [displayCandles, magnetEnabled],
  );

  const commitDrawing = React.useCallback(
    (tool: Exclude<ChartToolId, "crosshair" | "trendline">, points: ChartPoint[], text?: string) => {
      if (points.length === 0) {
        return;
      }

      setDrawings((current) => [
        ...current,
        { id: `${tool}-${Date.now()}-${current.length}`, tool, points, text },
      ]);
      setRedoDrawings([]);
      setDraftPoints([]);
      setDraftPreviewPoint(null);
    },
    [],
  );

  const commitTrendline = React.useCallback((points: [ChartPoint, ChartPoint]) => {
    if (points[0].time === points[1].time && points[0].price === points[1].price) {
      return;
    }

    const now = Date.now();
    const drawing: TrendlineDrawing = {
      id: `trendline-${now}-${Math.random().toString(36).slice(2, 8)}`,
      tool: "trendline",
      points,
      style: TRENDLINE_DEFAULT_STYLE,
      stats: TRENDLINE_DEFAULT_STATS,
      locked: false,
      hidden: false,
      createdAt: now,
      updatedAt: now,
    };

    setDrawings((current) => [...current, drawing]);
    setRedoDrawings([]);
    setSelectedDrawingId(drawing.id);
    setDraftPoints([]);
    setDraftPreviewPoint(null);
    setDraftPreviewPoint(null);
    draftTrendlineAnchorRef.current = null;
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

  const findTrendlineAtPoint = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const overlay = drawingOverlayRef.current;
    if (!overlay) {
      return null;
    }

    const bounds = overlay.getBoundingClientRect();
    const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };

    for (const drawing of [...drawings].reverse()) {
      if (drawing.tool !== "trendline" || drawing.hidden) {
        continue;
      }

      const pixels = drawing.points.map(toPixelPoint);
      if (!pixels[0] || !pixels[1]) {
        continue;
      }

      const segment = getExtendedTrendlinePoints(
        pixels[0],
        pixels[1],
        overlay.clientWidth,
        overlay.clientHeight,
        drawing.style.extendLeft,
        drawing.style.extendRight,
      );

      if (distanceToSegment(pointer, segment.start, segment.end) <= Math.max(10, drawing.style.width + 8)) {
        return drawing.id;
      }
    }

    return null;
  }, [drawings, toPixelPoint]);

  const findTrendlineHandleAtPoint = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const overlay = drawingOverlayRef.current;
    if (!overlay) {
      return null;
    }

    const bounds = overlay.getBoundingClientRect();
    const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };

    for (const drawing of [...drawings].reverse()) {
      if (drawing.tool !== "trendline" || drawing.hidden || drawing.locked) {
        continue;
      }

      const pixels = drawing.points.map(toPixelPoint);
      if (!pixels[0] || !pixels[1]) {
        continue;
      }

      const endpoint = pixels.findIndex((pixel) => pixel !== null && Math.hypot(pointer.x - pixel.x, pointer.y - pixel.y) <= 12);
      if (endpoint === 0 || endpoint === 1) {
        return { id: drawing.id, endpoint: endpoint as 0 | 1 };
      }
    }

    return null;
  }, [drawings, toPixelPoint]);

  const handleDrawingPointerDown = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (activeTool === "crosshair") {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);

      if (activeTool === "trendline") {
        if (draftPoints.length === 1) {
          // The next pointer gesture extends the line from the fixed first
          // anchor. The endpoint is committed by the following click.
          const clickPoint = getChartPoint(event);
          if (clickPoint) {
            draftTrendlinePendingClickPointRef.current = clickPoint;
          }
          setDraftPreviewPoint(null);
          draggingDraftTrendlineRef.current = true;
          draftTrendlineMovedRef.current = false;
          draftTrendlinePointerStartRef.current = { x: event.clientX, y: event.clientY };
          setIsDrawing(true);
          return;
        }

        const point = getChartPoint(event);
        if (!point) {
          return;
        }

        if (draftPoints.length === 0) {
          const handle = findTrendlineHandleAtPoint(event);
          if (handle) {
            draggingTrendlineRef.current = { ...handle, mode: "endpoint" };
            setSelectedDrawingId(handle.id);
            setIsDraggingTrendline(true);
            return;
          }

          const hitDrawingId = findTrendlineAtPoint(event);

          if (hitDrawingId) {
            setSelectedDrawingId(hitDrawingId);
            const hitDrawing = drawings.find((drawing) => drawing.id === hitDrawingId);
            if (hitDrawing?.tool === "trendline" && !hitDrawing.locked) {
              draggingTrendlineRef.current = {
                id: hitDrawing.id,
                mode: "body",
                start: point,
                originalPoints: [...hitDrawing.points] as [ChartPoint, ChartPoint],
              };
              setIsDraggingTrendline(true);
            }
            return;
          }

          setSelectedDrawingId(null);
        }

        if (draftPoints.length === 0) {
          setDraftPoints([point]);
          setDraftPreviewPoint(null);
          draftTrendlineAnchorRef.current = point;
          draftTrendlinePendingClickPointRef.current = null;
          draggingDraftTrendlineRef.current = true;
          draftTrendlineMovedRef.current = false;
          draftTrendlinePointerStartRef.current = { x: event.clientX, y: event.clientY };
          setIsDrawing(true);
        } else {
          // The drag-release already fixed the second anchor. The following
          // click only confirms the line and must not move that endpoint.
          commitTrendline([draftPoints[0], draftPoints[1] ?? point]);
        }

        return;
      }

      const point = getChartPoint(event);

      if (!point) {
        return;
      }

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
    [activeTool, commitDrawing, commitTrendline, drawings, draftPoints, findTrendlineAtPoint, findTrendlineHandleAtPoint, getChartPoint],
  );

  const handleDrawingPointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (draggingDraftTrendlineRef.current) {
        const pointerStart = draftTrendlinePointerStartRef.current;
        if (pointerStart && !draftTrendlineMovedRef.current) {
          const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
          if (distance < 4) {
            return;
          }
          draftTrendlineMovedRef.current = true;
        }

        const point = getChartPoint(event);
        if (point) {
          setDraftPoints((current) => {
            const anchor = draftTrendlineAnchorRef.current ?? current[0];
            return anchor ? [anchor, point] : current;
          });
          setDraftPreviewPoint(null);
        }
        return;
      }

      const draggingTrendline = draggingTrendlineRef.current;
      if (draggingTrendline) {
        const point = getChartPoint(event);
        if (point) {
          setDrawings((current) => current.map((drawing) => {
            if (drawing.id !== draggingTrendline.id || drawing.tool !== "trendline") {
              return drawing;
            }

            if (draggingTrendline.mode === "body" && draggingTrendline.start && draggingTrendline.originalPoints) {
              const timeDelta = point.time - draggingTrendline.start.time;
              const priceDelta = point.price - draggingTrendline.start.price;
              const points: [ChartPoint, ChartPoint] = draggingTrendline.originalPoints.map((original) => ({
                ...original,
                time: original.time + timeDelta,
                price: original.price + priceDelta,
              })) as [ChartPoint, ChartPoint];
              return { ...drawing, points, updatedAt: Date.now() };
            }

            const points: [ChartPoint, ChartPoint] = [...drawing.points] as [ChartPoint, ChartPoint];
            if (draggingTrendline.endpoint !== undefined) {
              points[draggingTrendline.endpoint] = point;
            }
            return { ...drawing, points, updatedAt: Date.now() };
          }));
        }
        return;
      }

      if (!isDrawing && !(activeTool === "trendline" && draftPoints.length === 1)) {
        if (activeTool === "trendline") {
          const handle = findTrendlineHandleAtPoint(event);
          setHoveredTrendlineId(handle?.id ?? findTrendlineAtPoint(event));
          setHoveredTrendlineEndpoint(handle?.endpoint ?? null);
        }
        return;
      }

      const point = getChartPoint(event);

      if (point && activeTool === "trendline" && draftPoints.length === 1) {
        // Keep the first anchor fixed and extend the preview line to the cursor.
        setDraftPreviewPoint(point);
      } else if (point) {
        setDraftPoints((current) => [...current, point]);
      }
    },
    [activeTool, draftPoints, findTrendlineAtPoint, findTrendlineHandleAtPoint, getChartPoint, isDrawing],
  );

  const handleDrawingPointerUp = React.useCallback(() => {
    if (draggingDraftTrendlineRef.current) {
      draggingDraftTrendlineRef.current = false;

      if (!draftTrendlineMovedRef.current && draftTrendlinePendingClickPointRef.current && draftPoints[0]) {
        commitTrendline([draftPoints[0], draftTrendlinePendingClickPointRef.current]);
        draftTrendlinePendingClickPointRef.current = null;
        draftTrendlinePointerStartRef.current = null;
        setIsDrawing(false);
        return;
      }

      draftTrendlineAnchorRef.current = draftPoints[0] ?? draftTrendlineAnchorRef.current;
      draftTrendlineMovedRef.current = false;
      draftTrendlinePointerStartRef.current = null;
      draftTrendlinePendingClickPointRef.current = null;
      setIsDrawing(false);
      return;
    }

    if (draggingTrendlineRef.current) {
      draggingTrendlineRef.current = null;
      setIsDraggingTrendline(false);
      return;
    }

    if (activeTool === "trendline") {
      setIsDrawing(false);
      return;
    }

    if (!isDrawing) {
      return;
    }

    setIsDrawing(false);
    setHoveredTrendlineId(null);
    setHoveredTrendlineEndpoint(null);

    if (activeTool !== "crosshair" && draftPoints.length > 1) {
      commitDrawing(activeTool, draftPoints);
    } else {
      setDraftPoints([]);
      setDraftPreviewPoint(null);
    }
  }, [activeTool, commitDrawing, commitTrendline, draftPoints, isDrawing]);

  React.useEffect(() => {
    const handleDraftPointerMove = (event: PointerEvent) => {
      if (!draggingDraftTrendlineRef.current) {
        return;
      }

      const pointerStart = draftTrendlinePointerStartRef.current;
      if (pointerStart && !draftTrendlineMovedRef.current) {
        if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 4) {
          return;
        }
        draftTrendlineMovedRef.current = true;
      }

      const point = getChartPoint(event as unknown as React.PointerEvent<SVGSVGElement>);
      if (point) {
          setDraftPoints((current) => {
            const anchor = draftTrendlineAnchorRef.current ?? current[0];
            return anchor ? [anchor, point] : current;
          });
          setDraftPreviewPoint(null);
      }
    };

    window.addEventListener("pointermove", handleDraftPointerMove);
    return () => window.removeEventListener("pointermove", handleDraftPointerMove);
  }, [getChartPoint]);

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
    setDrawings([]);
    setRedoDrawings([]);
    setSelectedDrawingId(null);
    setDraftPoints([]);
    setDraftPreviewPoint(null);
    setIsDrawing(false);
    draggingTrendlineRef.current = null;
    draggingDraftTrendlineRef.current = false;
    draftTrendlineAnchorRef.current = null;
    draftTrendlineMovedRef.current = false;
    draftTrendlinePointerStartRef.current = null;
    draftTrendlinePendingClickPointRef.current = null;
    setIsDraggingTrendline(false);

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
    setDrawings((current) => {
      const removed = current[current.length - 1];
      if (removed) {
        setRedoDrawings((redo) => [...redo, removed]);
      }
      return current.slice(0, -1);
    });
    setSelectedDrawingId(null);
    setDraftPoints([]);
    setIsDrawing(false);
  }, []);

  const redoDrawing = React.useCallback(() => {
    setRedoDrawings((current) => {
      const restored = current[current.length - 1];
      if (restored) {
        setDrawings((drawingsCurrent) => [...drawingsCurrent, restored]);
        setSelectedDrawingId(restored.id);
      }
      return current.slice(0, -1);
    });
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditingText = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if (isEditingText) {
        return;
      }

      if (event.key === "Escape") {
        if (draftPoints.length > 0 || isDrawing) {
          setDraftPoints([]);
          setDraftPreviewPoint(null);
          setIsDrawing(false);
          return;
        }

        setSelectedDrawingId(null);
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedDrawingId) {
        setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId));
        setSelectedDrawingId(null);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoDrawing();
        } else {
          undoDrawing();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draftPoints.length, isDrawing, redoDrawing, selectedDrawingId, undoDrawing]);

  const renderDrawing = React.useCallback(
    (drawing: AnyChartDrawing) => {
      if (drawing.tool === "trendline") {
        if (drawing.hidden) {
          return null;
        }

        const isDraft = drawing.id === "draft-trendline";
        const points = drawing.points.flatMap((point) => {
          const pixel = toPixelPoint(point);
          return pixel ? [{ x: Number(pixel.x), y: Number(pixel.y) }] : [];
        });

        if (points.length < 2) {
          return null;
        }

        const overlay = drawingOverlayRef.current;
        const width = overlay?.clientWidth ?? 0;
        const height = overlay?.clientHeight ?? 0;
        const segment = getExtendedTrendlinePoints(
          points[0],
          points[1],
          width,
          height,
          drawing.style.extendLeft,
          drawing.style.extendRight,
        );
        const dash = getTrendlineStrokeDash(drawing.style);
        const opacity = Math.max(0, Math.min(1, drawing.style.opacity));
        const dx = segment.end.x - segment.start.x;
        const dy = segment.end.y - segment.start.y;
        const length = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const arrow = (point: { x: number; y: number }, direction: 1 | -1) => {
          const ux = (dx / length) * direction;
          const uy = (dy / length) * direction;
          const size = Math.min(10, Math.max(6, drawing.style.width * 3));
          const px = -uy;
          const py = ux;
          return `${point.x},${point.y} ${point.x - ux * size + px * size * 0.55},${point.y - uy * size + py * size * 0.55} ${point.x - ux * size - px * size * 0.55},${point.y - uy * size - py * size * 0.55}`;
        };
        const priceChange = drawing.points[1].price - drawing.points[0].price;
        const percentChange = drawing.points[0].price !== 0
          ? (priceChange / drawing.points[0].price) * 100
          : null;
        const midpoint = {
          x: (points[0].x + points[1].x) / 2,
          y: (points[0].y + points[1].y) / 2,
        };
        const endpointDx = points[1].x - points[0].x;
        const endpointDy = points[1].y - points[0].y;
        const endpointLength = Math.hypot(endpointDx, endpointDy);
        let normalX = endpointLength > 0 ? -endpointDy / endpointLength : 0;
        let normalY = endpointLength > 0 ? endpointDx / endpointLength : -1;
        if (normalY > 0) {
          normalX *= -1;
          normalY *= -1;
        }
        const statsWidth = 180;
        const statsHeight = 28;
        const statsCenterX = midpoint.x + normalX * 20;
        const statsCenterY = midpoint.y + normalY * 20;
        const statsX = Math.max(0, Math.min(width - statsWidth, statsCenterX - statsWidth / 2));
        const statsY = Math.max(0, Math.min(height - statsHeight, statsCenterY - statsHeight / 2));
        const statsText = [
          drawing.stats.showPriceChange ? formatSignedLegendValue(priceChange) : null,
          drawing.stats.showPercentChange && percentChange !== null
            ? `(${percentChange < 0 ? "-" : "+"}${Math.abs(percentChange).toFixed(2)}%)`
            : null,
        ].filter(Boolean).join(" ");
        const showAxisMarkers = (selectedDrawingId === drawing.id && !isDraft) || (isDraft && points.length >= 2);
        const axisLabelWidth = 78;
        const timeLabelWidth = 104;
        const axisLabelHeight = 20;
        const firstPriceLabelY = Math.max(0, Math.min(height - axisLabelHeight, points[0].y - axisLabelHeight / 2));
        const secondPriceLabelY = Math.max(0, Math.min(height - axisLabelHeight, points[1].y - axisLabelHeight / 2));
        const firstTimeLabelX = Math.max(0, Math.min(width - timeLabelWidth, points[0].x - timeLabelWidth / 2));
        const secondTimeLabelX = Math.max(0, Math.min(width - timeLabelWidth, points[1].x - timeLabelWidth / 2));

        return (
          <g key={drawing.id} opacity={opacity}>
            <line
              x1={segment.start.x}
              y1={segment.start.y}
              x2={segment.end.x}
              y2={segment.end.y}
              stroke="transparent"
              strokeWidth={Math.max(10, drawing.style.width + 8)}
              pointerEvents="stroke"
            />
            <line
              x1={segment.start.x}
              y1={segment.start.y}
              x2={segment.end.x}
              y2={segment.end.y}
              stroke={drawing.style.color}
              strokeWidth={drawing.style.width}
              strokeDasharray={dash}
              strokeLinecap="round"
            />
            {drawing.style.leftEnd === "arrow" ? <polygon points={arrow(segment.start, 1)} fill={drawing.style.color} /> : null}
            {drawing.style.rightEnd === "arrow" ? <polygon points={arrow(segment.end, -1)} fill={drawing.style.color} /> : null}
            {drawing.stats.visible ? (
              <foreignObject
                x={statsX}
                y={statsY}
                width={statsWidth}
                height={statsHeight}
                pointerEvents="none"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    color: drawing.style.color,
                    background: "rgba(10, 14, 22, 0.82)",
                    border: `1px solid ${drawing.style.color}`,
                    borderRadius: 4,
                    padding: "3px 6px",
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                  }}
                >
                  {statsText}
                </div>
              </foreignObject>
            ) : null}
            {showAxisMarkers ? (
              <>
                {[{ point: points[0], y: firstPriceLabelY, value: drawing.points[0].price }, { point: points[1], y: secondPriceLabelY, value: drawing.points[1].price }].map((item, index) => (
                  <g key={`${drawing.id}-price-axis-${index}`} pointerEvents="none">
                    <rect x={width - axisLabelWidth} y={item.y} width={axisLabelWidth} height={axisLabelHeight} rx="2" fill={drawing.style.color} />
                    <text x={width - axisLabelWidth + 5} y={item.y + 14} fill="#FFFFFF" fontSize="11" fontWeight="500">{formatTrendlinePrice(item.value)}</text>
                  </g>
                ))}
                {[{ x: firstTimeLabelX, time: drawing.points[0].time }, { x: secondTimeLabelX, time: drawing.points[1].time }].map((item, index) => (
                  <g key={`${drawing.id}-time-axis-${index}`} pointerEvents="none">
                    <rect x={item.x} y={height - axisLabelHeight} width={timeLabelWidth} height={axisLabelHeight} rx="2" fill={drawing.style.color} />
                    <text x={item.x + 5} y={height - 6} fill="#FFFFFF" fontSize="11" fontWeight="500">{formatTrendlineTime(item.time)}</text>
                  </g>
                ))}
              </>
            ) : null}
            {selectedDrawingId === drawing.id || isDraft ? (
              <>
                {points.map((point, index) => (
                  <g key={`${drawing.id}-handle-${index}`}>
                    <circle cx={point.x} cy={point.y} r="4.5" fill="#FFFFFF" stroke={drawing.style.color} strokeWidth="2" />
                  </g>
                ))}
              </>
            ) : null}
          </g>
        );
      }

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
    [selectedDrawingId, toPixelPoint],
  );

  React.useEffect(() => {
    const preview: AnyChartDrawing[] =
      draftPoints.length > 0 && activeTool === "trendline"
        ? [{
            id: "draft-trendline",
            tool: "trendline",
            points: [draftPoints[0], draftPoints[1] ?? draftPreviewPoint ?? draftPoints[0]],
            style: { ...TRENDLINE_DEFAULT_STYLE, opacity: 0.7 },
            stats: { ...TRENDLINE_DEFAULT_STATS, visible: false },
            locked: false,
            hidden: false,
            createdAt: 0,
            updatedAt: 0,
          }]
        : draftPoints.length > 0 && activeTool !== "text" && activeTool !== "crosshair"
          ? [{
              id: "draft",
              tool: activeTool as Exclude<ChartToolId, "crosshair" | "trendline">,
              points: draftPoints,
            }]
          : [];

    const nextDrawings =
      [...drawings, ...preview]
        .map(renderDrawing)
        .filter((drawing): drawing is React.ReactElement => drawing !== null);
    const frame = window.requestAnimationFrame(() => setRenderedDrawings(nextDrawings));

    return () => window.cancelAnimationFrame(frame);
  }, [activeTool, draftPoints, draftPreviewPoint, drawings, overlayRevision, renderDrawing]);

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
            draggingTrendlineRef.current = null;
            draggingDraftTrendlineRef.current = false;
            draftTrendlineAnchorRef.current = null;
            draftTrendlineMovedRef.current = false;
            draftTrendlinePointerStartRef.current = null;
            draftTrendlinePendingClickPointRef.current = null;
            setIsDraggingTrendline(false);
          }}
          onMagnetToggle={() => setMagnetEnabled((current) => !current)}
          onIndicatorToggle={toggleIndicator}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
          onUndo={undoDrawing}
          onRedo={redoDrawings.length > 0 ? redoDrawing : () => undefined}
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
                activeTool === "crosshair"
                  ? "pointer-events-none"
                  : isDraggingTrendline
                    ? "pointer-events-auto cursor-grabbing"
                    : hoveredTrendlineEndpoint !== null
                      ? "pointer-events-auto cursor-grab"
                      : hoveredTrendlineId
                        ? "pointer-events-auto cursor-move"
                        : "pointer-events-auto cursor-crosshair",
              )}
              onPointerDown={handleDrawingPointerDown}
              onPointerMove={handleDrawingPointerMove}
              onPointerUp={handleDrawingPointerUp}
              onPointerCancel={handleDrawingPointerUp}
              onPointerLeave={() => {
                if (!isDraggingTrendline) {
                  setHoveredTrendlineId(null);
                  setHoveredTrendlineEndpoint(null);
                }
              }}
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
