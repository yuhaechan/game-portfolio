import type { Metadata } from "next";
import "./globals.css";
import { published } from "@/lib/published";

export const metadata: Metadata = {
  title: published.title,
  description: published.introduction,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
