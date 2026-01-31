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

export default function ScanQRPage() {
  const router = useRouter();
  const [qrUrl, setQrUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScanQR = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!qrUrl) {
      toast.warning("Please enter a QR code URL");
      return;
    }

    setIsProcessing(true);
    try {
      // Extract QR data from URL
      let qrData = "";
      
      if (qrUrl.includes("/vault/qr/")) {
        // Extract base64 data from URL
        const urlParts = qrUrl.split("/vault/qr/");
        if (urlParts.length > 1) {
          qrData = urlParts[1];
        }
      } else if (qrUrl.startsWith("data:")) {
        // Handle data URL (if user pastes QR image data)
        toast.error("Please scan the QR code or paste the URL, not the image data");
        return;
      } else {
        toast.error("Invalid QR code URL format");
        return;
      }

      if (qrData) {
        // Redirect to QR redemption page
        router.push(`/vault/qr/${qrData}`);
      } else {
        toast.error("Could not extract QR data from URL");
      }
    } catch (error) {
      console.error("QR scan error:", error);
      toast.error("Failed to process QR code");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraAccess = () => {
    // For now, show instructions for manual scanning
    toast.info("Use your phone's camera app to scan QR codes, then paste the URL here");
  };

  return (
    <div className="min-h-screen bg-background">
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
            Scan QR Code
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="qr-code-outline" size="32px" color="#22c55e" />
            </div>
            <CardTitle>Scan Data Vault QR</CardTitle>
            <CardDescription>
              Scan or paste a TADA VTU Data Vault QR code to redeem your parked data
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Camera Scanner (Future Enhancement) */}
            <div className="bg-muted/50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <IonIcon name="camera-outline" size="24px" color="#22c55e" />
              </div>
              <h3 className="font-semibold mb-2">Camera Scanner</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use your phone's camera to scan QR codes
              </p>
              <Button
                variant="outline"
                onClick={handleCameraAccess}
                className="gap-2"
              >
                <IonIcon name="camera-outline" size="16px" />
                Open Camera
              </Button>
            </div>

            {/* Manual URL Input */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-px bg-border"></div>
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border"></div>
                </div>
              </div>

              <form onSubmit={handleScanQR} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qrUrl" className="text-sm font-medium">
                    Paste QR Code URL
                  </Label>
                  <div className="relative">
                    <IonIcon
                      name="link-outline"
                      size="18px"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="qrUrl"
                      type="url"
                      placeholder="https://tadavtu.com/vault/qr/..."
                      value={qrUrl}
                      onChange={(e) => setQrUrl(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scan the QR code with your camera app, then paste the URL here
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white h-12"
                  disabled={!qrUrl || isProcessing}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <IonIcon name="scan-outline" size="20px" />
                      Process QR Code
                    </div>
                  )}
                </Button>
              </form>
            </div>

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-200/30 rounded-xl p-4">
              <div className="flex gap-3">
                <IonIcon name="information-circle" size="18px" color="#3b82f6" className="shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-2">How to scan QR codes:</p>
                  <ol className="space-y-1 text-xs">
                    <li>1. Open your phone's camera app</li>
                    <li>2. Point it at the QR code</li>
                    <li>3. Tap the notification that appears</li>
                    <li>4. Copy the URL and paste it above</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Quick Access */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Don't have a QR code?
              </p>
              <Link href="/dashboard/data-vault">
                <Button variant="outline" className="gap-2">
                  <IonIcon name="archive-outline" size="16px" />
                  View Your Data Vault
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}