import type { MiniAreaLineChartPalette } from "@/types/mini-area-line-chart";
import type { MarketWatchIcon } from "@/types/market-watch-card";
import type { SparklineDatum } from "@/types/sparkline-chart";

export type OpenPositionSide = "long" | "short";

export type OpenPositionStripItem = {
  id: string;
  symbol: string;
  icon: MarketWatchIcon;
  side: OpenPositionSide;
  pnl: number;
  pnlPercent: number;
  sizeLabel: string;
  entryLabel: string;
  trend: SparklineDatum[];
  palette?: MiniAreaLineChartPalette;
  entryPrice?: number;
  markPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  lots?: number;
};

export type OpenPositionsStripCardProps = {
  title?: string;
  items: OpenPositionStripItem[];
  className?: string;
  onClosePosition?: (positionId: string) => Promise<void>;
  onModifyProtection?: (input: { positionId: string; stopLoss: number | null; takeProfit: number | null }) => Promise<{ status: "PENDING" | "SENT" | "FAILED" | "SKIPPED" }>;
};

export type PositionCardProps = {
  item: OpenPositionStripItem;
  onClosePosition?: (positionId: string) => Promise<void>;
  onModifyProtection?: OpenPositionsStripCardProps["onModifyProtection"];
};
