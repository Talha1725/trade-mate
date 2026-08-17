import {
  Brush,
  ChartSpline,
  Crosshair,
  Magnet,
  PenLine,
  Ruler,
  TrendingUp,
  Type,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export const TOOLBAR_ITEMS = [
  { id: "crosshair", icon: Crosshair, label: "Crosshair" },
  { id: "trendline", icon: TrendingUp, label: "Trend line" },
  { id: "fibonacci", icon: ChartSpline, label: "Fibonacci retracement" },
  { id: "brush", icon: Brush, label: "Brush" },
  { id: "path", icon: PenLine, label: "Path" },
  { id: "text", icon: Type, label: "Text" },
  { id: "magnet", icon: Magnet, label: "Magnet" },
  { id: "ruler", icon: Ruler, label: "Scale / Measure" },
  { id: "zoom-in", icon: ZoomIn, label: "Zoom in" },
  { id: "zoom-out", icon: ZoomOut, label: "Zoom out" },
  { id: "reset", icon: RotateCcw, label: "Reset view" },
  { id: "undo", icon: Undo2, label: "Undo drawing" },
  { id: "redo", icon: Redo2, label: "Redo drawing" },
] as const;

export const INDICATOR_ITEMS = [
  { id: "ema", icon: TrendingUp, label: "EMA" },
] as const;
