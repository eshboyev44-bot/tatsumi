import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tatsumi Suhbat",
  description: "Next.js, Supabase va Vercel asosidagi real vaqtli suhbat ilovasi",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
