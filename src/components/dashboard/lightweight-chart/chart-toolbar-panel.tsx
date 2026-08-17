"use client";

import { ChartToolbar } from "@/components/dashboard/chart-toolbar";
import type { ChartIndicatorId, ChartToolId, MagnetMode } from "@/types/lightweight-trading-chart";

type ChartToolbarPanelProps = {
  activeTool: ChartToolId;
  magnetMode: MagnetMode;
  enabledIndicators: ChartIndicatorId[];
  onToolChange: (tool: ChartToolId) => void;
  onMagnetToggle: () => void;
  onIndicatorToggle: (indicator: ChartIndicatorId) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

export function ChartToolbarPanel(props: ChartToolbarPanelProps) {
  return <ChartToolbar {...props} />;
}

