import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';

interface UseNotificationsResult {
  unreadCount: number;
  hasUnread: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUnreadCount();

    // Set up real-time subscription for notifications
    if (!userId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refresh count on any notification change
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUnreadCount]);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    loading,
    refresh: fetchUnreadCount,
  };
}

// Check if user needs to add phone number and create notification if needed
export async function checkAndNotifyMissingPhone(userId: string, phoneNumber: string | null | undefined) {
  if (phoneNumber) return; // Already has phone number

  const supabase = getSupabase();

  // Check if we already sent this notification
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('title', '📱 Add Your Phone Number')
    .limit(1);

  if (existing && existing.length > 0) return; // Already notified

  // Create notification - cast to any to bypass strict typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('notifications').insert({
    user_id: userId,
    type: 'warning',
    title: '📱 Add Your Phone Number',
    message: 'Please add your phone number in Settings to receive airtime and data. This is required for purchases.',
    is_read: false,
  });
}
