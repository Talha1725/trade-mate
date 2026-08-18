"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";
import { formatDisplayPercent } from "@/lib/utils/number-formatters";
import type { SemiCircleDonutGaugeProps } from "@/types/semi-circle-donut-gauge";

export function SemiCircleDonutGauge({
  value,
  label,
  className,
  size = 90,
}: SemiCircleDonutGaugeProps) {
  const gradientId = useId().replace(/:/g, "");
  const clampedValue = Math.min(100, Math.max(0, value));
  const displayLabel = label ?? formatDisplayPercent(clampedValue);

  const strokeWidth = 6;
  const radius = 34;
  const centerX = 44;
  const centerY = 44;
  const arcLength = Math.PI * radius;
  const dashOffset = arcLength - (clampedValue / 100) * arcLength;

  const arcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size * 0.58 }}
    >
      <svg
        viewBox="0 0 88 50"
        className="h-full w-full"
        aria-hidden={!label}
        role={label ? "img" : undefined}
        aria-label={label ? `${clampedValue}%` : undefined}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0CE9A0" />
            <stop offset="100%" stopColor="#108961" />
          </linearGradient>
        </defs>

        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        <path
          d={arcPath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>

      <span className="absolute inset-x-0 bottom-0 text-center text-sm font-medium text-white">
        {displayLabel}
      </span>
    </div>
  );
}
