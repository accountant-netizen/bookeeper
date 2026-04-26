import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Merriweather } from "next/font/google";

// Disable static generation to avoid styled-jsx prerendering issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather"
});

export const metadata: Metadata = {
  title: "Accountant Platform",
  description: "Accounting and bookkeeping management system"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${merriweather.variable} scroll-smooth`}>
      <body>{children}</body>
    </html>
  );
}
