"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PUBLIC_PATHS } from "@/constants/routes";
import { useAuthStore } from "@/lib/stores/auth-store";

export function AuthenticationBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const loadSession = useAuthStore((state) => state.loadSession);
  const expireSession = useAuthStore((state) => state.expireSession);
  const [validatedToken, setValidatedToken] = React.useState<string | null>(null);
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  React.useEffect(() => {
    const handleAuthenticationFailure = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;

      expireSession();
      queryClient.clear();
      toast.error(detail?.message ?? "Your session has expired. Please sign in again.", {
        id: "authentication-failed",
      });
      router.replace("/login");
    };

    window.addEventListener(
      "trade-mate:authentication-failed",
      handleAuthenticationFailure,
    );

    return () => {
      window.removeEventListener(
        "trade-mate:authentication-failed",
        handleAuthenticationFailure,
      );
    };
  }, [expireSession, queryClient, router]);

  React.useEffect(() => {
    if (!hasHydrated || isPublicPath) {
      return;
    }

    const token = session?.token;
    if (!token) {
      expireSession();
      queryClient.clear();
      router.replace("/login");
      return;
    }

    if (validatedToken === token) {
      return;
    }

    let cancelled = false;

    void loadSession().finally(() => {
      if (cancelled) {
        return;
      }

      const nextSession = useAuthStore.getState().session;
      if (nextSession?.token) {
        setValidatedToken(nextSession.token);
      } else {
        setValidatedToken(null);
        queryClient.clear();
        toast.error("Authentication issue. Please sign in again.", {
          id: "authentication-failed",
        });
        router.replace("/login");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    expireSession,
    hasHydrated,
    isPublicPath,
    loadSession,
    queryClient,
    router,
    session?.token,
    validatedToken,
  ]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (!hasHydrated || !session?.token || validatedToken !== session.token) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-sm text-white/60">
        <div className="inline-flex items-center gap-2">
          <Loader2Icon className="size-4 animate-spin" />
          Verifying your session...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
