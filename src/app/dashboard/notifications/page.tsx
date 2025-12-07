'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { getSupabase } from '@/lib/supabase/client';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'promo' | 'error';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return { name: 'checkmark-circle', color: '#22c55e', bg: 'bg-green-500/10' };
    case 'warning':
      return { name: 'warning', color: '#eab308', bg: 'bg-yellow-500/10' };
    case 'promo':
      return { name: 'gift', color: '#a855f7', bg: 'bg-purple-500/10' };
    default:
      return { name: 'information-circle', color: '#3b82f6', bg: 'bg-blue-500/10' };
  }
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
};

export default function NotificationsPage() {
  const { user } = useSupabaseUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications from database
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      setLoading(true);
      const supabase = getSupabase();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications((data as Notification[]) || []);
      }
      setLoading(false);
    };

    fetchNotifications();
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read) 
    : notifications;

  const markAsRead = async (id: string) => {
    const supabase = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    const supabase = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = async (id: string) => {
    const supabase = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', id);
    
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success("Notification deleted");
  };

  const clearAll = async () => {
    if (!user?.id) return;
    
    const supabase = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .delete()
      .eq('user_id', user.id);
    
    setNotifications([]);
    toast.success("All notifications cleared");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth">
                <IonIcon name="arrow-back-outline" size="20px" />
              </Link>
              <h1 className="text-lg font-semibold text-foreground ml-2">Notifications</h1>
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
              >
                <IonIcon name="checkmark-done-outline" size="18px" className="mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
              filter === 'all'
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
              filter === 'unread'
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <IonIcon name="notifications-off-outline" size="32px" className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                {filter === 'unread' ? "You're all caught up!" : "You don't have any notifications yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const iconConfig = getNotificationIcon(notification.type);
              
              return (
                <Card 
                  key={notification.id} 
                  className={`border-border transition-smooth hover:border-green-500/30 ${
                    !notification.is_read ? 'bg-green-500/5 border-green-500/20' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 ${iconConfig.bg} rounded-xl flex items-center justify-center shrink-0`}>
                        <IonIcon name={iconConfig.name} size="20px" color={iconConfig.color} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground text-sm truncate">
                                {notification.title}
                              </h3>
                              {!notification.is_read && (
                                <span className="w-2 h-2 bg-green-500 rounded-full shrink-0"></span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-green-500/10"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <IonIcon name="checkmark-outline" size="16px" color="#22c55e" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-500/10"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <IonIcon name="trash-outline" size="16px" color="#ef4444" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Clear All Button */}
        {notifications.length > 0 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={clearAll}
              className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <IonIcon name="trash-outline" size="18px" className="mr-2" />
              Clear All Notifications
            </Button>
          </div>
        )}

        {/* Notification Settings Link */}
        <Card className="border-border mt-6">
          <CardContent className="p-4">
            <Link 
              href="/dashboard/settings" 
              className="flex items-center justify-between hover:bg-muted/50 -m-4 p-4 rounded-xl transition-smooth"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <IonIcon name="settings-outline" size="20px" className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Notification Settings</p>
                  <p className="text-sm text-muted-foreground">Manage your notification preferences</p>
                </div>
              </div>
              <IonIcon name="chevron-forward-outline" size="20px" className="text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
