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

export default function TransactionsPage() {
  const { transactions, loading } = useSupabaseTransactions();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return "arrow-down";
      case "airtime":
        return "call";
      case "data":
        return "wifi";
      case "cable":
        return "tv";
      case "electricity":
        return "flash";
      default:
        return "swap-horizontal";
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
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Transaction History</CardTitle>
                <CardDescription>
                  View all your transactions and activities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
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
              <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="h-9 px-3 py-1 rounded-md border border-border bg-card text-foreground text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="all" className="bg-card text-foreground">All Types</option>
                  <option value="deposit" className="bg-card text-foreground">Fund Wallet</option>
                  <option value="airtime" className="bg-card text-foreground">Airtime</option>
                  <option value="data" className="bg-card text-foreground">Data</option>
                  <option value="cable" className="bg-card text-foreground">Cable TV</option>
                  <option value="electricity" className="bg-card text-foreground">Electricity</option>
                </select>

                {["all", "success", "failed"].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    onClick={() => setFilterStatus(status)}
                    size="sm"
                    className={
                      filterStatus === status
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
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
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-smooth"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
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
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p
                        className={`font-semibold ${
                          transaction.amount > 0
                            ? "text-green-500"
                            : "text-foreground"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}₦
                        {Math.abs(transaction.amount).toLocaleString()}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {transaction.network && (
                          <span className="text-xs text-muted-foreground">
                            {transaction.network}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            transaction.status === "success"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
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
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Showing {filteredTransactions.length} of {transactions.length}{" "}
                  transactions
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
