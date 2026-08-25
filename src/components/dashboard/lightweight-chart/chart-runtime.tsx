"use client";

import * as React from "react";
import { type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { ChartShell } from "@/components/dashboard/lightweight-chart/chart-shell";
import { DEFAULT_VWAP_CALCULATION } from "@/lib/utils/chart-indicators";
import { getBucketSeconds } from "@/lib/utils/merge-live-quote-candles";
import { calculateFibPrice, DEFAULT_FIBONACCI_LEVELS } from "@/lib/utils/fibonacci";
import { resolveMagnetSnap, validateMagnetSettings } from "@/lib/utils/magnet-snap";
import {
  FIBONACCI_DEFAULT_LABELS,
  FIBONACCI_DEFAULT_STYLE,
  TRENDLINE_DEFAULT_STATS,
  TRENDLINE_DEFAULT_STYLE,
  getDefaultVisibleBars,
} from "@/constants/chart/lightweight-chart";
import {
  formatChartPrice,
} from "@/lib/utils/chart/formatters";
import { distanceToSegment, getExtendedTrendlinePoints } from "@/lib/utils/chart/geometry";
import { useChartData } from "@/hooks/chart/use-chart-data";
import { useChartInstance } from "@/hooks/chart/use-chart-instance";
import { deriveTradeMarkers } from "@/services/chart/trade-marker-data";
import { useChartDrawingRenderer } from "@/components/dashboard/lightweight-chart/chart-drawing-overlay";
import type {
  AnyChartDrawing,
  ChartDrawing,
  ChartIndicatorId,
  ChartPoint,
  ChartToolId,
  FibonacciDrawing,
  LightweightTradingChartProps,
  MagnetMode,
  TrendlineDrawing,
} from "@/types/lightweight-trading-chart";

function toSeriesTime(time: number) {
  return time as UTCTimestamp;
}

function syncLastPriceLabel(
  series: ISeriesApi<"Candlestick">,
  price: number,
  labelElement: HTMLDivElement | null,
  symbol: string,
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
  labelElement.textContent = formatChartPrice(price, symbol);
}

export function LightweightTradingChart({
  symbol,
  compareSymbol = null,
  timeframe = "4H",
  liveQuote = null,
  compareLiveQuote = null,
  trades = [],
  tradePositions = [],
  markers = [],
  showTradeMarkers = true,
  onTradeMarkerClick,
  onOhlcvChange,
  className,
}: LightweightTradingChartProps) {
  const mainContainerRef = React.useRef<HTMLDivElement>(null);
  const subContainerRef = React.useRef<HTMLDivElement>(null);
  const mainChartRef = React.useRef<IChartApi | null>(null);
  const subChartRef = React.useRef<IChartApi | null>(null);
  const mainSeriesRef = React.useRef<ISeriesApi<"Candlestick" | "Line" | "Area">[]>([]);
  const subSeriesRef = React.useRef<ISeriesApi<"Area">[]>([]);
  const candleSeriesRef = React.useRef<ISeriesApi<"Candlestick"> | null>(null);
  const emaSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const vwapSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);
  const vwapUpperSeriesRefs = React.useRef<Array<ISeriesApi<"Line"> | null>>([]);
  const vwapLowerSeriesRefs = React.useRef<Array<ISeriesApi<"Line"> | null>>([]);
  const priceLineRef = React.useRef<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]> | null>(null);
  const priceLabelRef = React.useRef<HTMLDivElement>(null);
  const lastCloseRef = React.useRef<number | null>(null);
  const initialViewKeyRef = React.useRef<string | null>(null);
  const drawingOverlayRef = React.useRef<SVGSVGElement>(null);
  const [activeTool, setActiveTool] = React.useState<ChartToolId>("crosshair");
  const [enabledIndicators, setEnabledIndicators] = React.useState<ChartIndicatorId[]>([]);
  const [indicatorPeriods, setIndicatorPeriods] = React.useState({ ema: 20 });
  const [vwapSettings, setVwapSettings] = React.useState(DEFAULT_VWAP_CALCULATION);
  const [isVwapSettingsOpen, setIsVwapSettingsOpen] = React.useState(false);
  const [vwapSettingsTab, setVwapSettingsTab] = React.useState<"inputs" | "style" | "visibility">("inputs");
  const [magnetMode, setMagnetMode] = React.useState<MagnetMode>("off");
  const [magnetLastEnabledMode, setMagnetLastEnabledMode] = React.useState<"weak" | "strong">("weak");
  const [magnetThresholdPx] = React.useState(12);
  const [snapIndicator, setSnapIndicator] = React.useState<{ point: ChartPoint; field: string; price: number } | null>(null);
  const [drawings, setDrawings] = React.useState<AnyChartDrawing[]>([]);
  const [redoDrawings, setRedoDrawings] = React.useState<AnyChartDrawing[]>([]);
  const [draftPoints, setDraftPoints] = React.useState<ChartPoint[]>([]);
  const [draftPreviewPoint, setDraftPreviewPoint] = React.useState<ChartPoint | null>(null);
  const [renderedDrawings, setRenderedDrawings] = React.useState<React.ReactNode[]>([]);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [selectedDrawingId, setSelectedDrawingId] = React.useState<string | null>(null);
  const [textEditor, setTextEditor] = React.useState<{ point: ChartPoint; value: string; pixel: { x: number; y: number }; editingId?: string } | null>(null);
  const draggingTrendlineRef = React.useRef<{
    id: string;
    mode: "endpoint" | "body";
    endpoint?: 0 | 1;
    start?: ChartPoint;
    originalPoints?: [ChartPoint, ChartPoint];
  } | null>(null);
  const draggingDraftTrendlineRef = React.useRef(false);
  const draggingDraftRulerRef = React.useRef(false);
  const draftRulerMovedRef = React.useRef(false);
  const draftRulerPointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const draggingFibonacciRef = React.useRef<{
    id: string;
    mode: "endpoint" | "body";
    endpoint?: 0 | 1;
    start?: ChartPoint;
    originalPoints?: [ChartPoint, ChartPoint];
  } | null>(null);
  const draggingTextRef = React.useRef<{ id: string; start: ChartPoint; originalPoint: ChartPoint } | null>(null);
  const draftTrendlineAnchorRef = React.useRef<ChartPoint | null>(null);
  const draftTrendlineMovedRef = React.useRef(false);
  const draftTrendlinePointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const draftTrendlinePendingClickPointRef = React.useRef<ChartPoint | null>(null);
  const [overlayRevision, setOverlayRevision] = React.useState(0);
  const drawingsStorageKey = `trade-mate:chart-drawings:${symbol}:${timeframe}`;
  const magnetStorageKey = "trade-mate:chart-magnet-settings";
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

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(magnetStorageKey);
        if (stored) {
          const settings = validateMagnetSettings(JSON.parse(stored));
          setMagnetMode(settings.mode);
          setMagnetLastEnabledMode(settings.lastEnabledMode);
        }
      } catch {
        setMagnetMode("off");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(magnetStorageKey, JSON.stringify({ mode: magnetMode, weakThresholdPx: magnetThresholdPx, lastEnabledMode: magnetLastEnabledMode }));
  }, [magnetMode, magnetLastEnabledMode, magnetThresholdPx]);

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

  const {
    candles,
    effectiveLiveQuote,
    displayCandles,
    displayCompareCandles,
    compareTrack,
    ema,
    vwap,
    latestVwapPoint,
    chartDataKey,
    isChartLoading,
    isError,
    lastDisplayedClose,
  } = useChartData({
    symbol,
    compareSymbol: normalizedCompareSymbol,
    timeframe,
    liveQuote,
    compareLiveQuote,
    enabledIndicators,
    emaPeriod: indicatorPeriods.ema,
    vwapSettings,
  });

  React.useEffect(() => {
    onOhlcvChange?.(displayCandles[displayCandles.length - 1] ?? null);
  }, [displayCandles, onOhlcvChange]);

  const toggleIndicator = React.useCallback((indicator: ChartIndicatorId) => {
    setEnabledIndicators((current) =>
      current.includes(indicator)
        ? current.filter((item) => item !== indicator)
        : [...current, indicator],
    );
  }, []);

  const getChartPoint = React.useCallback(
    (event: React.PointerEvent<HTMLElement>, applyMagnet = true) => {
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

      if (!applyMagnet) {
        setSnapIndicator(null);
        return { time: rawTime, price: rawPrice, snappedField: null };
      }

      const snap = resolveMagnetSnap({
        pointerX: x,
        pointerY: y,
        mode: magnetMode,
        temporaryToggleActive: event.ctrlKey || event.metaKey,
        thresholdPx: magnetThresholdPx,
        timeScale: chart.timeScale(),
        series,
        candles: displayCandles,
      });
      if (snap.snapped && snap.field) {
        const snappedPoint: ChartPoint = { time: snap.time, price: snap.price, logicalIndex: snap.logicalIndex, snappedField: snap.field };
        setSnapIndicator({ point: snappedPoint, field: snap.field, price: snap.price });
        return snappedPoint;
      }
      setSnapIndicator(null);
      return { time: rawTime, price: rawPrice, snappedField: null };
    },
    [displayCandles, magnetMode, magnetThresholdPx],
  );

  const commitDrawing = React.useCallback(
    (tool: Exclude<ChartToolId, "crosshair" | "trendline">, points: ChartPoint[], text?: string) => {
      if (points.length === 0) {
        return;
      }

      const id = `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setDrawings((current) => [
        ...current,
        { id, tool, points, text },
      ]);
      setRedoDrawings([]);
      setSelectedDrawingId(id);
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

  const commitFibonacci = React.useCallback((points: [ChartPoint, ChartPoint]) => {
    if (points[0].time === points[1].time && points[0].price === points[1].price) return;
    const now = Date.now();
    const drawing: FibonacciDrawing = {
      id: `fibonacci-${now}-${Math.random().toString(36).slice(2, 8)}`,
      tool: "fibonacci",
      points,
      levels: DEFAULT_FIBONACCI_LEVELS.map((level) => ({ ...level })),
      style: { ...FIBONACCI_DEFAULT_STYLE },
      labels: { ...FIBONACCI_DEFAULT_LABELS },
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

  const findTrendlineAtPoint = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
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

  const findTrendlineHandleAtPoint = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
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

  const getFibonacciGeometry = React.useCallback((drawing: FibonacciDrawing) => {
    const overlay = drawingOverlayRef.current;
    const chart = mainChartRef.current;
    const series = candleSeriesRef.current;
    if (!overlay || !chart || !series) return null;
    const pixels = drawing.points.map(toPixelPoint);
    if (!pixels[0] || !pixels[1]) return null;
    const plotWidth = Math.min(overlay.clientWidth, chart.timeScale().width());
    const left = drawing.style.extendLeft ? 0 : Math.min(pixels[0].x, pixels[1].x);
    const right = drawing.style.extendRight ? plotWidth : Math.max(pixels[0].x, pixels[1].x);
    const levels = drawing.levels.filter((level) => level.visible).map((level) => ({
      level,
      price: calculateFibPrice(drawing.points[0].price, drawing.points[1].price, level.ratio, drawing.style.reverse, drawing.style.useLogScaleCalculation),
      y: series.priceToCoordinate(calculateFibPrice(drawing.points[0].price, drawing.points[1].price, level.ratio, drawing.style.reverse, drawing.style.useLogScaleCalculation)),
    })).filter((item) => item.y !== null) as Array<{ level: FibonacciDrawing["levels"][number]; price: number; y: number }>;
    return { pixels, plotWidth, left: Math.max(0, left), right: Math.min(plotWidth, right), levels };
  }, [toPixelPoint]);

  const findFibonacciAtPoint = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
    const overlay = drawingOverlayRef.current;
    if (!overlay) return null;
    const bounds = overlay.getBoundingClientRect();
    const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    for (const drawing of [...drawings].reverse()) {
      if (drawing.tool !== "fibonacci") continue;
      const fibonacci = drawing as FibonacciDrawing;
      if (fibonacci.hidden) continue;
      const geometry = getFibonacciGeometry(fibonacci);
      if (!geometry || pointer.x < geometry.left - 8 || pointer.x > geometry.right + 8) continue;
      const nearestLevel = geometry.levels.reduce<{ id: string; distance: number } | null>((best, item) => {
        const distance = Math.abs(pointer.y - item.y);
        return !best || distance < best.distance ? { id: item.level.id, distance } : best;
      }, null);
      const baselineDistance = distanceToSegment(pointer, geometry.pixels[0]!, geometry.pixels[1]!);
      const visibleYs = geometry.levels.map((item) => item.y);
      const insideFilledArea = drawing.id === selectedDrawingId
        && geometry.levels.length > 1
        && pointer.y >= Math.min(...visibleYs) - 4
        && pointer.y <= Math.max(...visibleYs) + 4;
      if ((nearestLevel && nearestLevel.distance <= 12) || baselineDistance <= 12 || insideFilledArea) return drawing.id;
    }
    return null;
  }, [drawings, getFibonacciGeometry, selectedDrawingId]);

  const findFibonacciHandleAtPoint = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
    const overlay = drawingOverlayRef.current;
    if (!overlay) return null;
    const bounds = overlay.getBoundingClientRect();
    const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    for (const drawing of [...drawings].reverse()) {
      if (drawing.tool !== "fibonacci") continue;
      const fibonacci = drawing as FibonacciDrawing;
      if (fibonacci.hidden || fibonacci.locked) continue;
      const pixels = fibonacci.points.map(toPixelPoint);
      const endpoint = pixels.findIndex((pixel) => pixel && Math.hypot(pointer.x - pixel.x, pointer.y - pixel.y) <= 14);
      if (endpoint === 0 || endpoint === 1) return { id: drawing.id, endpoint: endpoint as 0 | 1 };
    }
    return null;
  }, [drawings, toPixelPoint]);

  const findTextAtPoint = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
    const overlay = drawingOverlayRef.current;
    if (!overlay) return null;
    const bounds = overlay.getBoundingClientRect();
    const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    for (const drawing of [...drawings].reverse()) {
      if (drawing.tool !== "text" || !drawing.points[0] || !drawing.text) continue;
      const pixel = toPixelPoint(drawing.points[0]);
      if (!pixel) continue;
      const textWidth = Math.max(48, Math.min(260, drawing.text.length * 8 + 12));
      if (pointer.x >= pixel.x - 8 && pointer.x <= pixel.x + textWidth && Math.abs(pointer.y - pixel.y) <= 18) {
        return drawing.id;
      }
    }
    return null;
  }, [drawings, toPixelPoint]);

  const commitTextEditor = React.useCallback(() => {
    if (!textEditor || !textEditor.value.trim()) {
      setTextEditor(null);
      return;
    }
    if (textEditor.editingId) {
      setDrawings((current) => current.map((drawing) => (
        drawing.id === textEditor.editingId && drawing.tool === "text"
          ? { ...drawing, text: textEditor.value.trim() }
          : drawing
      )));
      setTextEditor(null);
      return;
    }
    const now = Date.now();
    const drawing: ChartDrawing = {
      id: `text-${now}-${Math.random().toString(36).slice(2, 8)}`,
      tool: "text",
      points: [textEditor.point],
      text: textEditor.value.trim(),
    };
    setDrawings((current) => [...current, drawing]);
    setRedoDrawings([]);
    setSelectedDrawingId(drawing.id);
    setTextEditor(null);
  }, [textEditor]);

  const handleDrawingPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
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

      if (activeTool === "fibonacci") {
        const point = getChartPoint(event);
        if (!point) return;
        if (draftPoints.length === 0) {
          const handle = findFibonacciHandleAtPoint(event);
          if (handle) {
            draggingFibonacciRef.current = { ...handle, mode: "endpoint" };
            setSelectedDrawingId(handle.id);
            return;
          }
          const hitDrawingId = findFibonacciAtPoint(event);
          if (hitDrawingId) {
            setSelectedDrawingId(hitDrawingId);
            const hitDrawing = drawings.find((drawing) => drawing.id === hitDrawingId);
            if (hitDrawing?.tool === "fibonacci" && !(hitDrawing as FibonacciDrawing).locked) {
              draggingFibonacciRef.current = {
                id: hitDrawing.id,
                mode: "body",
                start: point,
                originalPoints: [...(hitDrawing as FibonacciDrawing).points] as [ChartPoint, ChartPoint],
              };
            }
            return;
          }
          setSelectedDrawingId(null);
          setDraftPoints([point]);
          setDraftPreviewPoint(null);
          setIsDrawing(true);
        } else {
          commitFibonacci([draftPoints[0], point]);
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
        const hitTextId = findTextAtPoint(event);
        if (hitTextId) {
          const hitText = drawings.find((drawing) => drawing.id === hitTextId);
          if (hitText?.tool === "text") {
            if (event.detail >= 2) {
              const pixel = toPixelPoint(hitText.points[0]);
              const bounds = drawingOverlayRef.current?.getBoundingClientRect();
              setTextEditor({
                point: hitText.points[0],
                value: hitText.text ?? "",
                pixel: pixel ? { x: pixel.x, y: pixel.y } : bounds ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top } : { x: 8, y: 8 },
                editingId: hitText.id,
              });
              return;
            }
            draggingTextRef.current = { id: hitText.id, start: point, originalPoint: hitText.points[0] };
            setSelectedDrawingId(hitText.id);
          }
          return;
        }
        const overlay = drawingOverlayRef.current;
        const bounds = overlay?.getBoundingClientRect();
        setTextEditor({
          point,
          value: "",
          pixel: bounds ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top } : { x: 8, y: 8 },
        });
        return;
      }

      if (activeTool === "ruler") {
        if (draftPoints.length === 0) {
          setDrawings((current) => current.filter((drawing) => drawing.tool !== "ruler"));
          setSelectedDrawingId(null);
          setDraftPoints([point]);
          setDraftPreviewPoint(null);
          setIsDrawing(true);
          draggingDraftRulerRef.current = true;
          draftRulerMovedRef.current = false;
          draftRulerPointerStartRef.current = { x: event.clientX, y: event.clientY };
        } else {
          commitDrawing("ruler", [draftPoints[0], point]);
          setIsDrawing(false);
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
    [activeTool, commitDrawing, commitFibonacci, commitTrendline, drawings, draftPoints, findFibonacciAtPoint, findFibonacciHandleAtPoint, findTextAtPoint, findTrendlineAtPoint, findTrendlineHandleAtPoint, getChartPoint],
  );

  const handleDrawingPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (draggingDraftRulerRef.current) {
        const pointerStart = draftRulerPointerStartRef.current;
        if (pointerStart && !draftRulerMovedRef.current) {
          if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 4) return;
          draftRulerMovedRef.current = true;
        }
        const point = getChartPoint(event);
        if (point) setDraftPreviewPoint(point);
        return;
      }

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
        const point = getChartPoint(event, draggingTrendline.mode !== "body");
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

      const draggingFibonacci = draggingFibonacciRef.current;
      if (draggingFibonacci) {
        const point = getChartPoint(event, draggingFibonacci.mode !== "body");
        if (point) {
          setDrawings((current) => current.map((drawing) => {
            if (drawing.id !== draggingFibonacci.id || drawing.tool !== "fibonacci") return drawing;
            const points: [ChartPoint, ChartPoint] = [...drawing.points] as [ChartPoint, ChartPoint];
            if (draggingFibonacci.mode === "body" && draggingFibonacci.start && draggingFibonacci.originalPoints) {
              const timeDelta = point.time - draggingFibonacci.start.time;
              const priceDelta = point.price - draggingFibonacci.start.price;
              return {
                ...drawing,
                points: draggingFibonacci.originalPoints.map((original) => ({ ...original, time: original.time + timeDelta, price: original.price + priceDelta })) as [ChartPoint, ChartPoint],
                updatedAt: Date.now(),
              };
            }
            if (draggingFibonacci.endpoint !== undefined) points[draggingFibonacci.endpoint] = point;
            return { ...drawing, points, updatedAt: Date.now() };
          }));
        }
        return;
      }

      const draggingText = draggingTextRef.current;
      if (draggingText) {
        const point = getChartPoint(event, false);
        if (point) {
          const timeDelta = point.time - draggingText.start.time;
          const priceDelta = point.price - draggingText.start.price;
          setDrawings((current) => current.map((drawing) => (
            drawing.id === draggingText.id && drawing.tool === "text"
              ? { ...drawing, points: [{ ...draggingText.originalPoint, time: draggingText.originalPoint.time + timeDelta, price: draggingText.originalPoint.price + priceDelta }] }
              : drawing
          )));
        }
        return;
      }

      if (!isDrawing && !((activeTool === "trendline" || activeTool === "fibonacci" || activeTool === "ruler") && draftPoints.length === 1)) {
        return;
      }

      const point = getChartPoint(event);

      if (point && (activeTool === "trendline" || activeTool === "fibonacci" || activeTool === "ruler") && draftPoints.length === 1) {
        // Keep the first anchor fixed and extend the preview line to the cursor.
        setDraftPreviewPoint(point);
      } else if (point) {
        setDraftPoints((current) => [...current, point]);
      }
    },
    [activeTool, draftPoints, findTrendlineAtPoint, findTrendlineHandleAtPoint, getChartPoint, isDrawing],
  );

  const handleDrawingPointerUp = React.useCallback(() => {
    setSnapIndicator(null);
    if (draggingDraftRulerRef.current) {
      draggingDraftRulerRef.current = false;
      draftRulerPointerStartRef.current = null;
      if (draftRulerMovedRef.current && draftPoints[0] && draftPreviewPoint) {
        commitDrawing("ruler", [draftPoints[0], draftPreviewPoint]);
        setIsDrawing(false);
        setDraftPreviewPoint(null);
        draftRulerMovedRef.current = false;
        return;
      }
      draftRulerMovedRef.current = false;
      setIsDrawing(false);
      return;
    }

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
      return;
    }

    if (draggingFibonacciRef.current) {
      draggingFibonacciRef.current = null;
      return;
    }

    if (draggingTextRef.current) {
      draggingTextRef.current = null;
      return;
    }

    if (activeTool === "trendline") {
      setIsDrawing(false);
      return;
    }

    if (activeTool === "fibonacci" && draftPoints.length === 1) {
      setIsDrawing(false);
      return;
    }

    if (activeTool === "ruler" && draftPoints.length === 1) {
      setIsDrawing(false);
      return;
    }

    if (!isDrawing) {
      return;
    }

    setIsDrawing(false);
    if (activeTool !== "crosshair" && draftPoints.length > 1) {
      commitDrawing(activeTool, draftPoints);
    } else {
      setDraftPoints([]);
      setDraftPreviewPoint(null);
    }
  }, [activeTool, commitDrawing, commitTrendline, draftPoints, draftPreviewPoint, isDrawing]);

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

      const point = getChartPoint(event as unknown as React.PointerEvent<HTMLElement>);
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
    draggingTextRef.current = null;
    setTextEditor(null);

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
    chart.timeScale().scrollToRealTime();
    subChart.timeScale().scrollToRealTime();
  }, [displayCandles.length, timeframe]);

  const updateSelectedFibonacci = React.useCallback((update: (drawing: FibonacciDrawing) => FibonacciDrawing) => {
    if (!selectedDrawingId) return;
    setDrawings((current) => current.map((drawing) => (
      drawing.id === selectedDrawingId && drawing.tool === "fibonacci"
        ? update(drawing as FibonacciDrawing)
        : drawing
    )));
    setRedoDrawings([]);
  }, [selectedDrawingId]);

  const deleteSelectedDrawing = React.useCallback(() => {
    if (!selectedDrawingId) return;
    setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId || ("locked" in drawing && drawing.locked)));
    setSelectedDrawingId(null);
  }, [selectedDrawingId]);

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
        if (textEditor) {
          setTextEditor(null);
          return;
        }
        if (draftPoints.length > 0 || isDrawing) {
          setDraftPoints([]);
          setDraftPreviewPoint(null);
          setIsDrawing(false);
          return;
        }

        setSelectedDrawingId(null);
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedDrawingId) {
        setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId || ("locked" in drawing && drawing.locked)));
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
  }, [draftPoints.length, isDrawing, redoDrawing, selectedDrawingId, textEditor, undoDrawing]);

  const renderDrawing = useChartDrawingRenderer({
    activeTool,
    displayCandles,
    getChartPoint,
    selectedDrawingId,
    toPixelPoint,
    drawingOverlayRef,
    mainChartRef,
    candleSeriesRef,
    draggingTextRef,
    setSelectedDrawingId,
    setTextEditor,
  });

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
        : draftPoints.length > 0 && activeTool === "fibonacci"
          ? [{
              id: "draft-fibonacci",
              tool: "fibonacci",
              points: [draftPoints[0], draftPoints[1] ?? draftPreviewPoint ?? draftPoints[0]],
              levels: DEFAULT_FIBONACCI_LEVELS.map((level) => ({ ...level })),
              style: { ...FIBONACCI_DEFAULT_STYLE },
              labels: { ...FIBONACCI_DEFAULT_LABELS },
              locked: false,
              hidden: false,
              createdAt: 0,
              updatedAt: 0,
            }]
        : draftPoints.length > 0 && activeTool === "ruler"
          ? [{
              id: "draft-ruler",
              tool: "ruler",
              points: [draftPoints[0], draftPoints[1] ?? draftPreviewPoint ?? draftPoints[0]],
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

  useChartInstance({ mainContainerRef, subContainerRef, mainChartRef, subChartRef, mainSeriesRef, subSeriesRef, candleSeriesRef, emaSeriesRef, vwapSeriesRef, vwapUpperSeriesRefs, vwapLowerSeriesRefs, priceLineRef, priceLabelRef, lastCloseRef, initialViewKeyRef, symbol, timeframe, normalizedCompareSymbol, displayCandles, displayCompareCandles, compareTrack, enabledIndicators, vwap, vwapSettings, ema, effectiveLiveQuote, candles, chartDataKey, overlayRevision: setOverlayRevision, indicatorPeriods, syncLastPriceLabel, onOhlcvChange });
  const selectedFibonacci = selectedDrawingId
    ? drawings.find((drawing): drawing is FibonacciDrawing => drawing.id === selectedDrawingId && drawing.tool === "fibonacci")
    : null;
  const textEditorPixel = textEditor?.pixel ?? null;
  const [snapPixel, setSnapPixel] = React.useState<{ x: number; y: number } | null>(null);
  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSnapPixel(snapIndicator ? toPixelPoint(snapIndicator.point) : null));
    return () => window.cancelAnimationFrame(frame);
  }, [overlayRevision, snapIndicator, toPixelPoint]);
  const derivedTradeMarkers = React.useMemo(() => deriveTradeMarkers(symbol, trades, tradePositions), [symbol, tradePositions, trades]);
  const allTradeMarkers = React.useMemo(() => [...derivedTradeMarkers, ...markers], [derivedTradeMarkers, markers]);
  const tradeMarkerBucketSeconds = getBucketSeconds(timeframe);
  return <ChartShell context={{ className, symbol, activeTool, setActiveTool, setDraftPoints, setIsDrawing, draggingTrendlineRef, draggingDraftTrendlineRef, draftTrendlineAnchorRef, draftTrendlineMovedRef, draftTrendlinePointerStartRef, draftTrendlinePendingClickPointRef, draggingTextRef, setTextEditor, magnetMode, enabledIndicators, setMagnetMode, setMagnetLastEnabledMode, toggleIndicator, zoomIn, zoomOut, resetView, undoDrawing, redoDrawing, redoDrawings, isChartLoading, isError, mainContainerRef, drawingOverlayRef, overlayRevision, renderedDrawings, snapPixel, allTradeMarkers, displayCandles, tradeMarkerBucketSeconds, showTradeMarkers, toPixelPoint, onTradeMarkerClick, indicatorPeriods, setIndicatorPeriods, vwapSettings, setVwapSettings, latestVwapPoint, isVwapSettingsOpen, setIsVwapSettingsOpen, vwapSettingsTab, setVwapSettingsTab, textEditor, textEditorPixel, commitTextEditor, selectedFibonacci, updateSelectedFibonacci, deleteSelectedDrawing, lastDisplayedClose, priceLabelRef, subContainerRef, handleDrawingPointerDown, handleDrawingPointerMove, handleDrawingPointerUp }} />;
}
