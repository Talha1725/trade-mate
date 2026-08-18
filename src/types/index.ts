export type ID = string;

export type ISODateString = string;

export type Nullable<T> = T | null;

export type {
  AuthSession,
  AuthSessionStatus,
  AuthStatus,
  AuthStore,
  AuthStoreActions,
  AuthStoreState,
  AuthUser,
  LoginCredentials,
  LoginFormValues,
  RouteGuardProps,
  UserRole,
} from "@/types/auth";

export type { NavItem } from "@/types/nav";
export type { RootLayoutProps } from "@/types/layout";

export type * from "@/types/components";
export type * from "@/types/account";
export type * from "@/types/dashboard";
export type * from "@/types/market";
export type * from "@/types/asset";
export type * from "@/types/wishlist";
export type * from "@/types/eodhd";
export type * from "@/types/lightweight-trading-chart";
export type * from "@/types/chart/chart-instance";
export type * from "@/types/price";
export type * from "@/types/trading-view";
export type * from "@/types/asset-icon";
export type * from "@/types/market-selection-store";
export type * from "@/types/trading-filter-bar";
export type * from "@/types/market-watch-card";
export type * from "@/types/market-snapshot";
export type * from "@/types/sparkline-chart";
export type * from "@/types/mini-area-line-chart";
export type * from "@/types/open-positions-strip";
export type * from "@/types/trading-indicators";
export type * from "@/types/trading-compare-assets";
export type * from "@/types/gradient-horizontal-progress";
export type * from "@/types/semi-circle-donut-gauge";
export type * from "@/types/portfolio-metric-card";
export type * from "@/types/portfolio-value-chart";
export type * from "@/types/portfolio-allocation";
export type * from "@/types/portfolio-exposure-breakdown";
export type * from "@/types/portfolio-top-movers";
export type * from "@/types/portfolio-open-positions";
export type * from "@/types/orders-metric-card";
export type * from "@/types/orders-recent-trades";
export type * from "@/types/orders";
export type * from "@/types/strategy-performance";
export type * from "@/types/orders-depth-chart";
export type * from "@/types/order-book";
export type * from "@/types/active-orders";
export type * from "@/types/responsive-table-scroll";
export type * from "@/types/trading-symbol-cell";
export type * from "@/types/account-switcher";
export type * from "@/types/header-notifications";
export type * from "@/types/account-actions-card";
export type * from "@/types/subscription-plan-card";
export type * from "@/types/account-activity-card";
export type * from "@/types/account-information-card";
export type * from "@/types/security-overview-card";
export type * from "@/types/challenge-progress-card";
export type * from "@/types/analytics";
export type * from "@/types/trading-calendar-card";
export type * from "@/types/trading-table-card";
export type {
  AccountMetricsSummary,
  TradeClosePayload,
  TradeOpenPayload,
  TradeOrderDirection,
} from "@/types/trade";
