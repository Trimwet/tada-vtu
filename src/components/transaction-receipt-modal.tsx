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
    if (amount > 0) return "arrow-down-circle";
    
    switch (type) {
      case 'airtime': return "call";
      case 'data': return "wifi";
      case 'cable': return "tv";
      case 'electricity': return "flash";
      case 'betting': return "football";
      case 'withdrawal': return "arrow-up-circle";
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
      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = 30;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('TADA VTU', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Transaction Receipt', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 20;
      
      // Transaction Details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Details', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const details = [
        ['Transaction ID:', transaction.reference || ''],
        ['Description:', transaction.description || ''],
        ['Amount:', `₦${Math.abs(transaction.amount).toLocaleString()}`],
        ['Type:', transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : ''],
        ['Status:', transaction.status ? transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) : ''],
        ['Date:', formatDate(transaction.created_at)],
        ...(transaction.phone_number ? [['Phone Number:', transaction.phone_number]] : []),
        ...(transaction.network ? [['Network:', transaction.network]] : []),
        ...(transaction.external_reference ? [['External Ref:', transaction.external_reference]] : []),
      ];

      details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label || '', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '', margin + 40, yPosition);
        yPosition += 8;
      });

      // Balance Information
      if (transaction.balance_before !== undefined && transaction.balance_after !== undefined) {
        yPosition += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Balance Information', margin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        doc.setFont('helvetica', 'bold');
        doc.text('Balance Before:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(`₦${transaction.balance_before.toLocaleString()}`, margin + 40, yPosition);
        yPosition += 8;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Balance After:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(`₦${transaction.balance_after.toLocaleString()}`, margin + 40, yPosition);
        yPosition += 8;
      }

      // Footer
      yPosition += 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for using TADA VTU!', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      doc.text('For support, contact us at support@tadavtu.com', pageWidth / 2, yPosition, { align: 'center' });
      
      // Save the PDF
      doc.save(`TADA-VTU-Receipt-${transaction.reference || 'unknown'}.pdf`);
      
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
              <div className="w-8"></div> {/* Spacer */}
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
            {/* Transaction Status & Amount - Compact */}
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

            {/* Transaction Details - Compact Grid */}
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

                {/* Balance Information - Compact */}
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

              {/* Description - Full width */}
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground block mb-1">Description</span>
                <span className="font-medium text-xs leading-relaxed">{transaction.description}</span>
              </div>
            </div>

            {/* Actions - Compact */}
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
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
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