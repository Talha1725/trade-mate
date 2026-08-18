"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const status = useAuthStore((state) => state.status);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  React.useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (status === "authenticated" && session?.token) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, router, session?.token, status]);

  return (
    <main className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center w-full sm:max-w-[400px] md:max-w-[440px]">
        {/* Logo */}
        <div className="mb-6 sm:mb-8 flex justify-center w-full">
          <Image src="/images/logo.svg" alt="Trade Mate" height={40} width={213} className="h-8 sm:h-10 w-auto object-contain" />
        </div>

        {/* Card */}
        <div className="w-full gradient-dialog-bg border border-white/20 p-6 shadow-2xl rounded-[20px] text-white">
          {!hasHydrated ? (
            <div className="flex min-h-[300px] items-center justify-center text-sm text-white/50">
              Checking your session...
            </div>
          ) : (
            <LoginForm redirectTo="/dashboard" />
           )} 
        </div>
      </div>
    </main>
  );
}
