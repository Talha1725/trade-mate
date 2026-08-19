"use client";

import * as React from "react";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <React.Suspense fallback={<div className="py-12 text-center text-sm text-white/50">Loading reset form...</div>}>
        <ResetPasswordForm />
      </React.Suspense>
    </AuthPageShell>
  );
}
