import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOMEWARD | ふたりの帰る場所",
  description: "帰宅連絡、チャット、家族の共有カレンダー。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {capable:true,title:"HOMEWARD",statusBarStyle:"black-translucent"},
  icons: {
    apple: "/icon-192.png",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
