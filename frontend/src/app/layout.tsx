import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PaulFun Blogger",
    template: "%s",
  },
  description: "Paul 的個人部落格 — 技術筆記、生活隨筆、學習心得分享",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://paulfun.net"),
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "PaulFun Blogger",
    title: "PaulFun Blogger",
    description: "Paul 的個人部落格 — 技術筆記、生活隨筆、學習心得分享",
    images: [
      {
        url: "https://img.paulfun.net/static/default-cover.png",
        width: 1200,
        height: 630,
        alt: "PaulFun Blogger",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PaulFun Blogger",
    description: "Paul 的個人部落格 — 技術筆記、生活隨筆、學習心得分享",
    images: ["https://img.paulfun.net/static/default-cover.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
