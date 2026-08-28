export type UpdateSettingsProfilePayload = {
  name?: string;
  avatarUrl?: string | null;
};

export type UpdateSettingsPasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type CreateSettingsAvatarPresignPayload = {
  fileName: string;
  contentType: string;
};
