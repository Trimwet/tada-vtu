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
import { Input } from "@/components/ui/input";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { useSupabaseTransactions } from "@/hooks/useSupabaseUser";
import { TransactionReceipt } from "@/components/transaction-receipt";

export default function TransactionsPage() {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return "arrow-down";
      case "withdrawal":
        return "arrow-up";
      case "airtime":
        return "call";
      case "data":
        return "wifi";
      case "cable":
        return "tv";
      case "electricity":
        return "flash";
      case "referral":
        return "people";
      case "cashback":
        return "gift";
      default:
        return "receipt";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth lg:hidden"
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">
              Transactions
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-4xl">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Transaction History</CardTitle>
            <CardDescription>
              View all your transactions and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <IonIcon
                name="search-outline"
                size="18px"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: "all", label: "All" },
                { value: "deposit", label: "Deposit" },
                { value: "airtime", label: "Airtime" },
                { value: "data", label: "Data" },
                { value: "cable", label: "Cable" },
                { value: "electricity", label: "Electric" },
              ].map((type) => (
                <Button
                  key={type.value}
                  variant={filterType === type.value ? "default" : "outline"}
                  onClick={() => setFilterType(type.value)}
                  size="sm"
                  className={
                    filterType === type.value
                      ? "bg-green-500 hover:bg-green-600"
                      : ""
                  }
                >
                  {type.label}
                </Button>
              ))}
            </div>

            {/* Status Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { value: "all", label: "All Status" },
                { value: "success", label: "Success" },
                { value: "failed", label: "Failed" },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setFilterStatus(status.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === status.value
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>

            {/* Transactions List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <IonIcon
                  name="receipt-outline"
                  size="48px"
                  className="text-muted-foreground mx-auto mb-3"
                />
                <p className="text-foreground font-medium">
                  No transactions found
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {transactions.length === 0
                    ? "Your transactions will appear here"
                    : "Try adjusting your search or filters"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        transaction.amount > 0
                          ? "bg-green-500/10"
                          : "bg-muted"
                      }`}
                    >
                      <IonIcon
                        name={getTypeIcon(transaction.type)}
                        size="20px"
                        color={transaction.amount > 0 ? "#22c55e" : undefined}
                        className={
                          transaction.amount <= 0
                            ? "text-muted-foreground"
                            : ""
                        }
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </span>
                        {transaction.network && (
                          <span className="text-xs text-muted-foreground">
                            • {transaction.network}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount & Status */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`font-semibold text-sm ${
                          transaction.amount > 0
                            ? "text-green-500"
                            : "text-foreground"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}₦
                        {Math.abs(transaction.amount).toLocaleString()}
                      </p>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 text-xs font-medium rounded ${
                          transaction.status === "success"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {filteredTransactions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Showing {filteredTransactions.length} of {transactions.length}{" "}
                  transactions
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
