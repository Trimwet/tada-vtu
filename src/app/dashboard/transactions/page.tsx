"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { useSupabaseUser, useSupabaseTransactions } from "@/hooks/useSupabaseUser";
import { TransactionReceipt } from "@/components/transaction-receipt";

type FilterType = 'all' | 'deposit' | 'airtime' | 'data' | 'cable' | 'electricity' | 'betting' | 'withdrawal';

export default function TransactionsPage() {
  const { user } = useSupabaseUser();
  const { transactions, loading } = useSupabaseTransactions(50); // Get more transactions
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (filter === 'all') return transactions;
    return transactions.filter(txn => txn.type === filter);
  }, [transactions, filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-NG', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-NG', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else {
      return date.toLocaleDateString('en-NG', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) return "arrow-down";
    
    switch (type) {
      case 'airtime': return "call";
      case 'data': return "wifi";
      case 'cable': return "tv";
      case 'electricity': return "flash";
      case 'betting': return "football";
      case 'withdrawal': return "arrow-up";
      default: return "arrow-up";
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return "text-green-500";
    return "text-foreground";
  };

  const handleTransactionClick = (transaction: any) => {
    console.log('Transaction clicked:', transaction); // Debug log
    
    // Transform transaction data to match the existing component's interface
    const transformedTransaction = {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      network: transaction.network,
      phone: transaction.phone_number,
      description: transaction.description,
      status: transaction.status,
      date: transaction.created_at,
      reference: transaction.reference,
    };
    
    console.log('Transformed transaction:', transformedTransaction); // Debug log
    setSelectedTransaction(transformedTransaction);
    setShowReceiptModal(true);
    console.log('Modal should be open now'); // Debug log
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedTransaction(null);
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all' as const, label: 'All', count: transactions?.length || 0 },
    { key: 'deposit' as const, label: 'Deposits', count: transactions?.filter(t => t.type === 'deposit').length || 0 },
    { key: 'airtime' as const, label: 'Airtime', count: transactions?.filter(t => t.type === 'airtime').length || 0 },
    { key: 'data' as const, label: 'Data', count: transactions?.filter(t => t.type === 'data').length || 0 },
    { key: 'cable' as const, label: 'Cable TV', count: transactions?.filter(t => t.type === 'cable').length || 0 },
    { key: 'electricity' as const, label: 'Electricity', count: transactions?.filter(t => t.type === 'electricity').length || 0 },
    { key: 'betting' as const, label: 'Betting', count: transactions?.filter(t => t.type === 'betting').length || 0 },
    { key: 'withdrawal' as const, label: 'Withdrawals', count: transactions?.filter(t => t.type === 'withdrawal').length || 0 },
  ].filter(f => f.count > 0 || f.key === 'all');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center h-14 px-4">
          <Link
            href="/dashboard"
            className="p-2 -ml-2 hover:bg-muted active:bg-muted/80 rounded-lg transition-smooth lg:hidden touch-target"
          >
            <IonIcon name="arrow-back-outline" size="20px" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">
            Transaction History
          </h1>
        </div>
      </header>

      <main className="px-4 lg:px-8 py-6 space-y-6 lg:max-w-4xl lg:mx-auto">
        {/* Summary Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <IonIcon name="receipt-outline" size="24px" color="#22c55e" />
              </div>
              Transaction History
            </CardTitle>
            <CardDescription>
              View all your wallet activities and purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold text-green-500">
                  ₦{(user?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-xl font-semibold text-foreground">
                  {transactions?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                filter === filterOption.key
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              <span className="font-medium">{filterOption.label}</span>
              {filterOption.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === filterOption.key
                    ? 'bg-white/20 text-white'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                  {filterOption.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <Card className="border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <IonIcon
                    name="receipt-outline"
                    size="32px"
                    className="text-muted-foreground"
                  />
                </div>
                <p className="text-foreground font-medium">
                  {filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === 'all' 
                    ? 'Your transactions will appear here'
                    : `Your ${filter} transactions will appear here`
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTransactions.map((transaction, index) => {
                  const date = formatDate(transaction.created_at);
                  const hasBalanceInfo = (transaction as any).balance_before !== undefined && (transaction as any).balance_after !== undefined;
                  
                  return (
                    <div
                      key={transaction.id}
                      onClick={() => handleTransactionClick(transaction)}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-smooth cursor-pointer rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            transaction.amount > 0
                              ? "bg-green-500/10"
                              : "bg-muted"
                          }`}
                        >
                          <IonIcon
                            name={getTransactionIcon(transaction.type, transaction.amount)}
                            size="20px"
                            color={transaction.amount > 0 ? "#22c55e" : "#888"}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-foreground truncate">
                            {transaction.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{date}</span>
                            {hasBalanceInfo && (
                              <>
                                <span>•</span>
                                <span className="font-mono">
                                  ₦{(transaction as any).balance_before.toLocaleString()} → ₦{(transaction as any).balance_after.toLocaleString()}
                                </span>
                              </>
                            )}
                            {transaction.network && (
                              <>
                                <span>•</span>
                                <span>{transaction.network}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p
                          className={`font-semibold text-sm ${
                            transaction.status === "failed"
                              ? "text-red-500"
                              : getTransactionColor(transaction.type, transaction.amount)
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}₦
                          {Math.abs(transaction.amount).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1 justify-end">
                          {transaction.status === "failed" && (
                            <span className="text-xs text-red-500 font-medium">Failed</span>
                          )}
                          {transaction.status === "pending" && (
                            <span className="text-xs text-amber-500 font-medium">Pending</span>
                          )}
                          {transaction.status === "success" && transaction.amount > 0 && (
                            <span className="text-xs text-green-500 font-medium">Credit</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/fund-wallet">
            <Button className="w-full h-12 bg-green-500 hover:bg-green-600 gap-2">
              <IonIcon name="add-circle-outline" size="20px" />
              Fund Wallet
            </Button>
          </Link>
          <Link href="/dashboard/buy-data">
            <Button variant="outline" className="w-full h-12 gap-2">
              <IonIcon name="wifi-outline" size="20px" />
              Buy Data
            </Button>
          </Link>
        </div>

        {/* Transaction Receipt Modal */}
        {selectedTransaction && (
          <TransactionReceipt
            transaction={selectedTransaction}
            isOpen={showReceiptModal}
            onClose={closeReceiptModal}
          />
        )}
      </main>
    </div>
  );
}