"use client";

import { cn } from "@/lib/utils";
import { INDICATOR_ITEMS, TOOLBAR_ITEMS } from "@/constants/chart/toolbar";
import type { ChartToolbarProps } from "@/types/chart/chart-component-props";
import type { ChartIndicatorId, ChartToolId } from "@/types/lightweight-trading-chart";

export function ChartToolbar({
  className,
  activeTool,
  magnetMode,
  onToolChange,
  onMagnetToggle,
  onZoomIn,
  onZoomOut,
  onReset,
  onUndo,
  onRedo,
  enabledIndicators,
  onIndicatorToggle,
}: ChartToolbarProps) {
  return (
    <div
      className={cn(
        "flex w-11 shrink-0 flex-col items-center gap-1 border border-white/10 rounded-[12px] bg-linear-to-t from-white/7 to-white/5 py-3",
        className,
      )}
    >
      {TOOLBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        const isMagnet = item.id === "magnet";
        const isActive = isMagnet ? magnetMode !== "off" : item.id === activeTool;
        const safeMagnetMode = magnetMode ?? "off";
        const itemLabel = isMagnet ? `Magnet: ${safeMagnetMode[0].toUpperCase()}${safeMagnetMode.slice(1)}` : item.label;

        return (
          <button
            key={item.id}
            type="button"
            title={itemLabel}
            aria-label={isMagnet ? itemLabel : item.label}
            aria-pressed={isActive}
            onClick={() => {
              if (item.id === "zoom-in") {
                onZoomIn();
              } else if (item.id === "zoom-out") {
                onZoomOut();
              } else if (item.id === "reset") {
                onReset();
              } else if (item.id === "undo") {
                onUndo();
              } else if (item.id === "redo") {
                onRedo();
              } else if (isMagnet) {
                onMagnetToggle();
              } else {
                onToolChange(item.id as ChartToolId);
              }
            }}
            className={cn(
              "group relative flex size-8 cursor-pointer items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white",
              isActive && "bg-primary/20 text-primary",
            )}
          >
            <Icon className="size-4" />
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/15 bg-black/95 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {itemLabel}
            </span>
          </button>
        );
      })}
      <div className="my-1 h-px w-6 bg-white/15" />
      {INDICATOR_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = enabledIndicators.includes(item.id as ChartIndicatorId);

        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={isActive}
            onClick={() => onIndicatorToggle(item.id as ChartIndicatorId)}
            className={cn(
              "group relative flex size-8 cursor-pointer items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white",
              isActive && "bg-primary/20 text-primary",
            )}
          >
            <Icon className="size-4" />
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/15 bg-black/95 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
