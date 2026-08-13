"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";
import type {
  MiniAreaLineChartPalette,
  MiniAreaLineChartProps,
} from "@/types/mini-area-line-chart";

const MINI_LINE_PALETTES: Record<
  MiniAreaLineChartPalette,
  { stroke: [string, string, string]; fill: [string, string, string] }
> = {
  profit: {
    stroke: ["#22e0a2", "#22e0a2", "#22e0a2"],
    fill: ["#22E0A266", "#22E0A266", "#22E0A266"],
  },
  loss: {
    stroke: ["#EF4444", "#EF4444", "#EF4444"],
    fill: ["#EF444466", "#EF444466", "#EF444466"],
  },
};

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return "";
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function resolvePalette(
  values: number[],
  palette?: MiniAreaLineChartPalette,
): MiniAreaLineChartPalette {
  if (palette) {
    return palette;
  }

  if (values.length < 2) {
    return "profit";
  }

  return values.at(-1)! >= values[0] ? "profit" : "loss";
}

export function MiniAreaLineChart({
  values,
  className = "",
  strokeId,
  fromZero = false,
  minValue,
  maxValue,
  palette,
  showEndDot = true,
}: MiniAreaLineChartProps) {
  const generatedId = useId().replace(/:/g, "");
  const resolvedStrokeId = strokeId ?? `mini-area-line-${generatedId}`;
  const width = 180;
  const height = 86;
  const padding = 0;

  if (!values.length) {
    return null;
  }

  const chartValues = fromZero && values[0] !== 0
    ? [0, ...values]
    : values.length === 1
      ? [values[0], values[0]]
      : values;
  const dataMin = Math.min(...chartValues);
  const dataMax = Math.max(...chartValues);
  let min = fromZero ? 0 : Number.isFinite(minValue) ? Math.min(minValue as number, dataMin) : dataMin;
  let max = Number.isFinite(maxValue) ? Math.max(maxValue as number, dataMax) : dataMax;

  if (max <= min) {
    const center = dataMin;
    const padding = Math.max(Math.abs(center) * 0.0005, 0.00001);
    min = center - padding;
    max = center + padding;
  }

  const range = max - min;

  const points = chartValues.map((value, index) => ({
    x: padding + (index / Math.max(1, chartValues.length - 1)) * (width - padding * 2),
    y: padding + (1 - (value - min) / range) * (height - padding * 2),
  }));

  const linePath = buildSmoothPath(points);
  const isFlat = dataMax === dataMin;
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath =
    first && last
      ? `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`
      : "";

  const resolvedPalette = resolvePalette(values, palette);
  const colors = MINI_LINE_PALETTES[resolvedPalette];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-full w-full overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${resolvedStrokeId}-stroke`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colors.stroke[0]} />
          <stop offset="48%" stopColor={colors.stroke[1]} />
          <stop offset="100%" stopColor={colors.stroke[2]} />
        </linearGradient>
        <linearGradient id={`${resolvedStrokeId}-fill-x`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colors.fill[0]} stopOpacity="0.18" />
          <stop offset="48%" stopColor={colors.fill[1]} stopOpacity="0.2" />
          <stop offset="100%" stopColor={colors.fill[2]} stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id={`${resolvedStrokeId}-fill-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <mask id={`${resolvedStrokeId}-fill-mask`}>
          <path d={areaPath} fill={`url(#${resolvedStrokeId}-fill-fade)`} />
        </mask>
      </defs>

      <path
        d={areaPath}
        fill={`url(#${resolvedStrokeId}-fill-x)`}
        mask={`url(#${resolvedStrokeId}-fill-mask)`}
      />
      <path
        d={linePath}
        fill="none"
        stroke={`url(#${resolvedStrokeId}-stroke)`}
        strokeLinecap="round"
        strokeWidth="1.5"
      />

      {isFlat ? (
        <line
          x1={0}
          y1={points[0]?.y ?? height / 2}
          x2={width}
          y2={points[0]?.y ?? height / 2}
          stroke={colors.stroke[2]}
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      ) : null}

      {showEndDot && last ? (
        <>
          <circle cx={last.x} cy={last.y} r="3" fill={colors.stroke[2]} opacity="0.35" />
          <circle
            cx={last.x}
            cy={last.y}
            r="3"
            fill={colors.stroke[2]}
            style={{ filter: `drop-shadow(0 0 6px ${colors.stroke[2]})` }}
          />
        </>
      ) : null}
    </svg>
  );
}
