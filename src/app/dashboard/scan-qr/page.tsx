"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRScannerUI } from "@/components/qr-scanner-ui";

export default function ScanQRPage() {
  const router = useRouter();
  const [qrUrl, setQrUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const processQRData = (url: string) => {
    // Extract QR data from URL
    let qrData = "";

    if (url.includes("/vault/qr/")) {
      const urlParts = url.split("/vault/qr/");
      if (urlParts.length > 1) {
        qrData = urlParts[1];
      }
    } else {
      // Maybe it's just the base64 data directly from a raw scan
      // We check if it looks like base64
      if (url.length > 20 && !url.includes(" ")) {
        qrData = url;
      }
    }

    if (qrData) {
      router.push(`/vault/qr/${qrData}`);
    } else {
      toast.error("Invalid QR code format. Please scan a TADA VTU QR code.");
    }
  };

  const handleScanQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrUrl) return;
    setIsProcessing(true);
    processQRData(qrUrl);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {showScanner && (
        <QRScannerUI
          onScan={(data) => {
            setShowScanner(false);
            processQRData(data);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center h-14 px-4">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 hover:bg-muted active:bg-muted/80 rounded-lg transition-smooth"
          >
            <IonIcon name="arrow-back-outline" size="20px" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground ml-2">
            Redeem QR Code
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          {/* Main Scanner Trigger */}
          <div
            onClick={() => setShowScanner(true)}
            className="aspect-[4/3] bg-muted/30 rounded-[32px] border-2 border-dashed border-border flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/50 transition-all group"
          >
            <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <IonIcon name="qr-code" size="40px" color="#22c55e" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">Open Camera Scanner</h2>
              <p className="text-sm text-muted-foreground px-8">Point your camera at a TADA VTU QR code to claim data</p>
            </div>
            <Button className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8 h-12 shadow-lg shadow-green-500/20">
              Start Scanning
            </Button>
          </div>

          <Card className="border-none bg-muted/20">
            <CardContent className="pt-6 space-y-6">
              {/* Manual URL Input */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border"></div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manual Entry</span>
                  <div className="flex-1 h-px bg-border"></div>
                </div>

                <form onSubmit={handleScanQR} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="qrUrl" className="text-xs font-semibold text-muted-foreground ml-1">
                      Paste QR Code URL
                    </Label>
                    <div className="relative">
                      <IonIcon
                        name="link-outline"
                        size="18px"
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="qrUrl"
                        type="text"
                        placeholder="Paste link here..."
                        value={qrUrl}
                        onChange={(e) => setQrUrl(e.target.value)}
                        className="pl-11 h-12 rounded-xl bg-card border-border focus:ring-green-500/20"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 rounded-xl font-semibold"
                    disabled={!qrUrl || isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Process Link"}
                  </Button>
                </form>
              </div>

              {/* Instructions */}
              <div className="flex gap-3 bg-blue-500/5 border border-blue-200/20 rounded-2xl p-4">
                <IonIcon name="information-circle" size="18px" color="#3b82f6" className="shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700/80 leading-relaxed">
                  <p className="font-bold text-blue-700 mb-1">Quick Guide:</p>
                  <p>1. Open scanner & point at code</p>
                  <p>2. Or paste the claim link from WhatsApp/SMS</p>
                  <p>3. Enter your phone number on the next screen</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Link */}
          <div className="text-center pb-4">
            <Link href="/dashboard/data-vault">
              <button className="text-sm font-medium text-muted-foreground hover:text-green-500 transition-colors flex items-center justify-center gap-2 mx-auto">
                <IonIcon name="archive-outline" size="16px" />
                View your parked data
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
