import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/PwaRegister";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tatsumi Suhbat",
  description: "Next.js, Supabase va Vercel asosidagi real vaqtli suhbat ilovasi",
  manifest: "/manifest.webmanifest",
  applicationName: "Tatsumi Suhbat",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    title: "Tatsumi Suhbat",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6eefb" },
    { media: "(prefers-color-scheme: dark)", color: "#070d17" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="antialiased">
        <PwaRegister />
        <PwaInstallPrompt />
        {children}
      </body>
    </html>
  );
}
