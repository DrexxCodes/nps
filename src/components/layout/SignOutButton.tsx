"use client";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/client/firebase";
import { api } from "@/lib/client/api";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] ${className}`}
      onClick={async () => { await api("/api/auth/session", { method: "DELETE" }); await signOut(auth).catch(() => undefined); window.location.href = "/"; }}
    >
      <LogOut className="size-4" /> Sign out
    </button>
  );
}
