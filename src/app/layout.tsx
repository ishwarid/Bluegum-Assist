import type { Metadata } from "next";
import Link from "next/link";
import { BluegumMark } from "@/components/brand";
import { ChatWidget } from "@/components/chat/chat-widget";
import { isDemoMode } from "@/lib/assistant/model";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Help centre | Bluegum Bank", template: "%s | Bluegum Bank" },
  description:
    "Help centre and AI support assistant for Bluegum Bank, a fictional bank built as a demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="min-h-dvh">
        <a
          href="#main"
          className="focus:bg-surface sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <header className="border-line bg-surface border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold">
              <BluegumMark />
              Bluegum
              <span className="text-ink-muted font-normal">Help</span>
            </Link>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-5xl px-4 pt-10 pb-32 sm:px-6 sm:pt-14">
          {children}
        </main>

        <footer className="border-line text-ink-muted border-t">
          <p className="mx-auto max-w-5xl px-4 py-6 text-sm sm:px-6">
            Bluegum Bank is fictional. This is a portfolio demo, not a real bank, and nothing here
            is financial advice.
          </p>
        </footer>

        <ChatWidget demoMode={isDemoMode()} />
      </body>
    </html>
  );
}
