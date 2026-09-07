"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/auth-provider";
import { signInSchema, type SignInInput } from "@/lib/schemas";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, demo } = useAuth();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formMessage, setFormMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setFormMessage(null);
    try {
      if (mode === "signin") {
        await signIn(values.email, values.password);
        router.replace(searchParams.get("redirectTo") ?? "/dashboard");
        return;
      }

      const hasSession = await signUp(values.email, values.password);
      if (hasSession) {
        router.replace(searchParams.get("redirectTo") ?? "/dashboard");
      } else {
        setFormMessage("Account created. Check your email to confirm it, then sign in.");
        setMode("signin");
      }
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : mode === "signin"
            ? "Sign in failed. Check your credentials."
            : "Account creation failed. Please try again.",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      {demo ? (
        <div className="rounded-md border border-amber-warn-100 bg-amber-warn-50 px-3 py-2 text-xs text-amber-warn-700 dark:border-amber-warn-700 dark:bg-amber-warn-700/20 dark:text-amber-warn-100">
          Supabase authentication is not configured, so the workspace is running in demo mode. Configure
          Supabase and set NEXT_PUBLIC_DEMO_MODE=false to require real accounts.
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@codenativex.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" role="alert" className="text-xs text-danger-600">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p id="password-error" role="alert" className="text-xs text-danger-600">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-700 dark:bg-danger-700/20 dark:text-danger-100"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{formError}</span>
        </div>
      ) : null}

      {formMessage ? (
        <div
          role="status"
          className="rounded-md border border-success-100 bg-success-50 px-3 py-2 text-xs text-success-700 dark:border-success-700 dark:bg-success-700/20 dark:text-success-100"
        >
          {formMessage}
        </div>
      ) : null}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        {!isSubmitting ? mode === "signin" ? <LogIn aria-hidden /> : <UserPlus aria-hidden /> : null}
        {mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      {!demo ? (
        <p className="text-center text-xs text-[var(--app-text-muted)]">
          {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-[var(--app-primary)] hover:underline"
            onClick={() => {
              setMode((current) => (current === "signin" ? "signup" : "signin"));
              setFormError(null);
              setFormMessage(null);
            }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      ) : null}
    </form>
  );
}
