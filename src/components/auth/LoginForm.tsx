"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signInAndCreateSession } from "@/lib/client/session";

export function LoginForm() {
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string; password: string }>();

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const res = await signInAndCreateSession(email, password);
    if (!res.ok) return setError(res.message);
    window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input label="Email" type="email" autoComplete="email" inputMode="email" required {...register("email", { required: true })} />
      <PasswordInput label="Password" autoComplete="current-password" required {...register("password", { required: true })} />
      {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" loading={isSubmitting} className="w-full">Sign in</Button>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-[var(--accent)] hover:underline">Forgot password?</Link>
        <Link href="/enroll" className="text-[var(--accent)] hover:underline">Create an account</Link>
      </div>
    </form>
  );
}
