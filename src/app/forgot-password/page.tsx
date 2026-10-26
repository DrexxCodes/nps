import { ForgotForm } from "@/components/auth/ForgotForm";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Reset password" };
export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold">Reset your password</h1>
        <p className="mb-6 mt-1 text-sm text-[var(--muted)]">Enter your account email and we'll send you a reset link.</p>
        <ForgotForm />
      </Card>
    </div>
  );
}
