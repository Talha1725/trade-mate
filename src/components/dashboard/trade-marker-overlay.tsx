"use client";

import * as React from "react";

import type { ChartCandle } from "@/types/eodhd";

export type TradeMarkerSide = "buy" | "sell";

export type TradeMarker = {
  id: string;
  time: number;
  side: TradeMarkerSide;
  price: number;
  quantity?: number;
  orderType?: "market" | "limit";
  label?: string;
  timestamp?: string | null;
  symbol?: string;
  metadata?: unknown;
};

type TradeMarkerOverlayProps = {
  markers: TradeMarker[];
  candles: ChartCandle[];
  bucketSeconds: number;
  viewportRevision?: number;
  showTradeMarkers?: boolean;
  getPixelPoint: (point: { time: number; price: number }) => { x: number; y: number } | null;
  formatPrice?: (price: number) => string;
  onTradeMarkerClick?: (marker: TradeMarker) => void;
};

type PositionedMarker = TradeMarker & {
  candle: ChartCandle;
  bucketTime: number;
  x: number;
  y: number;
  candleWidth: number;
  stackIndex: number;
  groupCount: number;
  collapsed: boolean;
};

const BUY_COLOR = "#22E0A2";
const SELL_COLOR = "#EF4444";
const MARKER_GAP = 4;
const STACK_GAP = 4;
const HIT_SIZE = 36;
const OVERLAY_EDGE_GAP = 8;

function bucketMarkerTime(time: number, bucketSeconds: number) {
  return Math.floor(time / bucketSeconds) * bucketSeconds;
}

function formatTimestamp(value: string | null | undefined, time: number) {
  const date = value ? new Date(value) : new Date(time * 1000);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function getCandleWidth(
  marker: TradeMarker,
  bucketTime: number,
  candles: ChartCandle[],
  getPixelPoint: TradeMarkerOverlayProps["getPixelPoint"],
) {
  const markerPixel = getPixelPoint({ time: bucketTime, price: marker.price });
  if (!markerPixel) return 8;

  const index = candles.findIndex((candle) => candle.time === bucketTime);
  const neighbor = candles[index + 1] ?? candles[index - 1];
  if (!neighbor) return 8;

  const neighborPixel = getPixelPoint({ time: neighbor.time, price: marker.price });
  return neighborPixel ? Math.abs(neighborPixel.x - markerPixel.x) : 8;
}

function markerTooltip(marker: TradeMarker, formatPrice: (price: number) => string) {
  return [
    `${marker.side.toUpperCase()}${marker.label ? ` · ${marker.label}` : ""}`,
    `Price: ${formatPrice(marker.price)}`,
    marker.quantity == null ? null : `Quantity: ${marker.quantity}`,
    marker.orderType ? `Type: ${marker.orderType.toUpperCase()}` : null,
    `Time: ${formatTimestamp(marker.timestamp, marker.time)}`,
  ].filter(Boolean).join("\n");
}

export function TradeMarkerOverlay({
  markers,
  candles,
  bucketSeconds,
  viewportRevision = 0,
  showTradeMarkers = true,
  getPixelPoint,
  formatPrice = (price) => price.toLocaleString("en-US"),
  onTradeMarkerClick,
}: TradeMarkerOverlayProps) {
  const [hoveredGroup, setHoveredGroup] = React.useState<string | null>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({ left: 0, top: 0 });

  const positionedMarkers = React.useMemo(() => {
    void viewportRevision;
    if (!showTradeMarkers || bucketSeconds <= 0 || candles.length === 0) return [];

    const candleByTime = new Map(candles.map((candle) => [candle.time, candle]));
    const sideCounts = new Map<string, number>();
    const markerGroups = new Map<string, number>();
    const result: PositionedMarker[] = [];

    for (const marker of markers) {
      if (!Number.isFinite(marker.time) || !Number.isFinite(marker.price)) continue;

      const bucketTime = bucketMarkerTime(marker.time, bucketSeconds);
      const candle = candleByTime.get(bucketTime);
      // The marker remains in the source list and will appear when its candle loads.
      if (!candle) continue;

      const pricePixel = getPixelPoint({ time: bucketTime, price: marker.price });
      const lowPixel = getPixelPoint({ time: bucketTime, price: candle.low });
      const highPixel = getPixelPoint({ time: bucketTime, price: candle.high });
      if (!pricePixel || !lowPixel || !highPixel) continue;

      const groupKey = `${bucketTime}:${marker.side}`;
      const stackIndex = sideCounts.get(groupKey) ?? 0;
      sideCounts.set(groupKey, stackIndex + 1);
      markerGroups.set(groupKey, (markerGroups.get(groupKey) ?? 0) + 1);
      const candleWidth = getCandleWidth(marker, bucketTime, candles, getPixelPoint);
      const markerY = marker.side === "buy"
        ? lowPixel.y + MARKER_GAP + stackIndex * STACK_GAP
        : highPixel.y - MARKER_GAP - stackIndex * STACK_GAP;

      result.push({
        ...marker,
        candle,
        bucketTime,
        x: pricePixel.x,
        y: markerY,
        candleWidth,
        stackIndex,
        groupCount: 0,
        collapsed: false,
      });
    }

    return result.map((marker) => {
      const groupCount = markerGroups.get(`${marker.bucketTime}:${marker.side}`) ?? 1;
      const maxStackedMarkers = Math.max(1, Math.floor((Math.max(marker.candleWidth, 2) + 2) / STACK_GAP));
      return {
        ...marker,
        groupCount,
        collapsed: groupCount > maxStackedMarkers && marker.stackIndex > 0,
      };
    });
  }, [bucketSeconds, candles, getPixelPoint, markers, showTradeMarkers, viewportRevision]);

  const visibleMarkers = positionedMarkers.filter((marker) => !marker.collapsed);
  const hoveredMarker = hoveredGroup
    ? positionedMarkers.find((marker) => `${marker.bucketTime}:${marker.side}` === hoveredGroup)
    : null;
  const hoveredGroupMarkers = hoveredMarker
    ? positionedMarkers.filter((marker) => marker.bucketTime === hoveredMarker.bucketTime && marker.side === hoveredMarker.side)
    : [];
  const hoveredTooltip = hoveredGroupMarkers.map((marker) => markerTooltip(marker, formatPrice)).join("\n\n");

  React.useLayoutEffect(() => {
    if (!hoveredMarker || !tooltipRef.current || !overlayRef.current) return;

    const overlay = overlayRef.current;
    const tooltip = tooltipRef.current;
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const left = Math.max(
      OVERLAY_EDGE_GAP + tooltipWidth / 2,
      Math.min(overlay.clientWidth - OVERLAY_EDGE_GAP - tooltipWidth / 2, hoveredMarker.x),
    );
    const preferredTop = hoveredMarker.y - HIT_SIZE / 2 - 4 - tooltipHeight;
    const belowTop = hoveredMarker.y + HIT_SIZE / 2 + 4;
    const top = Math.max(
      OVERLAY_EDGE_GAP,
      Math.min(overlay.clientHeight - tooltipHeight - OVERLAY_EDGE_GAP, preferredTop < OVERLAY_EDGE_GAP ? belowTop : preferredTop),
    );

    setTooltipPosition({ left, top });
  }, [hoveredMarker, hoveredTooltip, viewportRevision]);

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-y-0 left-0 right-16 z-[50] overflow-hidden" aria-label="Trade markers">
      {visibleMarkers.map((marker) => {
        const groupKey = `${marker.bucketTime}:${marker.side}`;
        const isCollapsed = marker.groupCount > 1 && marker.stackIndex === 0
          && positionedMarkers.some((item) => item.bucketTime === marker.bucketTime && item.side === marker.side && item.collapsed);
        const color = marker.side === "buy" ? BUY_COLOR : SELL_COLOR;
        const isDot = marker.candleWidth <= 2;

        return (
          <div
            key={marker.id}
            className="pointer-events-auto absolute"
            style={{ left: marker.x, top: marker.y, width: HIT_SIZE, height: HIT_SIZE, transform: "translate(-50%, -50%)" }}
            onPointerEnter={() => setHoveredGroup(groupKey)}
            onPointerLeave={() => setHoveredGroup((current) => current === groupKey ? null : current)}
          >
            <button
              type="button"
              aria-label={isCollapsed ? `${marker.side} ${marker.groupCount} trades` : `${marker.side} trade`}
              className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center border-0 font-bold leading-none text-white"
              style={{
                top: marker.side === "buy" ? 4 : -24,
                width: isDot ? 8 : 24,
                height: isDot ? 8 : 20,
                padding: 0,
                fontSize: isCollapsed ? 9 : 14,
                backgroundColor: color,
                borderRadius: isDot ? 999 : 6,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.38)",
              }}
              onClick={(event) => {
                event.stopPropagation();
                onTradeMarkerClick?.(marker);
              }}
            >
              {isDot ? null : isCollapsed ? `+${marker.groupCount - 1}` : marker.side === "buy" ? "B" : "S"}
              {!isDot && !isCollapsed ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 h-[5px] w-[8px] -translate-x-1/2"
                  style={{
                    top: marker.side === "buy" ? -4 : 19,
                    backgroundColor: color,
                    clipPath: marker.side === "buy"
                      ? "polygon(50% 0%, 0% 100%, 100% 100%)"
                      : "polygon(0% 0%, 100% 0%, 50% 100%)",
                  }}
                />
              ) : null}
            </button>
          </div>
        );
      })}
      {hoveredMarker ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-[99999] w-56 whitespace-pre-line rounded-md border px-2.5 py-2 text-[11px] text-white shadow-xl"
          style={{
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            transform: "translateX(-50%)",
            background: "rgba(8, 12, 18, 0.96)",
            borderColor: hoveredMarker.side === "buy" ? BUY_COLOR : SELL_COLOR,
          }}
        >
          {hoveredTooltip}
        </div>
      ) : null}
    </div>
  );
}
