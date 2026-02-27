import { useState, useCallback } from 'react';
import useSWR from 'swr';

interface VaultItem {
  id: string;
  network: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  recipient_phone: string;
  status: 'ready' | 'delivered' | 'expired' | 'refunded';
  purchased_at: string;
  delivered_at?: string;
  expires_at: string;
  delivery_reference?: string;
}

interface VaultStats {
  totalParked: number;
  totalDelivered: number;
  readyCount: number;
  deliveredCount: number;
  expiredCount: number;
}

interface VaultData {
  ready: VaultItem[];
  delivered: VaultItem[];
  expired: VaultItem[];
  stats: VaultStats;
}

const ITEMS_PER_PAGE = 20;

export function useDataVault(userId?: string) {
  const [isParking, setIsParking] = useState(false);
  const [isDelivering, setIsDelivering] = useState<string | null>(null);
  const [readyPage, setReadyPage] = useState(0);
  const [deliveredPage, setDeliveredPage] = useState(0);
  const [expiredPage, setExpiredPage] = useState(0);

  // Fetch vault data with pagination
  const { data, error, mutate } = useSWR<{ status: boolean; data: VaultData }>(
    userId ? `/api/data-vault/list?userId=${userId}&limit=${ITEMS_PER_PAGE}` : null,
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch vault data');
      }
      return response.json();
    },
    {
      refreshInterval: 60000, // Refresh every 60 seconds (reduced from 30s)
      revalidateOnFocus: true,
      dedupingInterval: 30000, // Prevent duplicate requests within 30s
    }
  );

  const vaultData = data?.data;
  const loading = !data && !error;

  // Park data function
  const parkData = useCallback(async (params: {
    network: string;
    phone: string;
    planId: string;
    amount: number;
    planName: string;
    userId: string;
    pin: string;
  }) => {
    setIsParking(true);
    try {
      const response = await fetch('/api/data-vault/park', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (result.status) {
        // Refresh vault data immediately
        await mutate();
      }

      return result;
    } catch (error) {
      console.error('Park data error:', error);
      return {
        status: false,
        message: 'Network error. Please try again.',
      };
    } finally {
      setIsParking(false);
    }
  }, [mutate]);

  // Deliver data function
  const deliverData = useCallback(async (vaultId: string, userId: string) => {
    setIsDelivering(vaultId);
    try {
      const response = await fetch('/api/data-vault/deliver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vaultId, userId }),
      });

      const result = await response.json();

      if (result.status) {
        // Refresh vault data immediately
        await mutate();
      }

      return result;
    } catch (error) {
      console.error('Deliver data error:', error);
      return {
        status: false,
        message: 'Network error. Please try again.',
      };
    } finally {
      setIsDelivering(null);
    }
  }, [mutate]);

  // Refund data function
  const refundData = useCallback(async (vaultId: string, userId: string) => {
    try {
      const response = await fetch('/api/data-vault/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vaultId, userId }),
      });

      const result = await response.json();

      if (result.status) {
        // Refresh vault data immediately
        await mutate();
      }

      return result;
    } catch (error) {
      console.error('Refund data error:', error);
      return {
        status: false,
        message: 'Network error. Please try again.',
      };
    }
  }, [mutate]);

  return {
    vaultData,
    loading,
    error,
    isParking,
    isDelivering,
    parkData,
    deliverData,
    refundData,
    refresh: mutate,
    pagination: {
      readyPage,
      setReadyPage,
      deliveredPage,
      setDeliveredPage,
      expiredPage,
      setExpiredPage,
      itemsPerPage: ITEMS_PER_PAGE,
    },
  };
}