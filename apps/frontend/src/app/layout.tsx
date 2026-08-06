import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CloudStorage - Enterprise Distributed File System",
  description: "A secure, resilient, and fast distributed file upload system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50/50 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
