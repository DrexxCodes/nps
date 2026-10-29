import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { SsoBridge } from "@/components/auth/SsoBridge";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ServiceWorker } from "@/components/layout/ServiceWorker";
import { pwaScript } from "@/components/layout/PwaEntry";
import { ThemeProvider, themeScript } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getSessionUser } from "@/lib/server/session";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: { default: "NPS - NAPSS Payment Suite", template: "%s | NPS" },
  description: "Buy NAPSS items and pay securely from your phone. NAPSS, UNIZIK.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NPS", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#eef3ee" }, { media: "(prefers-color-scheme: dark)", color: "#0c1511" }], width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null); // memoized per request: the Navbar's own lookup is the same call
  const nonce = (await headers()).get("x-nonce") ?? undefined; // set by proxy.ts; the CSP only runs inline scripts that carry it
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} /><script nonce={nonce} dangerouslySetInnerHTML={{ __html: pwaScript }} /></head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-4 pt-6">{children}</main>
            <Footer />
            <ServiceWorker />
            <SsoBridge signedIn={!!user} />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
