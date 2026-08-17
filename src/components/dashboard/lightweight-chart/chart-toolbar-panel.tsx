"use client";

import { ChartToolbar } from "@/components/dashboard/chart-toolbar";
import type { ChartToolbarPanelProps } from "@/types/chart/chart-component-props";

export function ChartToolbarPanel(props: ChartToolbarPanelProps) {
  return <ChartToolbar {...props} />;
}
