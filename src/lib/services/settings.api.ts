import { ROUTES } from "@/constants/routes";
import { get, patch, post } from "@/lib/utils/api";
import type {
  SettingsOverviewResponse,
  SettingsAvatarPresignResponse,
} from "@/types/settings";
import type {
  CreateSettingsAvatarPresignPayload,
  UpdateSettingsPasswordPayload,
  UpdateSettingsProfilePayload,
} from "@/types/settings-api";

export const settingsApi = {
  getOverview(accountId?: string | null): Promise<SettingsOverviewResponse> {
    return get(ROUTES.SETTINGS.OVERVIEW, {
      params: accountId ? { accountId } : undefined,
    });
  },

  updateProfile(payload: UpdateSettingsProfilePayload) {
    return patch<{ user: SettingsOverviewResponse["user"] }>(ROUTES.SETTINGS.PROFILE, payload);
  },

  updatePassword(payload: UpdateSettingsPasswordPayload) {
    return patch<{ success: true }>(ROUTES.SETTINGS.PASSWORD, payload);
  },

  createAvatarPresign(payload: CreateSettingsAvatarPresignPayload) {
    return post<SettingsAvatarPresignResponse>(ROUTES.SETTINGS.AVATAR_PRESIGN, payload);
  },
};
