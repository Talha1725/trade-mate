"use client";

import {
  Brush,
  Crosshair,
  GitBranch,
  Magnet,
  PenLine,
  Ruler,
  TrendingUp,
  Type,
  RotateCcw,
  Undo2,
  Redo2,
  Waves,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChartToolId } from "@/types/lightweight-trading-chart";
import type { ChartIndicatorId } from "@/types/lightweight-trading-chart";

const TOOLBAR_ITEMS = [
  { id: "crosshair", icon: Crosshair, label: "Crosshair" },
  { id: "trendline", icon: TrendingUp, label: "Trend line" },
  { id: "fibonacci", icon: GitBranch, label: "Fibonacci" },
  { id: "brush", icon: Brush, label: "Brush" },
  { id: "path", icon: PenLine, label: "Path" },
  { id: "text", icon: Type, label: "Text" },
  { id: "magnet", icon: Magnet, label: "Magnet" },
  { id: "ruler", icon: Ruler, label: "Ruler" },
  { id: "zoom-in", icon: ZoomIn, label: "Zoom in" },
  { id: "zoom-out", icon: ZoomOut, label: "Zoom out" },
  { id: "reset", icon: RotateCcw, label: "Reset view" },
  { id: "undo", icon: Undo2, label: "Undo drawing" },
  { id: "redo", icon: Redo2, label: "Redo drawing" },
] as const;

const INDICATOR_ITEMS = [
  { id: "ema20", icon: TrendingUp, label: "EMA 20" },
  { id: "ema50", icon: GitBranch, label: "EMA 50" },
  { id: "vwap", icon: Ruler, label: "VWAP" },
  { id: "rolling-vwap", icon: Waves, label: "Rolling VWAP" },
] as const;

type ChartToolbarProps = {
  className?: string;
  activeTool: ChartToolId;
  magnetEnabled: boolean;
  onToolChange: (tool: ChartToolId) => void;
  onMagnetToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  enabledIndicators: ChartIndicatorId[];
  onIndicatorToggle: (indicator: ChartIndicatorId) => void;
};

export function ChartToolbar({
  className,
  activeTool,
  magnetEnabled,
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
        const isActive = isMagnet ? magnetEnabled : item.id === activeTool;

        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
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
              "flex size-8 cursor-pointer items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white",
              isActive && "bg-primary/20 text-primary",
            )}
          >
            <Icon className="size-4" />
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
              "flex size-8 cursor-pointer items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white",
              isActive && "bg-primary/20 text-primary",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
