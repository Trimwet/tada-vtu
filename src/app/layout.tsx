import type { Metadata, Viewport } from "next";
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
  description: "Reliable VTU services for airtime, data, and bill payments in Nigeria. Buy airtime, data bundles, pay electricity bills, and more.",
  keywords: "VTU, airtime, data, bill payment, recharge, Nigeria, MTN, Airtel, Glo, 9mobile",
  authors: [{ name: "TADA VTU" }],
  creator: "TADA VTU",
  publisher: "TADA VTU",
  robots: "index, follow",
  icons: {
    icon: "/logo-icon.svg",
    shortcut: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://tadavtu.com",
    siteName: "TADA VTU",
    title: "TADA VTU - Airtime & Data Services",
    description: "Reliable VTU services for airtime, data, and bill payments in Nigeria.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TADA VTU - Airtime & Data Services",
    description: "Reliable VTU services for airtime, data, and bill payments in Nigeria.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#22c55e",
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
        <Toaster 
          position="top-center" 
          theme="dark"
          toastOptions={{
            style: {
              background: '#1f2937',
              border: '1px solid #374151',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
            },
            className: 'toast-animation',
          }}
          expand={false}
          richColors
          closeButton
        />
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
