"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import { LogoInline } from "@/components/logo";
import { ButtonLoading } from "@/components/loading-icons";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  reference: string;
  description: string;
  created_at: string;
  phone_number?: string | null;
  network?: string | null;
  external_reference?: string | null;
  balance_before?: number;
  balance_after?: number;
}

interface TransactionReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export function TransactionReceiptModal({
  transaction,
  isOpen,
  onClose,
  userName = "User"
}: TransactionReceiptModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !transaction) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'refund') return "arrow-undo-outline";
    if (amount > 0) return "arrow-down-circle";

    switch (type) {
      case 'airtime': return "call";
      case 'data': return "wifi";
      case 'cable': return "tv";
      case 'electricity': return "flash";
      case 'betting': return "football";
      case 'withdrawal': return "arrow-up-circle";
      case 'deposit': return "arrow-down-circle";
      default: return "receipt";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'failed': return 'text-red-500';
      case 'pending': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const downloadPDF = async () => {
    setIsDownloading(true);
    try {
      // jspdf v2+ ships jsPDF as the default export, not a named export
      const { default: jsPDF } = await import('jspdf');

      // Pre-load logo
      const logoImg = new Image();
      logoImg.src = "/apple-touch-icon.png";
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });

      // Phone-style long format
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
      for (let y = 20; y < pageHeight; y += 40) {
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
      doc.text("TADA VTU", 10, 10);
      
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.text("TRANSACTION", pageWidth - 10, 10, { align: "right" });

      // 4. HERO SECTION
      const isSuccess = transaction.status === 'success';
      const statusColor = isSuccess ? [22, 163, 74] : transaction.status === 'failed' ? [239, 68, 68] : [245, 158, 11];
      
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        doc.addImage(logoImg, "PNG", pageWidth / 2 - 8, 20, 16, 16);
      }
      
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      
      const amountX = pageWidth / 2;
      const amountY = 45;
      const amountPrefix = transaction.amount > 0 ? "+" : "";
      const amountStr = `${amountPrefix}${Math.abs(transaction.amount).toLocaleString()}.00`;
      
      const nWidth = doc.getTextWidth("N");
      const totalWidth = nWidth + doc.getTextWidth(amountStr) + 2;
      const startX = (pageWidth - totalWidth) / 2;

      doc.text("N", startX, amountY);
      
      doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setLineWidth(0.7);
      const slashY1 = amountY - 4.8;
      const slashY2 = amountY - 3.2;
      doc.line(startX - 0.5, slashY1, startX + nWidth + 0.5, slashY1);
      doc.line(startX - 0.5, slashY2, startX + nWidth + 0.5, slashY2);

      doc.text(amountStr, startX + nWidth + 2, amountY);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`Transaction ${transaction.status === 'success' ? 'Successful' : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}`, pageWidth / 2, 55, { align: "center" });
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(formatDate(transaction.created_at), pageWidth / 2, 62, { align: "center" });

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
      drawSectionLabel("Transaction Details", yPos);
      yPos += 8;
      yPos = drawRow("Description", transaction.description || "N/A", yPos);
      yPos = drawRow("Type", transaction.type.toUpperCase(), yPos);
      yPos = drawRow("Reference", transaction.reference, yPos);
      
      if (transaction.phone_number) {
        yPos = drawRow("Recipient Phone", transaction.phone_number, yPos);
      }
      
      if (transaction.network) {
        yPos = drawRow("Network", transaction.network.toUpperCase(), yPos);
      }

      yPos += 5;
      doc.line(10, yPos, pageWidth - 10, yPos);
      yPos += 8;

      if (transaction.balance_before !== undefined && transaction.balance_after !== undefined) {
        drawSectionLabel("Balance Info", yPos);
        yPos += 8;
        yPos = drawRow("Balance Before", `₦${transaction.balance_before.toLocaleString()}`, yPos);
        yPos = drawRow("Balance After", `₦${transaction.balance_after.toLocaleString()}`, yPos);
        
        yPos += 5;
        doc.line(10, yPos, pageWidth - 10, yPos);
        yPos += 8;
      }

      // 6. SUPPORT FOOTER
      yPos = Math.max(yPos + 10, pageHeight - 40);
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

      const securityHash = btoa(`${transaction.reference}-${transaction.amount}`).slice(0, 32);
      doc.setFontSize(6);
      doc.setFont("courier", "normal");
      doc.setTextColor(200, 200, 200);
      doc.text(`DIGITAL-SEAL: ${securityHash}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      doc.save(`TADA-RECEIPT-${transaction.reference.slice(-8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl max-w-sm w-full max-h-[95vh] flex flex-col">
        <Card className="border-0 shadow-2xl flex-1 flex flex-col">
          <CardHeader className="text-center pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8"></div>
              <LogoInline size="sm" />
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <IonIcon name="close" size="20px" />
              </button>
            </div>
            <CardTitle className="text-lg">Transaction Receipt</CardTitle>
            <CardDescription className="text-xs">
              #{transaction.reference.slice(-8)}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between space-y-4 pb-4">
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                transaction.amount > 0 ? 'bg-green-500/10' : 'bg-muted'
              }`}>
                <IonIcon
                  name={getTransactionIcon(transaction.type, transaction.amount)}
                  size="24px"
                  color={transaction.amount > 0 ? "#22c55e" : "#888"}
                />
              </div>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mb-2 ${getStatusBadgeColor(transaction.status)}`}>
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </div>
              <p className={`text-2xl font-bold ${getStatusColor(transaction.status)}`}>
                {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <span className="text-muted-foreground block">Transaction ID</span>
                  <span className="font-medium font-mono text-[10px] break-all">{transaction.reference}</span>
                </div>
                
                <div>
                  <span className="text-muted-foreground block">Date</span>
                  <span className="font-medium">{new Date(transaction.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {transaction.phone_number && (
                  <div>
                    <span className="text-muted-foreground block">Phone</span>
                    <span className="font-medium font-mono">{transaction.phone_number}</span>
                  </div>
                )}

                {transaction.network && (
                  <div>
                    <span className="text-muted-foreground block">Network</span>
                    <span className="font-medium">{transaction.network}</span>
                  </div>
                )}

                {(transaction as any).balance_before !== undefined && (transaction as any).balance_after !== undefined && (
                  <>
                    <div>
                      <span className="text-muted-foreground block">Before</span>
                      <span className="font-medium">₦{(transaction as any).balance_before.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">After</span>
                      <span className="font-medium">₦{(transaction as any).balance_after.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground block mb-1">Description</span>
                <span className="font-medium text-xs leading-relaxed">{transaction.description}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 shrink-0">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-9 text-xs"
              >
                Close
              </Button>
              <Button
                onClick={downloadPDF}
                disabled={isDownloading}
                className="flex-1 h-9 text-xs bg-green-500 hover:bg-green-600 gap-1"
              >
                {isDownloading ? (
                  <ButtonLoading type="loading" text="Generating..." />
                ) : (
                  <>
                    <IonIcon name="download-outline" size="14px" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
