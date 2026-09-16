import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/**
 * Inter is loaded as a variable font and exposed as a CSS variable so the
 * Tailwind `--font-sans` token resolves to it, with the system stack behind it
 * as a fallback while the font loads.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Code Nativex Lead Generation System",
    template: "%s | Code Nativex",
  },
  description:
    "Find qualified business leads with the Opportunity Hunter Agent and automate verified, approved outreach.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body cz-shortcut-listen="true">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <TooltipProvider delayDuration={200}>
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-[var(--app-primary)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
                >
                  Skip to main content
                </a>
                {children}
                <Toaster
                  position="bottom-right"
                  toastOptions={{ className: "text-sm" }}
                  closeButton
                />
              </TooltipProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
