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
import { IonIcon } from "@/components/ion-icon";
import { useDataVault } from "@/hooks/useDataVault";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { VaultQRModal } from "@/components/vault-qr-modal";
import { toast } from "sonner";
import Link from "next/link";

export default function DataVaultPage() {
  const { user } = useSupabaseUser();
  const { vaultData, loading, isDelivering, deliverData } = useDataVault(user?.id);
  const [activeTab, setActiveTab] = useState<'ready' | 'delivered' | 'expired'>('ready');
  const [selectedVault, setSelectedVault] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleDeliver = async (vaultId: string) => {
    try {
      const result = await deliverData(vaultId, user!.id);
      
      if (result.status) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to deliver data. Please try again.');
    }
  };

  const handleGenerateQR = (vault: any) => {
    setSelectedVault(vault);
    setShowQRModal(true);
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Expires soon';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 space-y-6 lg:max-w-7xl lg:mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const readyItems = vaultData?.ready || [];
  const deliveredItems = vaultData?.delivered || [];
  const expiredItems = vaultData?.expired || [];
  const stats = vaultData?.stats;

  const tabs = [
    { key: 'ready' as const, label: 'Ready', count: readyItems.length, items: readyItems },
    { key: 'delivered' as const, label: 'Delivered', count: deliveredItems.length, items: deliveredItems },
    { key: 'expired' as const, label: 'Expired', count: expiredItems.length, items: expiredItems },
  ];

  const activeItems = tabs.find(tab => tab.key === activeTab)?.items || [];

  return (
    <div className="px-4 lg:px-8 py-6 space-y-6 lg:max-w-7xl lg:mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <IonIcon name="archive-outline" size="24px" color="#22c55e" />
            </div>
            Data Vault
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your parked data plans
          </p>
        </div>
        <Link href="/dashboard/buy-data">
          <Button className="gap-2">
            <IonIcon name="add-outline" size="16px" />
            Park Data
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <IonIcon name="archive-outline" size="20px" color="#22c55e" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ready to Send</p>
                <p className="text-xl font-bold text-foreground">
                  ₦{stats?.totalParked.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats?.readyCount || 0} items
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <IonIcon name="checkmark-circle-outline" size="20px" color="#3b82f6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold text-foreground">
                  ₦{stats?.totalDelivered.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats?.deliveredCount || 0} items
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <IonIcon name="time-outline" size="20px" color="#f59e0b" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-xl font-bold text-foreground">
                  {stats?.expiredCount || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Auto-refunded
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Switch-Style Tabs */}
      <div className="relative bg-muted p-1 rounded-xl w-fit">
        {/* Animated background indicator */}
        <div 
          className="absolute top-1 bottom-1 bg-background rounded-lg shadow-sm transition-all duration-300 ease-out"
          style={{
            left: `${4 + (tabs.findIndex(tab => tab.key === activeTab) * (100 / tabs.length))}px`,
            width: `calc(${100 / tabs.length}% - 8px)`,
          }}
        />
        
        <div className="relative flex">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-6 py-3 text-sm font-medium transition-all duration-300 flex items-center gap-2 min-w-[120px] justify-center ${
                activeTab === tab.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {/* Tab icon */}
              <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                activeTab === tab.key
                  ? 'bg-green-500/20'
                  : 'bg-transparent'
              }`}>
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-green-500'
                    : 'bg-muted-foreground/50'
                }`} />
              </div>
              
              <span className="relative z-10">{tab.label}</span>
              
              {/* Count badge */}
              {tab.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-green-500/15 text-green-600 border border-green-500/20'
                    : 'bg-muted-foreground/10 text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">
            {activeTab === 'ready' && 'Ready to Send'}
            {activeTab === 'delivered' && 'Delivered Items'}
            {activeTab === 'expired' && 'Expired Items'}
          </CardTitle>
          <CardDescription>
            {activeTab === 'ready' && 'Tap "Send Now" to deliver instantly'}
            {activeTab === 'delivered' && 'Successfully delivered data plans'}
            {activeTab === 'expired' && 'Expired items are automatically refunded'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <IonIcon
                  name={
                    activeTab === 'ready' ? 'archive-outline' :
                    activeTab === 'delivered' ? 'checkmark-circle-outline' :
                    'time-outline'
                  }
                  size="32px"
                  className="text-muted-foreground"
                />
              </div>
              <p className="text-foreground font-medium mb-1">
                {activeTab === 'ready' && 'No Data Parked'}
                {activeTab === 'delivered' && 'No Delivered Items'}
                {activeTab === 'expired' && 'No Expired Items'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {activeTab === 'ready' && 'Park data plans for instant delivery when needed'}
                {activeTab === 'delivered' && 'Delivered items will appear here'}
                {activeTab === 'expired' && 'Expired items are automatically refunded'}
              </p>
              {activeTab === 'ready' && (
                <Link href="/dashboard/buy-data">
                  <Button className="gap-2">
                    <IonIcon name="add-outline" size="16px" />
                    Park Your First Data
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-border rounded-xl p-4 hover:border-green-500/50 transition-smooth"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                        activeTab === 'ready' ? 'bg-green-500/10' :
                        activeTab === 'delivered' ? 'bg-blue-500/10' :
                        'bg-amber-500/10'
                      }`}>
                        <IonIcon 
                          name="wifi-outline" 
                          size="20px" 
                          color={
                            activeTab === 'ready' ? '#22c55e' :
                            activeTab === 'delivered' ? '#3b82f6' :
                            '#f59e0b'
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {item.network} {item.plan_name}
                          </h3>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                            {item.network}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.recipient_phone}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-medium">₦{item.amount.toLocaleString()}</span>
                          <span>•</span>
                          <span>Parked {formatDate(item.purchased_at)}</span>
                          {activeTab === 'ready' && (
                            <>
                              <span>•</span>
                              <span className={new Date(item.expires_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000) ? 'text-amber-500 font-medium' : ''}>
                                {formatTimeRemaining(item.expires_at)}
                              </span>
                            </>
                          )}
                          {activeTab === 'delivered' && item.delivered_at && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">Delivered {formatDate(item.delivered_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {activeTab === 'ready' && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateQR(item)}
                          className="gap-2"
                        >
                          <IonIcon name="qr-code-outline" size="14px" />
                          QR
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeliver(item.id)}
                          disabled={isDelivering === item.id}
                          className="gap-2"
                        >
                          {isDelivering === item.id ? (
                            <>
                              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <IonIcon name="send-outline" size="16px" />
                              Send Now
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Modal */}
      {selectedVault && (
        <VaultQRModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedVault(null);
          }}
          vault={selectedVault}
        />
      )}
    </div>
  );
}