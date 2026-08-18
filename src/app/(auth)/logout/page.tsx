"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand-mark";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function LogoutPage() {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      const toastId = toast.loading("Signing you out...");
      try {
        await signOut();
        if (isMounted) {
          toast.dismiss(toastId);
          toast.success("Signed out successfully");
        }
      } finally {
        if (isMounted) {
          router.replace("/login");
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [router, signOut]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(98,77,255,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(32,201,151,0.16),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#eef3fb_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <BrandMark />

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <LogOutIcon className="size-6" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
              Signing you out
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Please wait a moment while we clear your session and send you back to the login page.
            </p>
            <div className="mt-6 flex items-center justify-center">
              <Spinner className="size-5 text-slate-500" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
