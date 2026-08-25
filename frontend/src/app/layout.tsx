import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServerWarmup } from "@/components/ServerWarmup";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Viruj Chematrix - Project Management",
  description: "Project management system for Viruj Chematrix",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServerWarmup />
      </body>
    </html>
  );
}
