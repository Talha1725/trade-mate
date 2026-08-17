"use client";

import * as React from "react";
import { calculateFibPrice, formatFibonacciLevelLabel } from "@/lib/utils/fibonacci";
import { formatLegendValue, formatMeasurementDuration, formatMeasurementVolume, formatSignedLegendValue, formatTrendlinePrice, formatTrendlineTime } from "@/lib/utils/chart/formatters";
import { clipTrendlineSegmentToPlot, getExtendedTrendlinePoints, getTrendlineStrokeDash } from "@/lib/utils/chart/geometry";
import type { AnyChartDrawing, FibonacciDrawing } from "@/types/lightweight-trading-chart";

type DrawingRendererContext = {
  activeTool: string;
  displayCandles: Array<{ time: number; volume?: number }>;
  getChartPoint: (event: React.PointerEvent<HTMLElement>) => { time: number; price: number; logicalIndex?: number } | null;
  selectedDrawingId: string | null;
  toPixelPoint: (point: { time: number; price: number }) => { x: number; y: number } | null;
  drawingOverlayRef: React.RefObject<SVGSVGElement | null>;
  mainChartRef: React.MutableRefObject<{ timeScale: () => { width: () => number } } | null>;
  candleSeriesRef: React.MutableRefObject<{ priceToCoordinate: (price: number) => number | null } | null>;
  draggingTextRef: React.MutableRefObject<{ id: string; start: unknown; originalPoint: unknown } | null>;
  setSelectedDrawingId: (id: string | null) => void;
  setTextEditor: (value: { point: { time: number; price: number }; value: string; pixel: { x: number; y: number }; editingId?: string } | null) => void;
};

export function useChartDrawingRenderer(context: DrawingRendererContext) {
  const { activeTool, displayCandles, getChartPoint, selectedDrawingId, toPixelPoint, drawingOverlayRef, mainChartRef, candleSeriesRef, draggingTextRef, setSelectedDrawingId, setTextEditor } = context;
  return React.useCallback(
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
        const chart = mainChartRef.current;
        const timeScaleWidth = chart?.timeScale().width();
        const plotWidth = Math.max(
          0,
          Math.min(width, timeScaleWidth ?? Math.max(0, width - 78)),
        );
        const axisLabelWidth = Math.max(0, width - plotWidth);
        const trendlineClipId = `trendline-clip-${drawing.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        const segment = getExtendedTrendlinePoints(
          points[0],
          points[1],
          plotWidth,
          height,
          drawing.style.extendLeft,
          drawing.style.extendRight,
        );
        const visibleSegment = clipTrendlineSegmentToPlot(segment.start, segment.end, plotWidth, height);
        if (!visibleSegment) {
          return null;
        }
        const dash = getTrendlineStrokeDash(drawing.style);
        const opacity = Math.max(0, Math.min(1, drawing.style.opacity));
        const dx = visibleSegment.end.x - visibleSegment.start.x;
        const dy = visibleSegment.end.y - visibleSegment.start.y;
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
          x: (visibleSegment.start.x + visibleSegment.end.x) / 2,
          y: (visibleSegment.start.y + visibleSegment.end.y) / 2,
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
        const statsCenterX = midpoint.x + normalX * 10;
        const statsCenterY = midpoint.y + normalY * 10;
        const statsX = Math.max(0, Math.min(plotWidth - statsWidth, statsCenterX - statsWidth / 2));
        const statsY = Math.max(0, Math.min(height - statsHeight, statsCenterY - statsHeight / 2));
        const statsText = [
          drawing.stats.showPriceChange ? formatSignedLegendValue(priceChange) : null,
          drawing.stats.showPercentChange && percentChange !== null
            ? `(${percentChange < 0 ? "-" : "+"}${Math.abs(percentChange).toFixed(2)}%)`
            : null,
        ].filter(Boolean).join(" ");
        const showAxisMarkers = (selectedDrawingId === drawing.id && !isDraft) || (isDraft && points.length >= 2);
        const timeLabelWidth = 104;
        const axisLabelHeight = 20;
        const firstPriceLabelY = Math.max(0, Math.min(height - axisLabelHeight, points[0].y - axisLabelHeight / 2));
        const secondPriceLabelY = Math.max(0, Math.min(height - axisLabelHeight, points[1].y - axisLabelHeight / 2));
        const firstTimeLabelX = Math.max(0, Math.min(width - timeLabelWidth, points[0].x - timeLabelWidth / 2));
        const secondTimeLabelX = Math.max(0, Math.min(width - timeLabelWidth, points[1].x - timeLabelWidth / 2));

        return (
          <g key={drawing.id} opacity={opacity}>
            <defs>
              <clipPath id={trendlineClipId}>
                <rect x={0} y={0} width={plotWidth} height={height} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${trendlineClipId})`}>
              <line
                x1={visibleSegment.start.x}
                y1={visibleSegment.start.y}
                x2={visibleSegment.end.x}
                y2={visibleSegment.end.y}
                stroke="transparent"
                strokeWidth={Math.max(10, drawing.style.width + 8)}
                pointerEvents="stroke"
              />
              <line
                x1={visibleSegment.start.x}
                y1={visibleSegment.start.y}
                x2={visibleSegment.end.x}
                y2={visibleSegment.end.y}
                stroke={drawing.style.color}
                strokeWidth={drawing.style.width}
                strokeDasharray={dash}
                strokeLinecap="round"
              />
              {drawing.style.leftEnd === "arrow" ? <polygon points={arrow(visibleSegment.start, 1)} fill={drawing.style.color} /> : null}
              {drawing.style.rightEnd === "arrow" ? <polygon points={arrow(visibleSegment.end, -1)} fill={drawing.style.color} /> : null}
            </g>
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
                    <rect x={plotWidth} y={item.y} width={axisLabelWidth} height={axisLabelHeight} rx="2" fill={drawing.style.color} />
                    <text x={plotWidth + 5} y={item.y + 14} fill="#FFFFFF" fontSize="11" fontWeight="500">{formatTrendlinePrice(item.value)}</text>
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
        const fib = drawing as FibonacciDrawing;
        const overlay = drawingOverlayRef.current;
        const width = overlay?.clientWidth ?? 0;
        const height = overlay?.clientHeight ?? 0;
        const isDraft = fib.id === "draft-fibonacci";
        const chart = mainChartRef.current;
        const plotWidth = Math.min(width, chart?.timeScale().width() ?? Math.max(0, width - 78));
        const left = fib.style.extendLeft ? 0 : Math.max(0, Math.min(points[0].x, points[1].x));
        const right = fib.style.extendRight ? plotWidth : Math.min(plotWidth, Math.max(points[0].x, points[1].x));
        const levelRows = fib.levels.filter((level) => level.visible).map((level) => {
          const price = calculateFibPrice(fib.points[0].price, fib.points[1].price, level.ratio, fib.style.reverse, fib.style.useLogScaleCalculation);
          const y = candleSeriesRef.current?.priceToCoordinate(price);
          return y === null || y === undefined ? null : { level, price, y: Number(y) };
        }).filter((item): item is { level: FibonacciDrawing["levels"][number]; price: number; y: number } => item !== null).sort((a, b) => a.y - b.y);
        const clipId = `fibonacci-clip-${fib.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        const lineDash = (style: "solid" | "dashed" | "dotted") => style === "dashed" ? "8 5" : style === "dotted" ? "2 4" : undefined;
        const levelColor = (level: FibonacciDrawing["levels"][number]) => fib.style.useOneColor ? (fib.style.oneColor ?? "#2962FF") : level.color;
        const labelX = fib.labels.horizontalPosition === "left"
          ? Math.max(4, left - 8)
          : fib.labels.horizontalPosition === "center"
            ? (left + right) / 2
            : Math.max(left + 6, right - 160);
        const labelY = (y: number) => y + (fib.labels.verticalPosition === "above" ? -5 : fib.labels.verticalPosition === "below" ? 15 : 4);
        const axisLabelWidth = Math.max(0, width - plotWidth);
        const axisLabelHeight = 20;
        const timeLabelWidth = 104;
        const firstPriceLabelY = Math.max(0, Math.min(height - axisLabelHeight, points[0].y - axisLabelHeight / 2));
        const secondPriceLabelY = Math.max(0, Math.min(height - axisLabelHeight, points[1].y - axisLabelHeight / 2));
        const firstTimeLabelX = Math.max(0, Math.min(width - timeLabelWidth, points[0].x - timeLabelWidth / 2));
        const secondTimeLabelX = Math.max(0, Math.min(width - timeLabelWidth, points[1].x - timeLabelWidth / 2));
        const showAxisMarkers = fib.id !== "draft-fibonacci" && selectedDrawingId === fib.id;
        return (
          <g key={drawing.id}>
            <defs><clipPath id={clipId}><rect x="0" y="0" width={plotWidth} height={height} /></clipPath></defs>
            <g clipPath={`url(#${clipId})`}>
              {fib.style.showBackground ? levelRows.slice(0, -1).map((current, index) => {
                const next = levelRows[index + 1];
                const fill = fib.style.useOneColor ? (fib.style.oneColor ?? "#2962FF") : (current.level.fillColor ?? current.level.color);
                return <rect key={`${fib.id}-fill-${current.level.id}`} x={left} y={current.y} width={Math.max(0, right - left)} height={Math.max(0, next.y - current.y)} fill={fill} opacity={current.level.fillOpacity ?? fib.style.backgroundOpacity} />;
              }) : null}
              {levelRows.map(({ level, y }) => (
                <line key={`${fib.id}-level-${level.id}`} x1={left} x2={right} y1={y} y2={y} stroke={levelColor(level)} opacity={level.opacity} strokeWidth={level.lineWidth ?? fib.style.levelLineWidth} strokeDasharray={lineDash(level.lineStyle ?? fib.style.levelLineStyle)} />
              ))}
              {fib.style.showBaseline ? <line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} stroke={fib.style.baselineColor} opacity={fib.style.baselineOpacity} strokeWidth={fib.style.baselineWidth} strokeDasharray={lineDash(fib.style.baselineStyle)} /> : null}
            </g>
            {levelRows.map(({ level, price, y }) => (
              <text key={`${fib.id}-label-${level.id}`} x={labelX} y={labelY(y)} textAnchor={fib.labels.horizontalPosition === "left" ? "end" : "start"} fill={levelColor(level)} fontSize={fib.labels.fontSize} pointerEvents="none">
                {formatFibonacciLevelLabel({ ratio: level.ratio, price, settings: fib.labels, customText: level.customText })}
              </text>
            ))}
            {showAxisMarkers ? (
              <>
                {[{ y: firstPriceLabelY, value: fib.points[0].price }, { y: secondPriceLabelY, value: fib.points[1].price }].map((item, index) => (
                  <g key={`${fib.id}-price-axis-${index}`} pointerEvents="none">
                    <rect x={plotWidth} y={item.y} width={axisLabelWidth} height={axisLabelHeight} rx="2" fill="#2962FF" />
                    <text x={plotWidth + 5} y={item.y + 14} fill="#FFFFFF" fontSize="11" fontWeight="500">{formatTrendlinePrice(item.value)}</text>
                  </g>
                ))}
                {[{ x: firstTimeLabelX, time: fib.points[0].time }, { x: secondTimeLabelX, time: fib.points[1].time }].map((item, index) => (
                  <g key={`${fib.id}-time-axis-${index}`} pointerEvents="none">
                    <rect x={item.x} y={height - axisLabelHeight} width={timeLabelWidth} height={axisLabelHeight} rx="2" fill="#2962FF" />
                    <text x={item.x + 5} y={height - 6} fill="#FFFFFF" fontSize="11" fontWeight="500">{formatTrendlineTime(item.time)}</text>
                  </g>
                ))}
              </>
            ) : null}
            {selectedDrawingId === fib.id || isDraft ? points.map((point, index) => <circle key={`${fib.id}-handle-${index}`} cx={point.x} cy={point.y} r="5" fill="#FFFFFF" stroke="#2962FF" strokeWidth="2" />) : null}
          </g>
        );
      }

      if (drawing.tool === "text") {
        const overlay = drawingOverlayRef.current;
        const width = overlay?.clientWidth ?? 0;
        const height = overlay?.clientHeight ?? 0;
        const chart = mainChartRef.current;
        const plotWidth = Math.min(width, chart?.timeScale().width() ?? Math.max(0, width - 78));
        const textX = points[0].x + 5;
        const textY = Math.max(14, Math.min(height - 4, points[0].y - 5));
        const textClipId = `text-clip-${drawing.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        return (
          <g key={drawing.id}>
            <defs><clipPath id={textClipId}><rect x="0" y="0" width={plotWidth} height={height} /></clipPath></defs>
            <text
              x={textX}
              y={textY}
              fill="#FFFFFF"
              fontSize="12"
              pointerEvents="all"
              clipPath={`url(#${textClipId})`}
              onPointerDown={(event) => {
                if (activeTool !== "text") return;
                const point = getChartPoint(event as unknown as React.PointerEvent<HTMLElement>);
                if (!point || !drawing.points[0]) return;
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                draggingTextRef.current = { id: drawing.id, start: point, originalPoint: drawing.points[0] };
                setSelectedDrawingId(drawing.id);
              }}
              onDoubleClick={(event) => {
                if (activeTool !== "text" || !drawing.points[0]) return;
                event.stopPropagation();
                setTextEditor({
                  point: drawing.points[0],
                  value: drawing.text ?? "",
                  pixel: { x: textX, y: textY + 5 },
                  editingId: drawing.id,
                });
              }}
            >
              {drawing.text}
            </text>
          </g>
        );
      }

      const path = points.map((point) => `${point.x},${point.y}`).join(" ");
      const isRuler = drawing.tool === "ruler";

      if (isRuler && points.length >= 2) {
        const overlay = drawingOverlayRef.current;
        const width = overlay?.clientWidth ?? 0;
        const height = overlay?.clientHeight ?? 0;
        const plotWidth = Math.min(width, mainChartRef.current?.timeScale().width() ?? Math.max(0, width - 78));
        const clipped = clipTrendlineSegmentToPlot(points[0], points[1], plotWidth, height);
        if (!clipped) return null;

        const start = drawing.points[0];
        const end = drawing.points[1];
        const priceDelta = end.price - start.price;
        const percentDelta = start.price !== 0 ? (priceDelta / start.price) * 100 : null;
        const bars = start.logicalIndex !== undefined && end.logicalIndex !== undefined
          ? Math.abs(end.logicalIndex - start.logicalIndex)
          : null;
        const firstTime = Math.min(start.time, end.time);
        const lastTime = Math.max(start.time, end.time);
        const volume = displayCandles
          .filter((candle) => candle.time >= firstTime && candle.time <= lastTime)
          .reduce((total, candle) => total + (Number.isFinite(candle.volume) ? candle.volume ?? 0 : 0), 0);
        const duration = formatMeasurementDuration(end.time - start.time);
        const statsText = [
          `${formatSignedLegendValue(priceDelta)} (${percentDelta === null ? "--" : `${percentDelta < 0 ? "-" : "+"}${Math.abs(percentDelta).toFixed(2)}%`})`,
          bars === null ? null : `${bars} bars`,
          duration,
          `Vol ${formatMeasurementVolume(volume)}`,
        ].filter(Boolean).join(" · ");
        const midpoint = {
          x: (clipped.start.x + clipped.end.x) / 2,
          y: (clipped.start.y + clipped.end.y) / 2,
        };
        const labelWidth = Math.min(290, Math.max(150, statsText.length * 7 + 18));
        const labelHeight = 26;
        const labelX = Math.max(0, Math.min(plotWidth - labelWidth, midpoint.x - labelWidth / 2));
        const rangeBottom = Math.max(points[0].y, points[1].y);
        const labelY = Math.max(0, Math.min(height - labelHeight, rangeBottom + 8));
        const isDraft = drawing.id === "draft-ruler";
        const showHandles = isDraft || selectedDrawingId === drawing.id;
        const clipId = `ruler-clip-${drawing.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        const fillColor = priceDelta >= 0 ? "#10B981" : "#EF4444";
        const axisLabelWidth = Math.max(0, width - plotWidth);
        const axisLabelHeight = 20;
        const timeLabelWidth = 104;
        const firstPriceLabelY = Math.max(0, Math.min(height - axisLabelHeight, points[0].y - axisLabelHeight / 2));
        const secondPriceLabelY = Math.max(0, Math.min(height - axisLabelHeight, points[1].y - axisLabelHeight / 2));
        const firstTimeLabelX = Math.max(0, Math.min(width - timeLabelWidth, points[0].x - timeLabelWidth / 2));
        const secondTimeLabelX = Math.max(0, Math.min(width - timeLabelWidth, points[1].x - timeLabelWidth / 2));
        const rangeLeft = Math.max(0, Math.min(points[0].x, points[1].x));
        const rangeRight = Math.min(plotWidth, Math.max(points[0].x, points[1].x));
        const rangeTop = Math.max(0, Math.min(points[0].y, points[1].y));
        const rangeBottomClamped = Math.min(height, Math.max(points[0].y, points[1].y));
        const arrowSize = 7;
        const horizontalArrow = points[1].x >= points[0].x
          ? `${rangeRight},${midpoint.y} ${rangeRight - arrowSize},${midpoint.y - arrowSize / 2} ${rangeRight - arrowSize},${midpoint.y + arrowSize / 2}`
          : `${rangeLeft},${midpoint.y} ${rangeLeft + arrowSize},${midpoint.y - arrowSize / 2} ${rangeLeft + arrowSize},${midpoint.y + arrowSize / 2}`;
        const verticalArrow = points[1].y >= points[0].y
          ? `${midpoint.x},${rangeBottomClamped} ${midpoint.x - arrowSize / 2},${rangeBottomClamped - arrowSize} ${midpoint.x + arrowSize / 2},${rangeBottomClamped - arrowSize}`
          : `${midpoint.x},${rangeTop} ${midpoint.x - arrowSize / 2},${rangeTop + arrowSize} ${midpoint.x + arrowSize / 2},${rangeTop + arrowSize}`;

        return (
          <g key={drawing.id}>
            <defs><clipPath id={clipId}><rect x="0" y="0" width={plotWidth} height={height} /></clipPath></defs>
            <g clipPath={`url(#${clipId})`}>
              <rect x={Math.min(points[0].x, points[1].x)} y={Math.min(points[0].y, points[1].y)} width={Math.abs(points[1].x - points[0].x)} height={Math.abs(points[1].y - points[0].y)} fill={fillColor} opacity="0.12" />
              <line x1={rangeLeft} y1={midpoint.y} x2={rangeRight} y2={midpoint.y} stroke={fillColor} strokeWidth="1.5" />
              <polygon points={horizontalArrow} fill={fillColor} />
              <line x1={midpoint.x} y1={rangeTop} x2={midpoint.x} y2={rangeBottomClamped} stroke={fillColor} strokeWidth="1.5" />
              <polygon points={verticalArrow} fill={fillColor} />
            </g>
            <foreignObject x={labelX} y={labelY} width={labelWidth} height={labelHeight} pointerEvents="none">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#FFFFFF", background: `${fillColor}CC`, border: `1px solid ${fillColor}`, borderRadius: 4, padding: "3px 6px", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", boxSizing: "border-box" }}>
                {statsText}
              </div>
            </foreignObject>
            {showHandles ? (
              <>
                {[{ y: firstPriceLabelY, value: start.price }, { y: secondPriceLabelY, value: end.price }].map((item, index) => (
                  <g key={`${drawing.id}-price-axis-${index}`} pointerEvents="none">
                    <rect x={plotWidth} y={item.y} width={axisLabelWidth} height={axisLabelHeight} rx="2" fill="#2962FF" />
                    <text x={plotWidth + 5} y={item.y + 14} fill="#FFFFFF" fontSize="11" fontWeight="500">{formatTrendlinePrice(item.value)}</text>
                  </g>
                ))}
                {[{ x: firstTimeLabelX, time: start.time }, { x: secondTimeLabelX, time: end.time }].map((item, index) => (
                  <g key={`${drawing.id}-time-axis-${index}`} pointerEvents="none">
                    <rect x={item.x} y={height - axisLabelHeight} width={timeLabelWidth} height={axisLabelHeight} rx="2" fill="#2962FF" />
                    <text x={item.x + 5} y={height - 6} fill="#FFFFFF" fontSize="11" fontWeight="500">{formatTrendlineTime(item.time)}</text>
                  </g>
                ))}
              </>
            ) : null}
            {showHandles ? points.map((point, index) => <circle key={`${drawing.id}-handle-${index}`} cx={point.x} cy={point.y} r="5" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2" />) : null}
          </g>
        );
      }

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
    [activeTool, displayCandles, getChartPoint, selectedDrawingId, toPixelPoint],
  );
}
