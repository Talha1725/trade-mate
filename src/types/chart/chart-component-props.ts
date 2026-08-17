import type * as React from "react";

import type { VwapCalculationSettings, VwapPoint } from "@/lib/utils/chart-indicators";
import type { ChartIndicatorId, ChartToolId, MagnetMode } from "@/types/lightweight-trading-chart";

export type DrawingRendererContext = {
  activeTool: string;
  displayCandles: Array<{ time: number; volume?: number }>;
  getChartPoint: (event: React.PointerEvent<HTMLElement>) => { time: number; price: number; logicalIndex?: number } | null;
  selectedDrawingId: string | null;
  toPixelPoint: (point: { time: number; price: number }) => { x: number; y: number } | null;
  drawingOverlayRef: React.RefObject<SVGSVGElement | null>;
  mainChartRef: React.MutableRefObject<{ timeScale: () => { width: () => number } } | null>;
  candleSeriesRef: React.MutableRefObject<{ priceToCoordinate: (price: number) => number | null } | null>;
  draggingTextRef: React.MutableRefObject<{ id: string; start: unknown; originalPoint: unknown } | null>;
  setSelectedDrawingId: (id: string | null) => void;
  setTextEditor: (value: { point: { time: number; price: number }; value: string; pixel: { x: number; y: number }; editingId?: string } | null) => void;
};

export type ChartIndicatorPanelProps = {
  enabledIndicators: ChartIndicatorId[];
  indicatorPeriods: { ema: number };
  setIndicatorPeriods: React.Dispatch<React.SetStateAction<{ ema: number }>>;
  vwapSettings: VwapCalculationSettings;
  setVwapSettings: React.Dispatch<React.SetStateAction<VwapCalculationSettings>>;
  latestVwapPoint: VwapPoint | null;
  symbol: string;
  isVwapSettingsOpen: boolean;
  setIsVwapSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  vwapSettingsTab: "inputs" | "style" | "visibility";
  setVwapSettingsTab: React.Dispatch<React.SetStateAction<"inputs" | "style" | "visibility">>;
};

export type ChartToolbarPanelProps = {
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

export type ChartToolbarProps = {
  className?: string;
  activeTool: ChartToolId;
  magnetMode: MagnetMode;
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
