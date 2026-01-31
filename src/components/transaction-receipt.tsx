"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { toast } from "sonner";

interface TransactionReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    type: string;
    amount: number;
    network?: string;
    phone?: string;
    description: string;
    status: string;
    date: string;
    reference?: string;
  };
}

export function TransactionReceipt({ isOpen, onClose, transaction }: TransactionReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      airtime: "Airtime Purchase",
      data: "Data Purchase",
      cable: "Cable TV Subscription",
      electricity: "Electricity Payment",
      deposit: "Wallet Funding",
      betting: "Betting Funding",
    };
    return labels[type] || type;
  };

  const copyToClipboard = async () => {
    const text = `
TADA VTU - Transaction Receipt
==============================
Reference: ${transaction.reference || transaction.id}
Type: ${getTypeLabel(transaction.type)}
${transaction.network ? `Network: ${transaction.network}` : ""}
${transaction.phone ? `Phone: ${transaction.phone}` : ""}
Amount: ₦${Math.abs(transaction.amount).toLocaleString()}
Status: ${transaction.status.toUpperCase()}
Date: ${formatDate(transaction.date)}
==============================
Thank you for using TADA VTU!
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Receipt copied to clipboard!");
    } catch {
      toast.error("Failed to copy receipt");
    }
  };

  const shareReceipt = async () => {
    const text = `TADA VTU Receipt\n${getTypeLabel(transaction.type)}\nAmount: ₦${Math.abs(transaction.amount).toLocaleString()}\nRef: ${transaction.reference || transaction.id}\nStatus: ${transaction.status}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "TADA VTU Receipt", text });
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const downloadReceipt = () => {
    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>TADA VTU Receipt</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 400px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #22c55e; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #22c55e; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .label { color: #666; }
    .value { font-weight: 600; }
    .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .success { background: #dcfce7; color: #16a34a; }
    .failed { background: #fee2e2; color: #dc2626; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TADA VTU</div>
    <p>Transaction Receipt</p>
  </div>
  <div class="row"><span class="label">Reference</span><span class="value">${transaction.reference || transaction.id.slice(0, 8)}</span></div>
  <div class="row"><span class="label">Type</span><span class="value">${getTypeLabel(transaction.type)}</span></div>
  ${transaction.network ? `<div class="row"><span class="label">Network</span><span class="value">${transaction.network}</span></div>` : ""}
  ${transaction.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${transaction.phone}</span></div>` : ""}
  <div class="row"><span class="label">Amount</span><span class="value">₦${Math.abs(transaction.amount).toLocaleString()}</span></div>
  <div class="row"><span class="label">Status</span><span class="status ${transaction.status}">${transaction.status.toUpperCase()}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${formatDate(transaction.date)}</span></div>
  <div class="footer">Thank you for using TADA VTU!<br>www.tadavtu.com</div>
</body>
</html>`;

    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TADA-Receipt-${transaction.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div ref={receiptRef}>
          {/* Header */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <IonIcon name={transaction.status === "success" ? "checkmark-circle" : "close-circle"} size="40px" />
            </div>
            <h2 className="text-xl font-bold">Transaction {transaction.status === "success" ? "Successful" : "Failed"}</h2>
            <p className="text-3xl font-bold mt-2">₦{Math.abs(transaction.amount).toLocaleString()}</p>
          </div>

          {/* Details */}
          <div className="p-5 space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Reference</span>
              <span className="font-medium text-foreground text-sm">{transaction.reference || transaction.id.slice(0, 12)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Type</span>
              <span className="font-medium text-foreground text-sm">{getTypeLabel(transaction.type)}</span>
            </div>
            {transaction.network && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground text-sm">Network</span>
                <span className="font-medium text-foreground text-sm">{transaction.network}</span>
              </div>
            )}
            {transaction.phone && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground text-sm">Phone</span>
                <span className="font-medium text-foreground text-sm">{transaction.phone}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">Date</span>
              <span className="font-medium text-foreground text-sm">{formatDate(transaction.date)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex-col h-auto py-3">
            <IonIcon name="copy-outline" size="20px" />
            <span className="text-xs mt-1">Copy</span>
          </Button>
          <Button variant="outline" size="sm" onClick={shareReceipt} className="flex-col h-auto py-3">
            <IonIcon name="share-social-outline" size="20px" />
            <span className="text-xs mt-1">Share</span>
          </Button>
          <Button variant="outline" size="sm" onClick={downloadReceipt} className="flex-col h-auto py-3">
            <IonIcon name="download-outline" size="20px" />
            <span className="text-xs mt-1">Download</span>
          </Button>
        </div>

        <div className="p-4 pt-0">
          <Button onClick={onClose} className="w-full bg-green-500 hover:bg-green-600">Done</Button>
        </div>
      </div>
    </div>
  );
}
