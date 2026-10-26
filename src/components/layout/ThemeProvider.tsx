"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "system", setTheme: () => undefined });
export const useTheme = () => useContext(Ctx);

const apply = (t: Theme) => document.documentElement.classList.toggle("dark", t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches));

/** The matching inline script in <head> sets the class before paint, so there is no flash or hydration mismatch. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  useEffect(() => {
    const saved = (localStorage.getItem("nps-theme") as Theme | null) ?? "system";
    setThemeState(saved);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => (localStorage.getItem("nps-theme") ?? "system") === "system" && apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const setTheme = useCallback((t: Theme) => { localStorage.setItem("nps-theme", t); setThemeState(t); apply(t); }, []);
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const themeScript = `try{var t=localStorage.getItem("nps-theme")||"system";if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
