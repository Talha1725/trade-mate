import type { UrfxPricingPlanKey } from "@/types/urfx-pricing";

import { DEFAULT_URFX_LEVERAGE } from "@/constants/urfx-pricing";
import { URFX_PLAN_KEY_ALIASES } from "@/constants/urfx-plan-aliases";

export function resolveUrfxPlanKey(fundingType: string | null | undefined): UrfxPricingPlanKey | null {
  const normalized = fundingType?.trim().toLowerCase().replace(/[\s_-]+/g, "");

  if (!normalized) {
    return null;
  }

  if (normalized in URFX_PLAN_KEY_ALIASES) {
    return URFX_PLAN_KEY_ALIASES[normalized];
  }

  if (normalized.includes("two")) {
    return "twoPhase";
  }

  if (normalized.includes("one")) {
    return "onePhase";
  }

  if (normalized.includes("lite")) {
    return "instantFundingLite";
  }

  if (normalized.includes("instant")) {
    return "instantFundingPro";
  }

  return null;
}
