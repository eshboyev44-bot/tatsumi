import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tatsumi Chat",
  description: "Realtime chat app with Next.js + Supabase + Vercel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="antialiased">{children}</body>
    </html>
  );
}
