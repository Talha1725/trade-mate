export type MagnetSnapField = "open" | "high" | "low" | "close";

export type MagnetCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type MagnetSnapResult = {
  snapped: boolean;
  time: number;
  price: number;
  logicalIndex?: number;
  field: MagnetSnapField | null;
  distancePx: number | null;
  candle: MagnetCandle | null;
};

export type MagnetTimeScale = {
  coordinateToLogical?: (coordinate: number) => number | null;
  coordinateToTime: (coordinate: number) => number | string | { year: number; month: number; day: number } | null;
};

export type MagnetSeries = {
  coordinateToPrice: (coordinate: number) => number | null;
  priceToCoordinate: (price: number) => number | null;
};
