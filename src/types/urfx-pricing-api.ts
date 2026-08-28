import type { UrfxPricingRulesMeta } from "@/types/urfx-pricing";

export type UrfxPricingRulesResponse = {
  meta: UrfxPricingRulesMeta;
  data: {
    provider: "URFX";
    currency: "USD";
    sourceFile: string;
    reviewedAt: string;
    planCount: number;
  } & Record<string, unknown>;
};
