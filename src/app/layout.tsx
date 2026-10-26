import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ServiceWorker } from "@/components/layout/ServiceWorker";
import { ThemeProvider, themeScript } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: { default: "NPS - NAPSS Payment Suite", template: "%s | NPS" },
  description: "Student enrollment, payments and ID services for NAPSS, UNIZIK.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NPS", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#eef3ee" }, { media: "(prefers-color-scheme: dark)", color: "#0c1511" }], width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-4 pt-6">{children}</main>
            <Footer />
            <ServiceWorker />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
