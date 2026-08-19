import { ROUTES } from "@/constants/routes";
import { get } from "@/lib/utils/api";
import type { UrfxPricingPlan, UrfxPricingPlanKey } from "@/types/urfx-pricing";
import type { UrfxPricingRulesResponse } from "@/types/urfx-pricing-api";

export const urfxPricingApi = {
  getPricingPlan(planKey: UrfxPricingPlanKey): Promise<UrfxPricingPlan> {
    return get<{ data: UrfxPricingPlan }>(ROUTES.INTEGRATIONS.URFX_PRICING_RULES(planKey)).then((response) => response.data);
  },

  getPricingRules(): Promise<UrfxPricingRulesResponse> {
    return get<UrfxPricingRulesResponse>("/api/integrations/urfx/pricing-rules");
  },
};
