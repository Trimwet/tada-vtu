'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface Settlement {
  id: number;
  merchant_name: string;
  merchant_email: string;
  settlement_account: string;
  bank_code: string;
  transaction_count: number;
  processed_date: string;
  gross_amount: number;
  app_fee: number;
  merchant_fee: number;
  chargeback: number;
  refund: number;
  stampduty_charge: number;
  net_amount: number;
  currency: string;
  status: string;
  is_local: boolean;
  created_at: string;
}

interface FWTransaction {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee: number;
  merchant_fee: number;
  status: string;
  payment_type: string;
  created_at: string;
  customer: { name: string; email: string; phone_number: string };
  narration: string;
}

interface Charge {
  id: number;
  tx_ref: unknown;
  amount: number;
  app_fee: number;
  currency: unknown;
  status: unknown;
  customer: unknown;
  created_at: unknown;
}

interface HistoryData {
  settlements: Settlement[];
  transactions: FWTransaction[];
  charges: Charge[];
  meta: {
    settlements: { total?: number; page_size?: number };
    transactions: { total?: number; page_size?: number };
  };
}

function fmt(n: number) {
  return `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase();
  const variant =
    s === 'successful' || s === 'success' || s === 'settled'
      ? 'default'
      : s === 'pending'
      ? 'secondary'
      : 'destructive';
  return <Badge variant={variant} className="capitalize text-[10px]">{status}</Badge>;
}

export function FlutterwaveHistory({ token }: { token: string }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/flutterwave-history?page=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(page); }, [load, page]);

  return (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-white text-base">Flutterwave History</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}
            className="text-gray-400 hover:text-white h-7 px-2">← Prev</Button>
          <span className="text-gray-400 text-xs">Page {page}</span>
          <Button size="sm" variant="ghost" disabled={loading} onClick={() => setPage(p => p + 1)}
            className="text-gray-400 hover:text-white h-7 px-2">Next →</Button>
          <Button size="sm" variant="ghost" onClick={() => load(page)} disabled={loading}
            className="text-green-400 hover:text-green-300 h-7 px-2">↻ Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {loading && <p className="text-gray-400 text-sm">Loading...</p>}
        {!loading && data && (
          <Tabs defaultValue="settlements">
            <TabsList className="bg-gray-900/60 mb-4">
              <TabsTrigger value="settlements" className="text-xs data-[state=active]:bg-green-600 data-[state=active]:text-white">
                Settlements ({data.meta?.settlements?.total ?? data.settlements.length})
              </TabsTrigger>
              <TabsTrigger value="funding" className="text-xs data-[state=active]:bg-green-600 data-[state=active]:text-white">
                Funding History ({data.meta?.transactions?.total ?? data.transactions.length})
              </TabsTrigger>
              <TabsTrigger value="charges" className="text-xs data-[state=active]:bg-green-600 data-[state=active]:text-white">
                Charges ({data.charges.length}{data.meta?.transactions?.total && data.meta.transactions.total > data.transactions.length ? '+' : ''})
              </TabsTrigger>
            </TabsList>

            {/* SETTLEMENTS */}
            <TabsContent value="settlements">
              <div className="overflow-x-auto rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      <TableHead className="text-gray-400 text-xs">Date</TableHead>
                      <TableHead className="text-gray-400 text-xs">Merchant</TableHead>
                      <TableHead className="text-gray-400 text-xs text-right">Gross</TableHead>
                      <TableHead className="text-gray-400 text-xs text-right">Fee</TableHead>
                      <TableHead className="text-gray-400 text-xs text-right">Net</TableHead>
                      <TableHead className="text-gray-400 text-xs text-center">Txns</TableHead>
                      <TableHead className="text-gray-400 text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.settlements.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">No settlements found</TableCell></TableRow>
                    )}
                    {data.settlements.map((s) => (
                      <TableRow key={s.id} className="border-gray-700/50 hover:bg-gray-700/30">
                        <TableCell className="text-gray-400 text-xs">{fmtDate(s.processed_date || s.created_at)}</TableCell>
                        <TableCell>
                          <p className="text-white text-xs">{s.merchant_name}</p>
                          <p className="text-gray-500 text-[10px]">{s.merchant_email}</p>
                        </TableCell>
                        <TableCell className="text-right text-white text-xs">{fmt(s.gross_amount)}</TableCell>
                        <TableCell className="text-right text-red-400 text-xs">-{fmt(s.app_fee)}</TableCell>
                        <TableCell className="text-right text-green-400 text-xs font-medium">{fmt(s.net_amount)}</TableCell>
                        <TableCell className="text-center text-gray-300 text-xs">{s.transaction_count}</TableCell>
                        <TableCell className="text-center"><StatusBadge status={s.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* FUNDING HISTORY */}
            <TabsContent value="funding">
              <div className="overflow-x-auto rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      <TableHead className="text-gray-400 text-xs">Date</TableHead>
                      <TableHead className="text-gray-400 text-xs">Customer</TableHead>
                      <TableHead className="text-gray-400 text-xs">Ref</TableHead>
                      <TableHead className="text-gray-400 text-xs">Method</TableHead>
                      <TableHead className="text-gray-400 text-xs text-right">Amount</TableHead>
                      <TableHead className="text-gray-400 text-xs text-right">Charged</TableHead>
                      <TableHead className="text-gray-400 text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">No transactions found</TableCell></TableRow>
                    )}
                    {data.transactions.map((t) => (
                      <TableRow key={t.id} className="border-gray-700/50 hover:bg-gray-700/30">
                        <TableCell className="text-gray-400 text-xs">{fmtDate(t.created_at)}</TableCell>
                        <TableCell>
                          <p className="text-white text-xs">{t.customer?.name || '—'}</p>
                          <p className="text-gray-500 text-[10px]">{t.customer?.email}</p>
                        </TableCell>
                        <TableCell className="text-gray-400 text-[10px] font-mono max-w-[100px] truncate">{t.tx_ref}</TableCell>
                        <TableCell className="text-gray-300 text-xs capitalize">{t.payment_type}</TableCell>
                        <TableCell className="text-right text-white text-xs">{fmt(t.amount)}</TableCell>
                        <TableCell className="text-right text-orange-400 text-xs">{fmt(t.charged_amount)}</TableCell>
                        <TableCell className="text-center"><StatusBadge status={t.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* CHARGES */}
            <TabsContent value="charges">
              <div className="overflow-x-auto rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      <TableHead className="text-gray-400 text-xs">Date</TableHead>
                      <TableHead className="text-gray-400 text-xs">Customer</TableHead>
                      <TableHead className="text-gray-400 text-xs">Ref</TableHead>
                      <TableHead className="text-gray-400 text-xs text-right">Amount</TableHead>
                      <TableHead className="text-gray-400 text-xs text-right">Fee Charged</TableHead>
                      <TableHead className="text-gray-400 text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.charges.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">No charges found</TableCell></TableRow>
                    )}
                    {data.charges.map((c) => (
                      <TableRow key={c.id} className="border-gray-700/50 hover:bg-gray-700/30">
                        <TableCell className="text-gray-400 text-xs">{fmtDate(String(c.created_at))}</TableCell>
                        <TableCell className="text-gray-300 text-xs">{String(c.customer || '—')}</TableCell>
                        <TableCell className="text-gray-400 text-[10px] font-mono">{String(c.tx_ref || '—')}</TableCell>
                        <TableCell className="text-right text-white text-xs">{fmt(c.amount)}</TableCell>
                        <TableCell className="text-right text-red-400 text-xs font-medium">-{fmt(c.app_fee)}</TableCell>
                        <TableCell className="text-center"><StatusBadge status={String(c.status)} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
