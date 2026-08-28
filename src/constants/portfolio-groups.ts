import type { AssetCategory } from "@/types/asset";

export const PORTFOLIO_GROUPS = [
  {
    id: "crypto",
    label: "Crypto",
    categories: ["CRYPTO"] as AssetCategory[],
    color: "#22E0A2",
    iconSrc: "/images/portfolio/btc.svg",
    iconTone: "green" as const,
    fill: "linear-gradient(180deg, #0CE9A0 0%, #108961 100%)",
  },
  {
    id: "forex",
    label: "Forex",
    categories: ["FOREX"] as AssetCategory[],
    color: "#3B82F6",
    iconSrc: "/images/portfolio/dollar.svg",
    iconTone: "blue" as const,
    fill: "linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)",
  },
  {
    id: "commodities",
    label: "Commodities",
    categories: ["COMMODITIES", "INDICES", "STOCK"] as AssetCategory[],
    color: "#03D5D5",
    iconSrc: "/images/portfolio/graph.svg",
    iconTone: "orange" as const,
    fill: "linear-gradient(180deg, #56F0F0 0%, #03D5D5 100%)",
  },
] as const;

export type PortfolioGroupId = (typeof PORTFOLIO_GROUPS)[number]["id"];
