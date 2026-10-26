import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="glass rounded-2xl px-6 py-12 text-center">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">{icon ?? <Inbox className="size-6" />}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="glass rounded-2xl px-6 py-10 text-center">
      <AlertTriangle className="mx-auto mb-2 size-8 text-[var(--danger)]" />
      <p className="text-sm">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--muted)]"><Loader2 className="size-5 animate-spin" aria-hidden />{label}…</div>
);

export const PageTitle = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}</div>
    {action}
  </div>
);
