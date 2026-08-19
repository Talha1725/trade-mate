"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { RiEyeCloseLine } from "react-icons/ri";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";
import type { AuthStatus, LoginFormValues, LoginFormProps } from "@/types";

const initialValues: LoginFormValues = {
  email: "",
  password: "",
  rememberMe: true,
};

export function LoginForm({
  onSubmit,
  redirectTo,
  className,
}: LoginFormProps) {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const [values, setValues] = React.useState<LoginFormValues>(initialValues);
  const [status, setStatus] = React.useState<AuthStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const isSubmitting = status === "submitting";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setStatus("submitting");
    const toastId = toast.loading("Signing you in...");

    try {
      if (onSubmit) {
        await onSubmit(values);
      } else {
        await signIn({
          email: values.email,
          password: values.password,
        });
      }
      toast.dismiss(toastId);
      toast.success("Signed in successfully");
      setStatus("success");
      router.push(redirectTo ?? "/dashboard");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col", className)}
      noValidate
    >
      <div className="flex flex-col items-center gap-1.5 mb-8 text-center">
        <h2 className="text-[22px] font-semibold text-white">
          Welcome back
        </h2>
        <p className="text-sm text-white/50">
          Sign in with your email to access the trader dashboard.
        </p>
      </div>

      <div className="space-y-5 mb-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="login-email" className="text-sm font-normal text-white/50">
            Email
          </label>
          <div className="w-full rounded-[10px] border border-white/20 gradient-btn-trade px-3 py-2.5 flex items-center">
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={values.email}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, email: event.target.value }))
              }
              required
              disabled={isSubmitting}
              className="w-full bg-transparent text-sm font-normal text-white outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="login-password" className="text-sm font-normal text-white/50">
            Password
          </label>
          <div className="w-full rounded-[10px] border border-white/20 gradient-btn-trade px-3 py-2 flex items-center justify-between">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={values.password}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, password: event.target.value }))
              }
              required
              disabled={isSubmitting}
              className="w-full bg-transparent text-sm font-normal text-white outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-white/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 -mr-1 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
              tabIndex={-1}
            >
              {showPassword ? <RiEyeCloseLine className="size-4 text-white" /> : <Eye className="size-4 text-white/50" />}
            </button>
          </div>
        </div>
        <div className="text-right text-sm text-white/50 mt-4">
        <Link href="/forgot-password" className="text-white/80 underline underline-offset-4 hover:text-white">
          Forgot password?
        </Link>
      </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mb-6 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-base font-medium text-white btn-green hover:opacity-90 transition-opacity"
      >
        {!isSubmitting ? <ArrowRightIcon className="size-4" /> : null}
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
