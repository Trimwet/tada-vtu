"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { useSupabaseTransactions } from "@/hooks/useSupabaseUser";
import { TransactionReceipt } from "@/components/transaction-receipt";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const router = useRouter();
  const { transactions, loading } = useSupabaseTransactions();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<typeof transactions[0] | null>(null);

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (txn.description || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      txn.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || txn.status === filterStatus;
    const matchesType = filterType === "all" || txn.type === filterType;
    return matchesSearch && matchesFilter && matchesType;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success": return "text-green-500 bg-green-500/10";
      case "failed": return "text-red-500 bg-red-500/10";
      case "pending":
      case "processing": return "text-amber-500 bg-amber-500/10 animate-pulse";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit": return "arrow-down-circle";
      case "withdrawal": return "arrow-up-circle";
      case "airtime": return "call";
      case "data": return "wifi";
      case "cable": return "tv";
      case "electricity": return "flash";
      case "referral": return "people";
      case "cashback": return "gift";
      default: return "receipt";
    }
  };

  const handleRepeat = (e: React.MouseEvent, txn: typeof transactions[0]) => {
    e.stopPropagation();
    if (txn.type === 'data') {
      const params = new URLSearchParams({
        network: txn.network || '',
        phone: txn.phone_number || '',
        repeat: 'true'
      });
      router.push(`/dashboard/buy-data?${params.toString()}`);
      toast.success("Redirecting to repeat data purchase...");
    } else if (txn.type === 'airtime') {
      const params = new URLSearchParams({
        network: txn.network || '',
        phone: txn.phone_number || '',
        repeat: 'true'
      });
      router.push(`/dashboard/buy-airtime?${params.toString()}`);
      toast.success("Redirecting to repeat airtime purchase...");
    } else {
      toast.info("Repeat not available for this transaction type");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-all lg:hidden"
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-bold ml-2 lg:ml-0 tracking-tight">
              History
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] pointer-events-none" />

        <Card className="bg-white/[0.02] border-white/10 backdrop-blur-sm overflow-hidden rounded-3xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <IonIcon name="journal-outline" className="text-green-500" />
              Transactions
            </CardTitle>
            <CardDescription className="text-gray-500">
              Your real-time financial and service record
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search & Filters */}
            <div className="space-y-4">
              <div className="relative group">
                <IonIcon
                  name="search-outline"
                  size="18px"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-500 transition-colors"
                />
                <Input
                  placeholder="Search by ID, network or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-black/40 border-white/5 focus:border-green-500/50 rounded-2xl transition-all"
                />
              </div>

              {/* Advanced Filter Pills */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {[
                    { value: "all", label: "All Services" },
                    { value: "deposit", label: "Deposits" },
                    { value: "airtime", label: "Airtime" },
                    { value: "data", label: "Data" },
                    { value: "cable", label: "Cable" },
                    { value: "electricity", label: "Power" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFilterType(type.value)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                        filterType === type.value
                          ? "bg-green-500 border-green-500 text-black shadow-lg shadow-green-500/20"
                          : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 border-t border-white/5 pt-3">
                  {[
                    { value: "all", label: "All Status" },
                    { value: "success", label: "Success" },
                    { value: "failed", label: "Failed" },
                    { value: "pending", label: "Pending" },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setFilterStatus(status.value)}
                      className={cn(
                        "text-[10px] uppercase font-black tracking-widest transition-all",
                        filterStatus === status.value
                          ? "text-green-500"
                          : "text-gray-600 hover:text-gray-400"
                      )}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Transactions List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-xs uppercase tracking-widest font-medium animate-pulse">Loading Ledger...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                <IonIcon
                  name="file-tray-outline"
                  size="48px"
                  className="text-gray-700 mx-auto mb-4"
                />
                <p className="text-gray-400 font-bold">
                  No matches found
                </p>
                <p className="text-xs text-gray-600 mt-1 max-w-[200px] mx-auto">
                  Try adjusting your search query or switching filters
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-green-500/30 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-transparent group-hover:bg-green-500 transition-all" />

                    {/* Icon */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                        transaction.amount > 0 ? "bg-green-500/10" : "bg-white/5"
                      )}
                    >
                      <IonIcon
                        name={getTypeIcon(transaction.type)}
                        size="24px"
                        className={transaction.amount > 0 ? "text-green-500" : "text-gray-400"}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-foreground text-sm truncate">
                          {transaction.description}
                        </p>
                        {(transaction.status as string) === 'processing' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 font-medium">
                          {formatDate(transaction.created_at)}
                        </span>
                        {transaction.network && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                            transaction.network === 'MTN' ? 'bg-yellow-500/10 text-yellow-600' :
                              transaction.network === 'AIRTEL' ? 'bg-red-500/10 text-red-600' :
                                'bg-green-500/10 text-green-600'
                          )}>
                            {transaction.network}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount & Quick Actions */}
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className={cn(
                        "font-black text-sm",
                        transaction.amount > 0 ? "text-green-500" : "text-white"
                      )}>
                        {transaction.amount > 0 ? "+" : ""}
                        ₦{Math.abs(transaction.amount).toLocaleString()}
                      </p>

                      <div className="flex items-center gap-2">
                        {(transaction.type === 'data' || transaction.type === 'airtime') && transaction.status === 'success' && (
                          <button
                            onClick={(e) => handleRepeat(e, transaction)}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black transition-all"
                            title="Repeat this purchase"
                          >
                            <IonIcon name="refresh-outline" size="14px" />
                          </button>
                        )}
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full",
                          getStatusColor(transaction.status)
                        )}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {filteredTransactions.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black">
                  Ledger ends at {filteredTransactions.length} of {transactions.length} records
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Transaction Receipt Modal */}
      {selectedTransaction && (
        <TransactionReceipt
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transaction={{
            id: selectedTransaction.id,
            type: selectedTransaction.type,
            amount: selectedTransaction.amount,
            network: selectedTransaction.network || undefined,
            phone: selectedTransaction.phone_number || undefined,
            description: selectedTransaction.description || "",
            status: selectedTransaction.status,
            date: selectedTransaction.created_at,
            reference: selectedTransaction.reference || undefined,
          }}
        />
      )}
    </div>
  );
}
