"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import { ButtonLoading } from "@/components/loading-icons";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

function LinkWhatsAppContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading, refreshUser } = useSupabaseUser();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkedNumber, setLinkedNumber] = useState<string | null>(null);

  const initialCode = useMemo(() => searchParams.get("code")?.trim() || "", [searchParams]);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = async () => {
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      toast.error("Enter the 6-digit code from WhatsApp");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/whatsapp/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.status) {
        throw new Error(result.message || "Failed to link WhatsApp");
      }

      setLinkedNumber(result.data?.whatsappNumber ?? null);
      await refreshUser();
      toast.success("WhatsApp linked successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <>
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/profile"
                className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
              >
                <IonIcon name="arrow-back-outline" size="20px" />
              </Link>
              <h1 className="text-lg font-semibold text-foreground">Link WhatsApp</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Link your WhatsApp number</CardTitle>
            <CardDescription>
              Enter the 6-digit code you received on WhatsApp to connect this number to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!user ? (
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  You need to sign in first before linking WhatsApp to your profile.
                </p>
                <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-code" className="text-sm text-muted-foreground">
                    Verification code
                  </Label>
                  <Input
                    id="whatsapp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="296020"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
                    className="h-12 text-base tracking-[0.3em] text-center font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    The code expires after 10 minutes.
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700 h-12"
                >
                  {isSubmitting ? (
                    <ButtonLoading type="sending" text="Linking..." />
                  ) : (
                    "Link WhatsApp"
                  )}
                </Button>

                {linkedNumber && (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                    <p className="text-sm text-green-600 font-medium">WhatsApp linked successfully</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Linked number: {linkedNumber}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <IonIcon name="chatbubble-ellipses-outline" size="20px" color="#16a34a" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Where to find the code</h2>
                <p className="text-sm text-muted-foreground">
                  Check the WhatsApp message from TADAPAY and paste the 6-digit code here.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => router.back()}>
                Back
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/dashboard/profile">Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
    </>
  );
}

export default function LinkWhatsAppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LinkWhatsAppContent />
    </Suspense>
  );
}
