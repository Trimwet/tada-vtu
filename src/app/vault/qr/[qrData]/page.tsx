"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { parsePersonalQRData } from "@/lib/qr-generator";
import Link from "next/link";

export default function QRRedemptionPage() {
  const params = useParams();
  const router = useRouter();
  const [qrData, setQrData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (params.qrData) {
      try {
        const parsedData = parsePersonalQRData(params.qrData as string);
        if (parsedData) {
          setQrData(parsedData);
        } else {
          setError("Invalid or expired QR code");
        }
      } catch (err) {
        setError("Failed to parse QR code");
      }
    }
  }, [params.qrData]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || !qrData) {
      toast.warning("Please enter a phone number");
      return;
    }

    setIsRedeeming(true);
    try {
      const response = await fetch("/api/data-vault/redeem-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrData: params.qrData,
          phoneNumber: phoneNumber,
        }),
      });

      const result = await response.json();

      if (result.status) {
        setIsRedeemed(true);
        toast.payment(
          "Data delivered successfully!",
          `${result.data.planSize} ${result.data.network} data sent to ${result.data.phoneNumber}`
        );
      } else {
        toast.error(result.message || "Failed to redeem QR code");
      }
    } catch (error) {
      console.error("Redemption error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="close-circle" size="32px" color="#ef4444" />
            </div>
            <CardTitle className="text-red-500">Invalid QR Code</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">
                <IonIcon name="home-outline" size="18px" className="mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading QR code...</p>
        </div>
      </div>
    );
  }

  if (isRedeemed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="checkmark-circle" size="32px" color="#22c55e" />
            </div>
            <CardTitle className="text-green-500">Data Delivered!</CardTitle>
            <CardDescription>
              Your {qrData.planSize} {qrData.network} data has been successfully delivered to {phoneNumber}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{qrData.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{qrData.planSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{phoneNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivered</span>
                <span className="font-medium">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            <Link href="/dashboard">
              <Button className="w-full">
                <IonIcon name="home-outline" size="18px" className="mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Redeem Data QR
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <IonIcon name="qr-code" size="32px" color="#22c55e" />
            </div>
            <CardTitle>TADA VTU Data Vault</CardTitle>
            <CardDescription>
              Anyone can scan this QR code and deliver the data to any phone number - no login required!
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* QR Data Info */}
            <div className="bg-muted/50 p-4 rounded-xl space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Data Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">{qrData.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{qrData.planSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-medium text-green-500">₦{qrData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-medium">{new Date(qrData.validUntil).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Phone Number Input */}
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number to Receive Data
                </Label>
                <div className="relative">
                  <IonIcon
                    name="call-outline"
                    size="18px"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone can use this QR code to deliver the {qrData.planSize} {qrData.network} data to any phone number
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white h-12"
                disabled={!phoneNumber || isRedeeming}
              >
                {isRedeeming ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Delivering Data...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IonIcon name="send-outline" size="20px" />
                    Deliver Data Now
                  </div>
                )}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="bg-blue-500/10 border border-blue-200/30 rounded-xl p-3">
              <div className="flex gap-2">
                <IonIcon name="shield-checkmark" size="16px" color="#3b82f6" className="shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-semibold mb-1">Secure & Verified</p>
                  <p>This QR code is cryptographically signed and can only be used once. Your data is safe with TADA VTU.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}