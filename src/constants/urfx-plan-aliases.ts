import type { UrfxPricingPlanKey } from "@/types/urfx-pricing";

export const URFX_PLAN_KEY_ALIASES: Record<string, UrfxPricingPlanKey> = {
  twophase: "twoPhase", onephase: "onePhase", onestep: "onePhase",
  instantfunding: "instantFundingPro", instantfundingpro: "instantFundingPro", instantfundinglite: "instantFundingLite",
};
