"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const NEXT = { light: "dark", dark: "system", system: "light" } as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <button onClick={() => setTheme(NEXT[theme])} aria-label={`Theme: ${theme}. Switch theme`} title={`Theme: ${theme}`} className="grid size-10 place-items-center rounded-xl hover:bg-[var(--accent-soft)]">
      <Icon className="size-5" />
    </button>
  );
}
