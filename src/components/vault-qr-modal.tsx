"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  const [qrDataBase64, setQrDataBase64] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

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

      console.log('QR API Response:', result);

      if (result.status) {
        console.log('QR API Response:', result);
        setQrCode(result.data.qrCode);
        setQrId(result.data.qrId);
        setExpiresAt(result.data.expiresAt);
        
        // Extract base64 data from QR data for shareable link
        if (result.data.qrData) {
          try {
            // Use base64url encoding (URL-safe) to avoid '/' breaking routing
            const jsonString = JSON.stringify(result.data.qrData);
            const base64Data = btoa(jsonString)
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');
            console.log('[QR-MODAL] Encoded base64url data:', base64Data.substring(0, 50) + '...');
            setQrDataBase64(base64Data);
          } catch (error) {
            console.error('[QR-MODAL] Failed to encode QR data:', error);
          }
        } else {
          console.warn('[QR-MODAL] No qrData in API response');
        }
        
        setIsGenerated(true);
      } else {
        // No existing QR code - show generate screen
        console.log('No QR code found, showing generate screen');
        setQrCode("");
        setQrId("");
        setExpiresAt("");
        setIsGenerated(false);
      }
    } catch (error) {
      console.error("Error fetching QR:", error);
      setQrCode("");
      setQrId("");
      setExpiresAt("");
      setIsGenerated(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch QR code when a different vault is selected
  useEffect(() => {
    if (!isOpen) return;
    // Fetch QR code when modal opens
    fetchExistingQR();
  }, [vault.id]);

  const generateQR = async () => {
    if (!user?.id) {
      toast.error('Please log in to generate QR code');
      return;
    }
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
        
        // Extract base64 data from QR data for shareable link
        if (result.data.qrData) {
          try {
            // Use btoa for browser-compatible base64 encoding
            const jsonString = JSON.stringify(result.data.qrData);
            const base64Data = btoa(jsonString);
            console.log('[QR-MODAL] Generated - Encoded base64 data:', base64Data.substring(0, 50) + '...');
            setQrDataBase64(base64Data);
          } catch (error) {
            console.error('[QR-MODAL] Failed to encode QR data:', error);
          }
        } else {
          console.warn('[QR-MODAL] No qrData in generate API response');
        }
        
        setIsGenerated(true);
        if (result.data.isExisting) {
          toast.info("Found existing QR code!");
        } else {
          toast.success("QR code generated successfully!");
        }
      } else {
        toast.error(result.message || "Failed to generate QR code");
      }
    } catch (error) {
      console.error("QR generation error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrCode) return;

    const link = document.createElement("a");
    link.download = `TADA-VTU-${vault.network}-${vault.plan_name}-QR.png`;
    link.href = qrCode;
    link.click();
  };

  const shareQR = async () => {
    if (!qrCode) return;

    try {
      // Convert data URL to blob
      const response = await fetch(qrCode);
      const blob = await response.blob();
      const file = new File([blob], `TADA-VTU-${vault.network}-${vault.plan_name}-QR.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `TADA VTU - ${vault.plan_name} ${vault.network} Data`,
          text: `Scan this QR code to redeem ${vault.plan_name} ${vault.network} data`,
          files: [file],
        });
      } else {
        // Fallback: copy QR URL to clipboard
        await navigator.clipboard.writeText(qrCode);
        toast.success("QR code copied to clipboard!");
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to share QR code");
    }
  };

  const handleClose = () => {
    // Don't clear QR code data when closing - user can view it again without regenerating
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <IonIcon name="qr-code" size="18px" color="#22c55e" />
            </div>
            Personal Data QR Code
          </DialogTitle>
          <DialogDescription>
            Generate a QR code for your parked data. Scan it later to instantly deliver the data to any phone number.
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

          {/* QR Code - Loading, Generated, or Generate */}
          {isGenerating ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-sm text-muted-foreground">Loading your QR code...</p>
            </div>
          ) : !isGenerated ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="qr-code-outline" size="32px" color="#22c55e" />
              </div>
              <h3 className="font-semibold mb-2">Generate Your Personal QR Code</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a secure QR code that you can scan later to deliver this data instantly
              </p>
              <Button
                onClick={generateQR}
                disabled={isGenerating}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {isGenerating ? (
                  <ButtonLoading type="loading" text="Generating..." />
                ) : (
                  <div className="flex items-center gap-2">
                    <IonIcon name="qr-code" size="18px" />
                    Generate QR Code
                  </div>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="bg-white p-4 rounded-xl border-2 border-green-200 text-center">
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="Data Vault QR Code"
                    className="mx-auto mb-3 rounded-lg"
                    style={{ maxWidth: "250px", width: "100%" }}
                    onError={(e) => {
                      console.error('QR Image load error:', e);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="py-8 text-gray-400">
                    <IonIcon name="qr-code-outline" size="48px" className="mx-auto mb-2" />
                    <p className="text-sm">QR code not available</p>
                  </div>
                )}
                <div className="text-xs text-gray-700">
                  <p className="font-medium text-gray-900 mb-1">
                    {vault.plan_name} {vault.network} Data
                  </p>
                  <p>QR ID: {qrId.slice(-8)}</p>
                  <p>Expires: {new Date(expiresAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={downloadQR}
                  className="flex items-center gap-2"
                >
                  <IonIcon name="download-outline" size="16px" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={shareQR}
                  className="flex items-center gap-2"
                >
                  <IonIcon name="share-outline" size="16px" />
                  Share
                </Button>
              </div>

              {/* Shareable Link */}
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Share via link (no QR scanner needed)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/vault/qr/${qrDataBase64 || qrId}`}
                    className="flex-1 text-xs bg-background border rounded-lg px-3 py-2 text-muted-foreground"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/vault/qr/${qrDataBase64 || qrId}`);
                      toast.success("Link copied!");
                    }}
                    className="shrink-0"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {/* Usage Instructions */}
              <div className="bg-blue-500/10 border border-blue-200/30 rounded-xl p-3">
                <div className="flex gap-2">
                  <IonIcon name="information-circle" size="16px" color="#3b82f6" className="shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-semibold mb-1">2 ways to use:</p>
                    <p className="mb-1">📷 <strong>QR:</strong> Scan with camera → Enter phone → Get data</p>
                    <p>🔗 <strong>Link:</strong> Copy link above → Send to friend → They open link → Enter phone → Get data</p>
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