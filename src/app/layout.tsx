import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { NetworkStatusBar } from "@/components/network-status-bar";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TADA VTU - Airtime & Data Services",
  description: "Reliable VTU services for airtime, data, and bill payments",
  keywords: "VTU, airtime, data, bill payment, recharge",
  icons: {
    icon: "/logo-icon.svg",
    shortcut: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head />
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <ServiceWorkerRegister />
          <NetworkStatusBar />
          {children}
        </AuthProvider>
        <Toaster position="top-center" richColors theme="dark" />
        <Script
          src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"
          type="module"
          strategy="lazyOnload"
        />
        <Script
          src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"
          noModule
          strategy="lazyOnload"
        />
        <Analytics />
      </body>
    </html>
  );
}
