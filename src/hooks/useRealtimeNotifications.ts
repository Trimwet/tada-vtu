'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useRealtimeNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const supabase = getSupabase();
    const userId = user.id;

    // Subscribe to new transactions
    const transactionChannel = supabase
      .channel(`transactions-changes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const transaction = payload.new as {
            type: string;
            amount: number;
            status: string;
            description: string;
          };
          
          if (transaction.status === 'success') {
            if (transaction.amount > 0) {
              toast.success('Wallet Credited!', {
                description: `₦${transaction.amount.toLocaleString()} - ${transaction.description}`,
              });
            } else {
              toast.info('Transaction Complete', {
                description: transaction.description,
              });
            }
          } else if (transaction.status === 'failed') {
            toast.error('Transaction Failed', {
              description: transaction.description,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to notifications table
    const notificationChannel = supabase
      .channel(`notifications-changes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const notification = payload.new as {
            title: string;
            message: string;
            type: 'info' | 'success' | 'warning' | 'error';
          };
          
          const toastFn = {
            info: toast.info,
            success: toast.success,
            warning: toast.warning,
            error: toast.error,
          }[notification.type] || toast.info;
          
          toastFn(notification.title, {
            description: notification.message,
          });
        }
      )
      .subscribe();

    // Subscribe to balance changes
    const profileChannel = supabase
      .channel(`profile-changes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: { old: Record<string, unknown>; new: Record<string, unknown> }) => {
          const oldBalance = (payload.old as { balance: number }).balance;
          const newBalance = (payload.new as { balance: number }).balance;
          
          if (newBalance > oldBalance) {
            const diff = newBalance - oldBalance;
            toast.success('Balance Updated', {
              description: `+₦${diff.toLocaleString()} added to your wallet`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);
}
