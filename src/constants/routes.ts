export const ROUTES = {
  /** Auth Module */
  AUTH: {
    LOGIN:           `/api/auth/login`,
    ME:              `/api/auth/me`,
    FORGOT_PASSWORD: `/api/auth/forgot-password`,
    RESET_PASSWORD:  `/api/auth/reset-password`,
  },

  /** Market Module */
  MARKET: {
    QUOTES:         `/api/market/quotes`,
    HISTORY:        `/api/market/history`,
    CHART_DATA:     `/api/market/chart`,
    SYMBOLS:        `/api/market/symbols`,
    SNAPSHOT:       `/api/market/snapshot`,
    BY_SYMBOL: (s: string) => `/api/market/${s}`,
    CHART:    (s: string) => `/api/market/${s}/chart`,
  },

  /** Trade Module */
  TRADE: {
    LIST:           `/api/trades`,
    OPEN:           `/api/trades/open`,
    CLOSE:          `/api/trades/close`,
    MODIFY:         `/api/trades/modify`,
    ACCOUNT: (id: string) => `/api/account/${id}`,
    BY_ID:  (id: string) => `/api/trades/${id}`,
    CREATE:         `/api/trades/create`,
    HISTORY:        `/api/trades/history`,
  },

  /** Position Module */
  POSITION: {
    LIST:           `/api/positions`,
    BY_ID:  (id: string) => `/api/positions/${id}`,
    CLOSE:  (id: string) => `/api/positions/${id}/close`,
  },

  /** Account Module */
  ACCOUNT: {
    SUMMARY:        `/api/account/summary`,
    BY_ID:  (id: string) => `/api/account/${id}`,
    LIST:           `/api/accounts`,
    WISHLIST: (accountNumber: string) =>
      `/api/accounts/${encodeURIComponent(accountNumber)}/wishlist`,
    WISHLIST_ITEM: (accountNumber: string, assetId: string) =>
      `/api/accounts/${encodeURIComponent(accountNumber)}/wishlist/${encodeURIComponent(assetId)}`,
  },

  /** Dashboard Module */
  DASHBOARD: {
    SUMMARY:        `/api/dashboard/summary`,
    EQUITY_CURVE:   `/api/dashboard/equity-curve`,
    BREAKDOWN:      `/api/dashboard/breakdown`,
    RECENT_ACTIVITY:`/api/dashboard/recent-activity`,
    STAT_CARDS:     `/api/dashboard/stat-cards`,
  },

  /** Analytics Module */
  ANALYTICS: {
    OVERVIEW:       `/api/analytics/overview`,
  },

  /** Portfolio Module */
  PORTFOLIO: {
    OVERVIEW:       `/api/portfolio/overview`,
    SUMMARY:        `/api/portfolio/summary`,
    CHART:          `/api/portfolio/chart`,
    ALLOCATION:     `/api/portfolio/allocation`,
    EXPOSURE:       `/api/portfolio/exposure`,
    TOP_MOVERS:     `/api/portfolio/top-movers`,
  },

  /** Settings Module */
  SETTINGS: {
    OVERVIEW:       `/api/settings/overview`,
    PROFILE:        `/api/settings/profile`,
    PASSWORD:       `/api/settings/password`,
    AVATAR_PRESIGN: `/api/settings/avatar/presign`,
  },

  /** Orders Module */
  ORDERS: {
    OVERVIEW:       `/api/orders/overview`,
  },

  /** Assets Module */
  ASSETS: {
    LIST:           `/api/assets`,
  },

  /** Integrations Module */
  INTEGRATIONS: {
    URFX_PRICING_RULES: (planKey: string) =>
      `/api/integrations/urfx/pricing-rules/${encodeURIComponent(planKey)}`,
  },

  /** Admin Module */
  ADMIN: {
    ACCOUNTS:        `/api/admin/accounts`,
    TRADES:          `/api/admin/trades`,
    TRADE_BY_ID: (id: string) => `/api/admin/trades/${id}`,
    USERS:           `/api/admin/users`,
    INJECT_PREVIEW:  `/api/admin/inject/preview`,
    INJECT:          `/api/admin/inject`,
    BULK_PUSH:       `/api/admin/bulk-push`,
    AUDIT:           `/api/admin/audit`,
  },
} as const

export const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/logout",
  "/forgot-password",
  "/reset-password",
])

export type RoutesType = typeof ROUTES

export default ROUTES
