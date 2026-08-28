import { cn } from "@/lib/utils";
import type { GradientHorizontalProgressProps } from "@/types/gradient-horizontal-progress";
import { GRADIENT_PROGRESS_FILL } from "@/constants/progress";

export function GradientHorizontalProgress({
  value,
  leftLabel,
  rightLabel,
  className,
  trackClassName,
  fill = GRADIENT_PROGRESS_FILL,
}: GradientHorizontalProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const hasFooter = Boolean(leftLabel || rightLabel);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "h-1.5 w-full overflow-hidden rounded-full bg-white/20",
          trackClassName,
        )}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${clampedValue}%`,
            background: fill,
          }}
        />
      </div>

      {hasFooter ? (
        <div className="flex items-center justify-between gap-2 text-xs text-white/60">
          <span className="font-medium">{leftLabel}</span>
          <span className="text-white font-semibold">{rightLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
