"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";
import "./globals.css";
import { AuthProvider } from "@/hooks/AuthContext";
import PubSubInitializer from "@/config/PubSubInitializer";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Configure Amplify with SSR support for cookie-based authentication
    Amplify.configure(outputs, {
      ssr: true,
    });
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PubSubInitializer />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
