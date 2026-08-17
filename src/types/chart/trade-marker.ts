import type { ChartCandle } from "@/types/eodhd";

export type TradeMarkerSide = "buy" | "sell";

export type TradeMarker = {
  id: string;
  time: number;
  side: TradeMarkerSide;
  price: number;
  quantity?: number;
  orderType?: "market" | "limit";
  label?: string;
  timestamp?: string | null;
  symbol?: string;
  metadata?: unknown;
};

export type TradeMarkerOverlayProps = {
  markers: TradeMarker[];
  candles: ChartCandle[];
  bucketSeconds: number;
  viewportRevision?: number;
  showTradeMarkers?: boolean;
  getPixelPoint: (point: { time: number; price: number }) => { x: number; y: number } | null;
  formatPrice?: (price: number) => string;
  onTradeMarkerClick?: (marker: TradeMarker) => void;
};

export type PositionedTradeMarker = TradeMarker & {
  candle: ChartCandle;
  bucketTime: number;
  x: number;
  y: number;
  candleWidth: number;
  stackIndex: number;
  groupCount: number;
  collapsed: boolean;
};
