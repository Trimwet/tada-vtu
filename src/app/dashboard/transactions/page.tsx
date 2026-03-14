"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { useSupabaseUser, useSupabaseTransactions } from "@/hooks/useSupabaseUser";
import { TransactionReceipt } from "@/components/transaction-receipt";
import { LoadingIcon } from "@/components/loading-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterType = 'all' | 'deposit' | 'airtime' | 'data' | 'withdrawal';
type StatusFilter = 'all' | 'success' | 'pending' | 'failed';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const { transactions, loading } = useSupabaseTransactions(200);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const changePage = (newPage: number) => {
    startTransition(() => {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(txn => {
      const matchesType = typeFilter === 'all' || txn.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
      return matchesType && matchesStatus;
    });
  }, [transactions, typeFilter, statusFilter]);

  // Reset to page 1 when filters change
  const handleTypeFilter = (value: FilterType) => { setTypeFilter(value); setPage(1); };
  const handleStatusFilter = (value: StatusFilter) => { setStatusFilter(value); setPage(1); };

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const paginatedTransactions = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const getTransactionIcon = (type: string, description?: string | null) => {
    // Check description for specific transaction types
    const desc = description?.toLowerCase() || '';
    
    if (desc.includes('bank transfer')) {
      return 'business-outline';
    }
    
    if (desc.includes('data vault')) {
      return 'archive';
    }
    
    if (desc.includes('qr code')) {
      return 'qr-code';
    }
    
    const icons: Record<string, string> = {
      deposit: 'arrow-down-circle',
      airtime: 'call',
      data: 'wifi',
      withdrawal: 'arrow-up-circle',
      gift_room_create: 'gift-outline',
      gift_room_refund: 'arrow-undo-outline',
      gift_room_claim: 'gift',
      gift_send: 'gift-outline',
      gift_receive: 'gift',
      gift_refund: 'arrow-undo-outline',
    };
    return icons[type] || 'card-outline';
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
          {/* Type Filter with shadcn Select */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={typeFilter} onValueChange={(value) => handleTypeFilter(value as FilterType)}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {typeFilters.map(filter => (
                  <SelectItem key={filter.key} value={filter.key}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              {(['all', 'success', 'pending', 'failed'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
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
            <LoadingIcon type="loading" size={32} />
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
          <div
            key={page}
            className={`space-y-2 transition-opacity duration-200 ${isPending ? 'opacity-40' : 'opacity-100'}`}
            style={{ animation: 'fade-in 0.2s ease-out' }}
          >
            {paginatedTransactions.map((transaction) => (
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
                    transaction.amount < 0 ? 'bg-blue-500/10' :
                    'bg-muted'
                  }`}>
                    <IonIcon
                      name={getTransactionIcon(transaction.type, transaction.description)}
                      size="20px"
                      className={
                        transaction.status === 'failed' ? 'text-red-500' :
                        transaction.amount > 0 ? 'text-green-500' :
                        transaction.amount < 0 ? 'text-blue-500' :
                        'text-muted-foreground'
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {filteredTransactions.length} transactions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="h-9 px-3 gap-1"
              >
                <IonIcon name="chevron-back-outline" size="16px" />
                Prev
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => changePage(p as number)}
                        className={`w-9 h-9 rounded-md text-sm font-medium transition-colors ${
                          page === p
                            ? 'bg-green-500 text-white'
                            : 'hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="h-9 px-3 gap-1"
              >
                Next
                <IonIcon name="chevron-forward-outline" size="16px" />
              </Button>
            </div>
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