import type { MarketWatchIcon } from "@/types/market-watch-card";

export type ActiveOrderSide = "buy" | "sell";

export type ActiveOrderType = "limit" | "market" | "stop";

export type ActiveOrderStatus = "filled" | "partial";

export type ActiveOrderRow = {
  id: string;
  displayId: string;
  symbol: string;
  openedAt?: string | null;
  icon: MarketWatchIcon;
  side: ActiveOrderSide;
  type: ActiveOrderType;
  qty: number;
  price: number;
  exitPrice?: number | null;
  markPrice?: number | null;
  pnl?: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  status: ActiveOrderStatus;
};

export type ActiveOrdersTableProps = {
  title?: string;
  orders?: ActiveOrderRow[];
  onExport?: () => void;
  onCloseAll?: () => void;
  isCloseAllLoading?: boolean;
  onCancel?: (orderId: string) => void;
  onModifyProtection?: (input: {
    positionId: string;
    stopLoss: number | null;
    takeProfit: number | null;
  }) => Promise<{ status: "PENDING" | "SENT" | "FAILED" | "SKIPPED" }>;
  className?: string;
};
