import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Sign in" };
export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="mb-6 mt-1 text-sm text-[var(--muted)]">Sign in to see your orders, payments and profile.</p>
        <Suspense><LoginForm /></Suspense>
      </Card>
    </div>
  );
}
