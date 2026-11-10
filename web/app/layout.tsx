import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offer Incrementality Lab",
  description: "A/B test analysis on 64,000-customer randomised email experiment",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
