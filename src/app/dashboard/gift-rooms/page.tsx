"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useGiftRoom } from "@/hooks/useGiftRoom";
import { GiftRoomCard } from "@/components/gift-room-card";
import { GiftRoomStats } from "@/components/gift-room-stats";
import { GiftRoomStatus } from "@/types/gift-room";

const STATUS_FILTERS: { value: GiftRoomStatus | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'list' },
  { value: 'active', label: 'Active', icon: 'checkmark-circle' },
  { value: 'full', label: 'Full', icon: 'people' },
  { value: 'expired', label: 'Expired', icon: 'time' },
  { value: 'completed', label: 'Completed', icon: 'trophy' },
];

export default function GiftRoomsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseUser();
  const { loading: roomsLoading, giftRooms, getUserGiftRooms, shareGiftRoom, subscribeToRoom } = useGiftRoom();

  const [statusFilter, setStatusFilter] = useState<GiftRoomStatus | 'all'>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard/gift-rooms');
    }
  }, [user, authLoading, router]);

  // Fetch rooms when user is available
  useEffect(() => {
    if (user && !authLoading) {
      getUserGiftRooms();
    }
  }, [user, authLoading, getUserGiftRooms]);

  const selectedRoom = useMemo(() =>
    selectedRoomId ? giftRooms.find(r => r.id === selectedRoomId) || null : null
    , [giftRooms, selectedRoomId]);

  // Filter rooms based on status
  const filteredRooms = useMemo(() => {
    if (statusFilter === 'all') {
      return giftRooms;
    } else {
      return giftRooms.filter(room => room.status === statusFilter);
    }
  }, [giftRooms, statusFilter]);

  // Subscribe to realtime updates for the selected room
  useEffect(() => {
    if (!selectedRoom) return;

    const unsubscribe = subscribeToRoom(selectedRoom.id, () => {
      // Refresh all rooms to keep list and stats in sync
      getUserGiftRooms();
    });

    return () => {
      unsubscribe();
    };
  }, [selectedRoom, subscribeToRoom, getUserGiftRooms]);

  const handleShare = async (shareUrl: string) => {
    const token = shareUrl.split('/').pop();
    if (token) {
      await shareGiftRoom(token);
    }
  };

  const handleViewRoom = (token: string) => {
    window.open(`/gift/${token}`, '_blank');
  };

  const totalStats = useMemo(() => {
    // Isolate stats for rooms where the current user is the sender
    const userSentRooms = giftRooms.filter(r => user && r.sender_id === user.id);

    return {
      totalRooms: userSentRooms.length,
      activeRooms: userSentRooms.filter(r => r.status === 'active').length,
      totalSent: userSentRooms.reduce((sum, room) => sum + room.total_amount, 0),
      totalClaimed: userSentRooms.reduce((sum, room) => sum + (room.claimed_count * room.amount), 0),
    };
  }, [giftRooms, user]);

  const isLoading = authLoading || (roomsLoading && giftRooms.length === 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
          <div className="flex items-center h-14 px-4">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg lg:hidden">
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">My Gift Rooms</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 lg:px-8 py-6 max-w-6xl">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-muted-foreground">Loading gift rooms...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg lg:hidden">
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">My Gift Rooms</h1>
          </div>
          <Link href="/dashboard/send-gift">
            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
              <IonIcon name="add" size="18px" className="mr-1" />
              New Gift
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-6xl space-y-6">
        {!isLoading && giftRooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <IonIcon name="gift" size="40px" color="#22c55e" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              No Gift Rooms Yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first gift room to start sending gifts to friends and family.
            </p>
            <Link href="/dashboard/send-gift">
              <Button className="bg-green-500 hover:bg-green-600 text-white">
                <IonIcon name="gift" size="20px" className="mr-2" />
                Create Gift Room
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Overview Stats - Premium Minimalist theme */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border-border/50 hover:border-green-500/30 transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center space-y-1">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Total Rooms
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {totalStats.totalRooms}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 hover:border-green-500/30 transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center space-y-1">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Active
                  </div>
                  <div className="text-3xl font-bold text-green-500">
                    {totalStats.activeRooms}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 hover:border-green-500/30 transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center space-y-1">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Total Sent
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    ₦{totalStats.totalSent.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 hover:border-green-500/30 transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center space-y-1">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Claimed
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    ₦{totalStats.totalClaimed.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters - Minimalist row */}
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
              {STATUS_FILTERS.map((filter) => {
                const count = filter.value === 'all'
                  ? giftRooms.length
                  : giftRooms.filter(r => r.status === filter.value).length;

                return (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`group flex items-center gap-2 px-1 py-2 border-b-2 transition-all whitespace-nowrap ${statusFilter === filter.value
                      ? 'border-green-500 text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      }`}
                  >
                    <IonIcon name={filter.icon} size="16px" className={statusFilter === filter.value ? 'text-green-500' : 'text-muted-foreground group-hover:text-foreground'} />
                    <span className="text-sm font-semibold">{filter.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusFilter === filter.value ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Gift Rooms Grid */}
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Gift Rooms List */}
              <div className="lg:col-span-3">
                {filteredRooms.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <IonIcon name="filter" size="32px" className="text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No {statusFilter !== 'all' ? statusFilter : ''} gift rooms
                      </h3>
                      <p className="text-muted-foreground">
                        {statusFilter !== 'all'
                          ? `You don't have any ${statusFilter} gift rooms.`
                          : 'Create your first gift room to get started.'
                        }
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRooms.map((room) => (
                      <div key={room.id} onClick={() => setSelectedRoomId(room.id)} className="cursor-pointer">
                        <GiftRoomCard
                          room={room}
                          onShare={handleShare}
                          onView={handleViewRoom}
                          className={selectedRoomId === room.id ? 'ring-2 ring-green-500' : ''}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Room Details Sidebar - Cleaner placeholder */}
              <div className="lg:col-span-1">
                {selectedRoom ? (
                  <GiftRoomStats room={selectedRoom} />
                ) : (
                  <Card className="border-dashed bg-muted/20">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="w-12 h-12 bg-background border rounded-2xl flex items-center justify-center mx-auto rotate-12 group-hover:rotate-0 transition-transform">
                        <IonIcon name="analytics-outline" size="24px" className="text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-foreground">Room Details</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Select a gift room from the list to view detailed analytics and performance.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}