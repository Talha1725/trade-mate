"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { AUTH_CONSTANTS } from "@/constants/auth";
import { loginApi } from "@/lib/services/auth.api";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await loginApi.forgotPassword(email);
      setSubmitted(true);
      toast.success(response.message || AUTH_CONSTANTS.genericResetMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to request a reset link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="text-center">
        <h1 className="text-[22px] font-semibold text-white">Forgot password?</h1>
        <p className="mt-2 text-sm text-white/50">Enter your email and we’ll send you a secure reset link.</p>
      </div>

      <label className="flex flex-col gap-2 text-sm text-white/50" htmlFor="forgot-email">
        Email
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isSubmitting}
          placeholder="Enter your email"
          className="w-full rounded-[10px] border border-white/20 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-primary"
        />
      </label>

      {submitted ? (
        <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          {AUTH_CONSTANTS.genericResetMessage} Check your inbox and spam folder.
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting} className="w-full rounded-[10px] btn-green py-2.5 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? "Sending..." : "Send reset link"}
      </button>

      <Link href="/login" className="text-center text-sm text-white/60 underline underline-offset-4 hover:text-white">
        Back to sign in
      </Link>
    </form>
  );
}
