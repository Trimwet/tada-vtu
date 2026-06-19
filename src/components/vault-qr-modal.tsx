"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "@/lib/toast";
import { ButtonLoading } from "@/components/loading-icons";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

interface VaultQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: {
    id: string;
    network: string;
    plan_name: string;
    amount: number;
    phone_number: string;
  };
}

export function VaultQRModal({ isOpen, onClose, vault }: VaultQRModalProps) {
  const { user } = useSupabaseUser();
  const [qrCode, setQrCode] = useState<string>("");
  const [qrId, setQrId] = useState<string>("");
  const [finalQrCode, setFinalQrCode] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [lockedPhone, setLockedPhone] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [showLockInput, setShowLockInput] = useState(false);

  const shareUrl =
    typeof window !== "undefined" && qrId
      ? `${window.location.origin}/v/${qrId}`
      : "";

  // Use plain QR code as branding overlay is removed
  useEffect(() => {
    if (qrCode) {
      setFinalQrCode(qrCode);
    }
  }, [qrCode]);

  const fetchExistingQR = async () => {
    if (!user?.id) return;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/data-vault/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultId: vault.id, userId: user.id }),
      });
      const result = await response.json();
      if (result.status) {
        setQrCode(result.data.qrCode);
        setQrId(result.data.qrId);
        setExpiresAt(result.data.expiresAt);
        setGiftMessage(result.data.giftMessage || "");
        setLockedPhone(result.data.lockedToPhone || "");
        setIsGenerated(true);
      } else {
        setIsGenerated(false);
      }
    } catch {
      setIsGenerated(false);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchExistingQR();
  }, [vault.id, isOpen]);

  const generateQR = async (forceRegenerate = false) => {
    if (!user?.id) return toast.error("Please log in");
    setIsGenerating(true);
    try {
      const response = await fetch("/api/data-vault/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId: vault.id,
          userId: user.id,
          forceRegenerate,
          lockedToPhone: lockedPhone || undefined,
          giftMessage: giftMessage || undefined,
        }),
      });
      const result = await response.json();
      if (result.status) {
        setQrCode(result.data.qrCode);
        setQrId(result.data.qrId);
        setExpiresAt(result.data.expiresAt);
        setIsGenerated(true);
        toast.success(forceRegenerate ? "New QR code generated!" : "QR code ready!");
      } else {
        toast.error(result.message || "Failed to generate QR code");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const extendExpiry = async (extraDays: 7 | 30) => {
    if (!user?.id || !qrId) return;
    setIsExtending(true);
    try {
      const res = await fetch("/api/data-vault/extend-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrId, vaultId: vault.id, userId: user.id, extraDays }),
      });
      const result = await res.json();
      if (result.status) {
        setExpiresAt(result.data.newExpiry);
        toast.success(`QR extended by ${extraDays} days`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to extend QR");
    } finally {
      setIsExtending(false);
    }
  };

  const downloadQR = () => {
    if (!qrCode) return;
    const link = document.createElement("a");
    link.download = `TADA-${vault.network}-${vault.plan_name}-QR.png`;
    link.href = qrCode;
    link.click();
  };

  const shareWhatsApp = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent(
      `Here's ${vault.plan_name} ${vault.network} data for you \uD83C\uDF81\nTap to claim instantly — no login needed:\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareNative = async () => {
    if (!qrCode) return;
    try {
      const blob = await (await fetch(qrCode)).blob();
      const file = new File([blob], `TADA-${vault.network}-${vault.plan_name}-QR.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${vault.plan_name} ${vault.network} Data`,
          text: `Scan to claim ${vault.plan_name} ${vault.network} data`,
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      }
    } catch {
      toast.error("Failed to share");
    }
  };

  const downloadPDF = async () => {
    const displayQr = finalQrCode || qrCode;
    if (!displayQr || !shareUrl) return;
    
    try {
      const jsPDF = (await import("jspdf")).default;

      // Pre-load logo
      const logoImg = new Image();
      logoImg.src = "/apple-touch-icon.png";
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });

      // Increased height to prevent overflow
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [100, 240] });
      const pageWidth = 100;
      const pageHeight = 240;

      // 1. SERRATED EDGES
      doc.setFillColor(240, 240, 240);
      for (let i = 0; i < pageWidth; i += 4) {
        doc.triangle(i, 0, i + 2, 3, i + 4, 0, "F");
        doc.triangle(i, pageHeight, i + 2, pageHeight - 3, i + 4, pageHeight, "F");
      }

      // 2. WATERMARK BACKGROUND
      doc.setTextColor(252, 252, 252);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      for (let y = 20; y < pageHeight; y += 35) {
        for (let x = -10; x < pageWidth; x += 45) {
          doc.text("TADA", x, y, { angle: 30 });
        }
      }

      // 3. TOP BAR BRANDING
      doc.setFillColor(248, 249, 250);
      doc.rect(0, 0, pageWidth, 15, "F");
      doc.setTextColor(22, 163, 74);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TADA VTU", 10, 10); // Brand Name
      
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.text("RECEIPT", pageWidth - 10, 10, { align: "right" });

      // 4. HERO SECTION
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        doc.addImage(logoImg, "PNG", pageWidth / 2 - 8, 20, 16, 16);
      }
      
      doc.setTextColor(22, 163, 74);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      
      // Draw Naira Symbol Manually (jsPDF Helvetica doesn't support ₦)
      const amountX = pageWidth / 2;
      const amountY = 45;
      const amountStr = `${vault.amount.toLocaleString()}.00`;
      
      // Calculate position
      const nWidth = doc.getTextWidth("N");
      const totalWidth = nWidth + doc.getTextWidth(amountStr) + 2;
      const startX = (pageWidth - totalWidth) / 2;
      
      // Draw N
      doc.text("N", startX, amountY);
      
      // Draw Slashes (Better placement and thickness)
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.7); // Thicker lines
      const slashY1 = amountY - 4.8;
      const slashY2 = amountY - 3.2;
      doc.line(startX - 0.5, slashY1, startX + nWidth + 0.5, slashY1);
      doc.line(startX - 0.5, slashY2, startX + nWidth + 0.5, slashY2);
      
      // Draw Amount
      doc.text(amountStr, startX + nWidth + 2, amountY);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text("Transaction Successful", pageWidth / 2, 55, { align: "center" });
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const timestamp = new Date().toLocaleString("en-NG", { 
        month: "short", day: "numeric", year: "numeric", 
        hour: "2-digit", minute: "2-digit", second: "2-digit" 
      });
      doc.text(timestamp, pageWidth / 2, 62, { align: "center" });

      doc.setDrawColor(240, 240, 240);
      doc.line(10, 70, pageWidth - 10, 70);

      // 5. DETAIL GROUPS
      const drawSectionLabel = (label: string, y: number) => {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(160, 160, 160);
        doc.text(label.toUpperCase(), 10, y);
      };

      const drawRow = (label: string, value: string, y: number) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        doc.text(label, 10, y);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const splitValue = doc.splitTextToSize(value, 50);
        doc.text(splitValue, pageWidth - 10, y, { align: "right" });
        return y + (splitValue.length > 1 ? 8 : 6);
      };

      let yPos = 80;
      drawSectionLabel("Recipient Details", yPos);
      yPos += 8;
      yPos = drawRow("Recipient Phone", lockedPhone || "Any Recipient", yPos);
      yPos = drawRow("Network Provider", vault.network.toUpperCase(), yPos);
      yPos = drawRow("Data Plan", vault.plan_name, yPos);

      yPos += 5;
      doc.line(10, yPos, pageWidth - 10, yPos);
      yPos += 8;

      drawSectionLabel("Transaction Details", yPos);
      yPos += 8;
      yPos = drawRow("Status", "Successful", yPos);
      yPos = drawRow("Transaction ID", qrId.toUpperCase(), yPos);
      yPos = drawRow("Service", "TADA DATA VAULT", yPos);

      yPos += 10;
      
      // 6. QR ACCESS (Moved up slightly to prevent overflow)
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(pageWidth / 2 - 25, yPos, 50, 50, 3, 3, "F");
      doc.addImage(displayQr, "PNG", pageWidth / 2 - 22, yPos + 3, 44, 44);
      yPos += 58;

      // 7. SUPPORT FOOTER
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Enjoy a better digital life with TADA VTU.", pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
      doc.setTextColor(22, 163, 74);
      doc.setFont("helvetica", "bold");
      doc.text("www.tadavtu.com", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text("Need help? Contact support@tadavtu.com", pageWidth / 2, yPos, { align: "center" });

      // Digital Seal
      const securityHash = btoa(qrId).slice(0, 24);
      doc.setFontSize(6);
      doc.setFont("courier", "normal");
      doc.setTextColor(200, 200, 200);
      doc.text(`VAULT-SEAL: ${securityHash}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      doc.save(`TADA-RECEIPT-${qrId.slice(-8)}.pdf`);
      toast.success("Branded receipt generated!");
    } catch (err) {
      console.error("PDF Error:", err);
      toast.error("Failed to generate receipt");
    }
  };

  const daysUntilExpiry = expiresAt
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const expiryColor =
    daysUntilExpiry === null ? "" :
    daysUntilExpiry <= 1 ? "text-red-500" :
    daysUntilExpiry <= 3 ? "text-amber-500" :
    "text-muted-foreground";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <IonIcon name="qr-code" size="18px" color="#22c55e" />
            </div>
            Data Vault QR Code
          </DialogTitle>
          <DialogDescription>
            Generate a QR code for your parked data. Anyone can scan it to claim the data instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vault Info */}
          <div className="bg-muted/50 p-4 rounded-xl">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{vault.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{vault.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-green-500">₦{vault.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parked For</span>
                <span className="font-medium">{vault.phone_number}</span>
              </div>
            </div>
          </div>

          {/* States */}
          {isGenerating ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading QR code...</p>
            </div>
          ) : !isGenerated ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <IonIcon name="qr-code-outline" size="32px" color="#22c55e" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Generate Your QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Create a secure QR code anyone can scan to claim this data
                </p>
              </div>

              {/* Optional phone lock */}
              <div className="text-left space-y-2">
                <button
                  type="button"
                  onClick={() => setShowLockInput(!showLockInput)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <IonIcon name={showLockInput ? "lock-closed" : "lock-open-outline"} size="14px" />
                  {showLockInput ? "Remove phone lock" : "Lock to a specific phone number (optional)"}
                </button>
                {showLockInput && (
                  <Input
                    placeholder="08012345678 — only this number can redeem"
                    value={lockedPhone}
                    onChange={(e) => setLockedPhone(e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>

              {/* Gift Message */}
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Personal Message</Label>
                <Input
                  placeholder="e.g. Happy Birthday! 🎂"
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  className="text-sm h-9"
                />
              </div>

              <Button
                onClick={() => generateQR()}
                disabled={isGenerating}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                <IonIcon name="qr-code" size="18px" className="mr-2" />
                Generate QR Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">

                {/* QR Image */}
              <div className="bg-white p-4 rounded-xl border-2 border-green-200 text-center">
                {finalQrCode || qrCode ? (
                  <img
                    src={finalQrCode || qrCode}
                    alt="Data Vault QR Code"
                    className="mx-auto mb-3 rounded-lg"
                    style={{ maxWidth: "220px", width: "100%" }}
                  />
                ) : (
                  <div className="py-8 text-gray-400">
                    <IonIcon name="qr-code-outline" size="48px" className="mx-auto mb-2" />
                    <p className="text-sm">QR code not available</p>
                  </div>
                )}
                <p className="text-xs font-semibold text-gray-900 mb-0.5">
                  {vault.plan_name} {vault.network} Data
                </p>
                <p className="text-xs text-gray-500">QR ID: ...{qrId.slice(-8)}</p>
                {expiresAt && (
                  <p className={`text-xs mt-0.5 font-medium ${expiryColor}`}>
                    {daysUntilExpiry !== null && daysUntilExpiry <= 3
                      ? `⚠ Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`
                      : `Expires ${new Date(expiresAt).toLocaleDateString("en-NG")}`}
                  </p>
                )}
              </div>

              {/* Primary actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={downloadQR} className="gap-2 text-sm">
                  <IonIcon name="download-outline" size="15px" />
                  Download
                </Button>
                <Button variant="outline" onClick={shareNative} className="gap-2 text-sm">
                  <IonIcon name="share-outline" size="15px" />
                  Share
                </Button>
              </div>

              {/* WhatsApp share */}
              <Button
                onClick={shareWhatsApp}
                className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
              >
                <IonIcon name="logo-whatsapp" size="18px" />
                Share on WhatsApp
              </Button>

              {/* Shareable link */}
              <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Share via link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs bg-background border rounded-lg px-3 py-2 text-muted-foreground truncate"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      toast.success("Link copied!");
                    }}
                    className="shrink-0"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {/* Extend expiry */}
              {daysUntilExpiry !== null && daysUntilExpiry <= 5 && (
                <div className="bg-amber-500/10 border border-amber-200/40 rounded-xl p-3">
                  <p className="text-xs font-medium text-amber-700 mb-2">
                    ⚠ QR expires soon — extend it?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => extendExpiry(7)}
                      disabled={isExtending}
                      className="flex-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      {isExtending ? <ButtonLoading /> : "+7 days"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => extendExpiry(30)}
                      disabled={isExtending}
                      className="flex-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      {isExtending ? <ButtonLoading /> : "+30 days"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={downloadPDF}
                  className="gap-2 text-xs"
                >
                  <IonIcon name="document-outline" size="14px" />
                  Receipt (PDF)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateQR(true)}
                  disabled={isGenerating}
                  className="gap-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                >
                  {isGenerating ? (
                    <ButtonLoading />
                  ) : (
                    <>
                      <IonIcon name="refresh-outline" size="14px" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>

              {/* How to use */}
              <div className="bg-blue-500/10 border border-blue-200/30 rounded-xl p-3">
                <div className="flex gap-2">
                  <IonIcon name="information-circle" size="16px" color="#3b82f6" className="shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 space-y-0.5">
                    <p className="font-semibold">2 ways to use:</p>
                    <p>📷 Scan QR → Enter phone → Get data</p>
                    <p>🔗 Copy link → Send → They open → Enter phone → Get data</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
