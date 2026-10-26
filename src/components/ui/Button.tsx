import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger"; loading?: boolean; icon?: ReactNode; size?: "md" | "sm" };

const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none";
const variants = {
  primary: "bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110 shadow-sm",
  ghost: "hover:bg-[var(--accent-soft)]",
  outline: "border border-[var(--line)] glass hover:bg-[var(--accent-soft)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110",
};

export function buttonClass(variant: keyof typeof variants = "primary", size: "md" | "sm" = "md") {
  return `${base} ${variants[variant]} ${size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-5 text-[15px]"}`;
}

export function Button({ variant = "primary", size = "md", loading, icon, children, className = "", disabled, ...rest }: Props) {
  return (
    <button {...rest} disabled={disabled || loading} className={`${buttonClass(variant, size)} ${className}`}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
