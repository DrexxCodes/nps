"use client";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { auth } from "@/lib/client/firebase";

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string }>();
  const onSubmit = handleSubmit(async ({ email }) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase()).catch(() => undefined); // never reveal whether the account exists
    setSent(true);
  });
  if (sent) return <p role="status" className="rounded-xl bg-[var(--accent-soft)] p-4 text-sm">If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Email" type="email" autoComplete="email" required {...register("email", { required: true })} />
      <Button type="submit" loading={isSubmitting} className="w-full">Send reset link</Button>
    </form>
  );
}
