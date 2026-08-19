import type React from "react";
import type { ID, ISODateString } from "@/types";

export type UserRole = "trader" | "admin";

export type AuthUser = {
  id: ID;
  email: string;
  assignedId?: string;
  name: string;
  role: UserRole;
  createdAt?: ISODateString;
  avatarUrl?: string | null;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type ForgotPasswordResponse = {
  success: boolean;
  message: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
};

export type AuthApiUser = Pick<AuthUser, "id" | "email" | "name" | "role"> & {
  assignedId?: string;
  avatarUrl?: string | null;
  createdAt?: ISODateString;
};

export type AuthLoginResponse = {
  token: string;
  user: AuthApiUser;
};

export type AuthSession = {
  user: AuthUser;
  token?: string;
  expiresAt?: ISODateString;
};

export type AuthStatus = "idle" | "submitting" | "success" | "error";

export type AuthSessionStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

export type LoginFormValues = LoginCredentials & {
  rememberMe: boolean;
};

export type AuthStoreState = {
  session: AuthSession | null;
  status: AuthSessionStatus;
  hasHydrated: boolean;
};

export type AuthStoreActions = {
  loadSession: () => Promise<AuthSession | null>;
  signIn: (credentials: LoginCredentials) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  expireSession: () => void;
  clearToken: () => void;
  setHasHydrated: (value: boolean) => void;
};

export type AuthStore = AuthStoreState & AuthStoreActions;

export type RouteGuardProps = {
  children: React.ReactNode;
  requiredRole?: UserRole;
};
