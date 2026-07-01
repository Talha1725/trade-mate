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
  ZoomIn,
} from "lucide-react";

import { cn } from "@/lib/utils";

const TOOLBAR_ITEMS = [
  { id: "crosshair", icon: Crosshair, label: "Crosshair" },
  { id: "trendline", icon: TrendingUp, label: "Trend line" },
  { id: "fibonacci", icon: GitBranch, label: "Fibonacci" },
  { id: "brush", icon: Brush, label: "Brush" },
  { id: "path", icon: PenLine, label: "Path" },
  { id: "text", icon: Type, label: "Text" },
  { id: "magnet", icon: Magnet, label: "Magnet" },
  { id: "ruler", icon: Ruler, label: "Ruler" },
  { id: "zoom", icon: ZoomIn, label: "Zoom" },
] as const;

type ChartToolbarProps = {
  className?: string;
};

export function ChartToolbar({ className }: ChartToolbarProps) {
  return (
    <div
      className={cn(
        "flex w-11 shrink-0 flex-col items-center gap-1 border border-white/10 rounded-[12px] bg-linear-to-t from-white/7 to-white/5 py-3",
        className,
      )}
    >
      {TOOLBAR_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white"
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
