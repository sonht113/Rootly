import type { Metadata } from "next";
import { AppProvider } from "@/components/providers/app-provider";

import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rootly",
    template: "%s | Rootly",
  },
  description:
    "Nền tảng học từ vựng qua từ gốc dành cho học cá nhân và lớp nhỏ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full bg-(--app-bg) antialiased">
      <body className="min-h-full bg-(--app-bg) font-sans text-foreground">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
