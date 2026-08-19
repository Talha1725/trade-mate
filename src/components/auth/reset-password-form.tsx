"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { isValidPassword, PASSWORD_REQUIREMENTS } from "@/constant/auth";
import { loginApi } from "@/lib/services/auth.api";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!token) {
      toast.error("This reset link is invalid or incomplete.");
      return;
    }

    if (!isValidPassword(password)) {
      toast.error(PASSWORD_REQUIREMENTS);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await loginApi.resetPassword({ token, password });
      toast.success(response.message || "Password reset successfully.");
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="text-center">
        <h1 className="text-[22px] font-semibold text-white">Create a new password</h1>
        <p className="mt-2 text-sm text-white/50">Choose a strong password for your Trade Mate account.</p>
      </div>

      <label className="flex flex-col gap-2 text-sm text-white/50" htmlFor="reset-password">
        New password
        <div className="flex items-center rounded-[10px] border border-white/20 bg-black/20 px-3 py-2.5">
          <input id="reset-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="ml-2 text-xs text-white/60 hover:text-white">{showPassword ? "Hide" : "Show"}</button>
        </div>
      </label>

      <label className="flex flex-col gap-2 text-sm text-white/50" htmlFor="reset-confirm-password">
        Confirm password
        <div className="flex items-center rounded-[10px] border border-white/20 bg-black/20 px-3 py-2.5">
          <input id="reset-confirm-password" type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isSubmitting} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
          <button type="button" onClick={() => setShowConfirm((value) => !value)} className="ml-2 text-xs text-white/60 hover:text-white">{showConfirm ? "Hide" : "Show"}</button>
        </div>
      </label>

      <p className="text-xs text-white/45">{PASSWORD_REQUIREMENTS}</p>

      <button type="submit" disabled={isSubmitting} className="w-full rounded-[10px] btn-green py-2.5 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? "Saving..." : "Reset password"}
      </button>

      <Link href="/login" className="text-center text-sm text-white/60 underline underline-offset-4 hover:text-white">Back to sign in</Link>
    </form>
  );
}
