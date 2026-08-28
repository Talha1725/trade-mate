import type { UrfxPricingPlanKey } from "@/types/urfx-pricing";

export const PROFIT_TARGET_PERCENT_BY_PLAN: Record<UrfxPricingPlanKey, number> = {
  onePhase: 10,
  twoPhase: 10,
  instantFundingPro: 10,
  instantFundingLite: 8,
};

export const DECORATIVE_PORTFOLIO_CHART = [41, 44, 47, 50, 53, 55, 52, 54, 57, 60, 58, 61, 64, 62, 65, 63, 66, 69, 67, 70, 72, 74, 75];
export const DECORATIVE_PORTFOLIO_DOWN_CHART = [58, 57, 56, 55, 54, 52, 51, 50, 49, 48, 47, 46, 45];
