export const DEPTH_BID_COLOR = "#00FFA3";
export const DEPTH_ASK_COLOR = "#FF4D4D";
export const DEPTH_GRID_COLOR = "rgba(255, 255, 255, 0.14)";

export const DEPTH_CHART_CONFIG = {
  bids: { label: "Bids", color: DEPTH_BID_COLOR },
  asks: { label: "Asks", color: DEPTH_ASK_COLOR },
} as const;

export const DEPTH_Y_AXIS_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
