import type { TrendlineStyle } from "@/types/lightweight-trading-chart";

export function getTrendlineStrokeDash(style: TrendlineStyle) {
  if (style.lineStyle === "dashed") return "8 5";
  if (style.lineStyle === "dotted") return "2 4";
  return undefined;
}

export function getExtendedTrendlinePoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  height: number,
  extendLeft: boolean,
  extendRight: boolean,
) {
  if (Math.abs(end.x - start.x) < 0.0001) {
    return { start: extendLeft ? { x: start.x, y: 0 } : start, end: extendRight ? { x: end.x, y: height } : end };
  }
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const intersections: Array<{ x: number; y: number }> = [];
  const addAtX = (x: number) => {
    if (Math.abs(dx) < 0.0001) return;
    const y = start.y + ((x - start.x) * dy) / dx;
    if (y >= 0 && y <= height) intersections.push({ x, y });
  };
  const addAtY = (y: number) => {
    if (Math.abs(dy) < 0.0001) return;
    const x = start.x + ((y - start.y) * dx) / dy;
    if (x >= 0 && x <= width) intersections.push({ x, y });
  };
  addAtX(0); addAtX(width); addAtY(0); addAtY(height);
  const direction = dx === 0 ? 1 : dx;
  const leftBoundary = intersections.filter((point) => direction > 0 ? point.x <= start.x : point.x >= start.x).sort((a, b) => Math.abs(a.x - start.x) - Math.abs(b.x - start.x))[0];
  const rightBoundary = intersections.filter((point) => direction > 0 ? point.x >= end.x : point.x <= end.x).sort((a, b) => Math.abs(a.x - end.x) - Math.abs(b.x - end.x))[0];
  return { start: extendLeft && leftBoundary ? leftBoundary : start, end: extendRight && rightBoundary ? rightBoundary : end };
}

export function clipTrendlineSegmentToPlot(start: { x: number; y: number }, end: { x: number; y: number }, width: number, height: number) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let tMin = 0;
  let tMax = 1;
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 0.0001) return q >= 0;
    const ratio = q / p;
    if (p < 0) { if (ratio > tMax) return false; if (ratio > tMin) tMin = ratio; }
    else { if (ratio < tMin) return false; if (ratio < tMax) tMax = ratio; }
    return true;
  };
  if (!clip(-dx, start.x) || !clip(dx, width - start.x) || !clip(-dy, start.y) || !clip(dy, height - start.y)) return null;
  return { start: { x: start.x + tMin * dx, y: start.y + tMin * dy }, end: { x: start.x + tMax * dx, y: start.y + tMax * dy } };
}

export function distanceToSegment(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + projection * dx), point.y - (start.y + projection * dy));
}

