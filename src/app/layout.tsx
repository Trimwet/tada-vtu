import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { NetworkStatusBar } from "@/components/network-status-bar";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ErrorBoundary } from "@/components/error-boundary";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://tadavtu.com'),
  title: {
    default: "TADA VTU - Airtime & Data Services",
    template: "%s | TADA VTU"
  },
  description: "Nigeria's most reliable VTU platform. Buy airtime, data bundles, pay electricity bills, cable TV subscriptions, and more. Instant delivery, secure payments.",
  keywords: "VTU, airtime, data, bill payment, recharge, Nigeria, MTN, Airtel, Glo, 9mobile, electricity, DSTV, GOTV, Startimes",
  authors: [{ name: "TADA VTU" }],
  creator: "TADA VTU",
  publisher: "TADA VTU",
  robots: "index, follow",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/logo-icon.svg",
    other: [
      {
        rel: "icon",
        type: "image/svg+xml",
        url: "/favicon.svg",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://tadavtu.com",
    siteName: "TADA VTU",
    title: "TADA VTU - Airtime & Data Services",
    description: "Nigeria's most reliable VTU platform. Instant airtime, data, and bill payments.",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "TADA VTU - Airtime & Data Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TADA VTU - Airtime & Data Services",
    description: "Nigeria's most reliable VTU platform. Instant airtime, data, and bill payments.",
    images: ["/logo.svg"],
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "Finance",
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
      <head>
        {/* Critical CSS for preventing FOUC */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html { background-color: #000; }
            body { 
              background-color: #000; 
              color: #fff; 
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 0;
            }
            .min-h-screen { min-height: 100vh; }
            .bg-black { background-color: #000; }
            .text-white { color: #fff; }
            .hidden { display: none; }
            @media (min-width: 1024px) { 
              .lg\\:flex { display: flex; }
              .lg\\:pl-64 { padding-left: 16rem; }
            }
          `
        }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <ServiceWorkerRegister />
            <NetworkStatusBar />
            {children}
          </AuthProvider>
        </ErrorBoundary>
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
