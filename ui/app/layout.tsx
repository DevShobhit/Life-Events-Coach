import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveCoach",
  description: "A calm, practical guide for your next life transition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="apple-mobile-web-app-title" content="Live Coach" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
