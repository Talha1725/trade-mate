import {
  HistoryIcon,
  LayoutDashboardIcon,
  type LucideIcon,
} from "lucide-react";

import type { NavItem } from "@/types";

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    description: "Account overview and equity curve",
  },
  {
    id: "history",
    label: "History",
    href: "/history",
    description: "Closed trades and account activity",
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    id: "admin-dashboard",
    label: "Dashboard",
    href: "/admin",
    description: "Admin overview",
  },
  {
    id: "admin-accounts",
    label: "Accounts",
    href: "/admin/accounts",
    description: "Account Management",
  },
  {
    id: "admin-audit",
    label: "Audit Logs",
    href: "/admin/audit",
    description: "Audit Logs",
  },
  {
    id: "admin-inject",
    label: "Inject Trades",
    href: "/admin/inject",
    description: "Inject Trades",
  },
];

export const PRIMARY_NAV_ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  history: HistoryIcon,
};

