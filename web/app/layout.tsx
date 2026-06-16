import "./globals.css";
import type { Metadata } from "next";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import CursorBlob from "@/components/CursorBlob";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Astram — Predictive Traffic Operations",
  description:
    "Forecast event-driven congestion in real time. Recommend manpower, barricading, and diversion plans before the gridlock starts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-accent-500 selection:text-ink-950">
        <SmoothScrollProvider>
          <CursorBlob />
          <SiteHeader />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
