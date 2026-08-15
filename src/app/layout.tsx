import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Market Pulse | 全球市场行情",
  description: "伦敦金、布伦特原油、纳斯达克100与标普500实时行情",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
