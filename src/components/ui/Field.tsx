import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const control = "w-full rounded-xl border border-[var(--line)] bg-[var(--glass-strong)] px-3.5 text-[15px] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] placeholder:text-[var(--muted)]/70 disabled:opacity-60";

function Wrap({ label, error, hint, id, children }: { label: string; error?: string; hint?: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--muted)]">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-[var(--danger)]">{error}</p>}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: string };
type WithTrailing = { trailing?: ReactNode }; // e.g. the password show/hide button, placed inside the input box

export const Input = forwardRef<HTMLInputElement, Common & WithTrailing & InputHTMLAttributes<HTMLInputElement>>(function Input({ label, error, hint, id, className = "", trailing, ...rest }, ref) {
  const fid = id ?? rest.name ?? label;
  return (
    <Wrap label={label} error={error} hint={hint} id={fid}>
      <div className="relative">
        <input ref={ref} id={fid} aria-invalid={!!error} className={`${control} h-11 ${trailing ? "pr-11" : ""} ${className}`} {...rest} />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>}
      </div>
    </Wrap>
  );
});

export const Select = forwardRef<HTMLSelectElement, Common & SelectHTMLAttributes<HTMLSelectElement>>(function Select({ label, error, hint, id, className = "", children, ...rest }, ref) {
  const fid = id ?? rest.name ?? label;
  return <Wrap label={label} error={error} hint={hint} id={fid}><select ref={ref} id={fid} aria-invalid={!!error} className={`${control} h-11 ${className}`} {...rest}>{children}</select></Wrap>;
});

export const Textarea = forwardRef<HTMLTextAreaElement, Common & TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ label, error, hint, id, className = "", ...rest }, ref) {
  const fid = id ?? rest.name ?? label;
  return <Wrap label={label} error={error} hint={hint} id={fid}><textarea ref={ref} id={fid} aria-invalid={!!error} className={`${control} py-2.5 min-h-24 ${className}`} {...rest} /></Wrap>;
});

export function Checkbox({ label, className = "", ...rest }: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex items-start gap-2.5 text-sm cursor-pointer ${className}`}>
      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}
