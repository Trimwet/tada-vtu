"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { useSupabaseUser, useSupabaseTransactions } from "@/hooks/useSupabaseUser";
import { TransactionReceipt } from "@/components/transaction-receipt";

type FilterType = 'all' | 'deposit' | 'airtime' | 'data' | 'cable' | 'electricity' | 'betting' | 'withdrawal';
type StatusFilter = 'all' | 'success' | 'pending' | 'failed';

export default function TransactionsPage() {
  const { user } = useSupabaseUser();
  const { transactions, loading } = useSupabaseTransactions(100);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(txn => {
      const matchesType = typeFilter === 'all' || txn.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
      return matchesType && matchesStatus;
    });
  }, [transactions, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    if (!transactions) return { total: 0, success: 0, pending: 0, failed: 0 };
    return {
      total: transactions.length,
      success: transactions.filter(t => t.status === 'success').length,
      pending: transactions.filter(t => t.status === 'pending').length,
      failed: transactions.filter(t => t.status === 'failed').length,
    };
  }, [transactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getTransactionIcon = (type: string) => {
    const icons: Record<string, string> = {
      deposit: 'arrow-down-circle',
      airtime: 'call',
      data: 'wifi',
      cable: 'tv',
      electricity: 'flash',
      betting: 'football',
      withdrawal: 'arrow-up-circle',
    };
    return icons[type] || 'card';
  };

  const handleTransactionClick = (transaction: any) => {
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
    setSelectedTransaction(transformedTransaction);
    setShowReceiptModal(true);
  };

  const typeFilters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Types' },
    { key: 'deposit', label: 'Deposits' },
    { key: 'airtime', label: 'Airtime' },
    { key: 'data', label: 'Data' },
    { key: 'cable', label: 'Cable' },
    { key: 'electricity', label: 'Electricity' },
    { key: 'betting', label: 'Betting' },
    { key: 'withdrawal', label: 'Withdrawals' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
              >
                <IonIcon name="arrow-back-outline" size="20px" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Transactions</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  View and manage your transaction history
                </p>
              </div>
            </div>
            
            {/* Status Overview */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-muted-foreground">{stats.success} Success</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-muted-foreground">{stats.pending} Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-muted-foreground">{stats.failed} Failed</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Type Filter Dropdown */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
            >
              {typeFilters.map(filter => (
                <option key={filter.key} value={filter.key}>{filter.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              {(['all', 'success', 'pending', 'failed'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <IonIcon name="receipt-outline" size="32px" className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">No transactions found</p>
            <p className="text-sm text-muted-foreground">
              {typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Your transactions will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                onClick={() => handleTransactionClick(transaction)}
                className="group relative bg-card border border-border hover:border-green-500/50 rounded-lg transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* Status Indicator Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  transaction.status === 'success' ? 'bg-green-500' :
                  transaction.status === 'pending' ? 'bg-amber-500' :
                  'bg-red-500'
                }`} />

                <div className="flex items-center gap-4 p-4 pl-5">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    transaction.status === 'failed' ? 'bg-red-500/10' :
                    transaction.amount > 0 ? 'bg-green-500/10' :
                    'bg-muted'
                  }`}>
                    <IonIcon
                      name={getTransactionIcon(transaction.type)}
                      size="20px"
                      color={
                        transaction.status === 'failed' ? '#ef4444' :
                        transaction.amount > 0 ? '#22c55e' :
                        '#6b7280'
                      }
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {transaction.description}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </span>
                          {transaction.network && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {transaction.network}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount & Status */}
                      <div className="text-right shrink-0">
                        <p className={`font-semibold text-sm ${
                          transaction.status === 'failed' ? 'text-red-500' :
                          transaction.amount > 0 ? 'text-green-500' :
                          'text-foreground'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            transaction.status === 'success' ? 'bg-green-500' :
                            transaction.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                            'bg-red-500'
                          }`} />
                          <span className={`text-xs capitalize ${
                            transaction.status === 'success' ? 'text-green-500' :
                            transaction.status === 'pending' ? 'text-amber-500' :
                            'text-red-500'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chevron */}
                  <IonIcon
                    name="chevron-forward-outline"
                    size="16px"
                    className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/dashboard/fund-wallet">
            <Button className="w-full h-12 bg-green-500 hover:bg-green-600 gap-2">
              <IonIcon name="add-circle-outline" size="20px" />
              Fund Wallet
            </Button>
          </Link>
          <Link href="/dashboard/buy-data">
            <Button variant="outline" className="w-full h-12 gap-2 border-border hover:border-green-500/50">
              <IonIcon name="wifi-outline" size="20px" />
              Buy Data
            </Button>
          </Link>
        </div>
      </main>

      {/* Transaction Receipt Modal */}
      {selectedTransaction && (
        <TransactionReceipt
          transaction={selectedTransaction}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
}