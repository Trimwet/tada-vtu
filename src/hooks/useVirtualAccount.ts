import { useState, useEffect, useCallback } from 'react';
import { useSupabaseUser } from './useSupabaseUser';

interface VirtualAccount {
  account_number: string;
  bank_name: string;
  account_name: string;
  created_at?: string;
  is_temporary?: boolean;
  amount?: string;
  expiry_date?: string;
}

interface TempAccount {
  account_number: string;
  bank_name: string;
  account_name: string;
  amount: string;
  expiry_date: string;
  is_temporary: true;
}

export function useVirtualAccount() {
  const { user } = useSupabaseUser();
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [tempAccount, setTempAccount] = useState<TempAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingTemp, setCreatingTemp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing virtual account
  const fetchVirtualAccount = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/flutterwave/virtual-account', {
        headers: {
          'x-user-id': user.id,
        },
      });

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setVirtualAccount(result.data);
      } else {
        setVirtualAccount(null);
      }
    } catch (err) {
      console.error('Failed to fetch virtual account:', err);
      setError('Failed to load virtual account');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Create virtual account
  const createVirtualAccount = useCallback(async (bvn?: string) => {
    if (!user?.id || !user?.email) {
      setError('Please login to create a virtual account');
      return null;
    }

    try {
      setCreating(true);
      setError(null);

      // Parse name into first and last
      const nameParts = (user.full_name || 'TADA User').split(' ');
      const firstname = nameParts[0] || 'TADA';
      const lastname = nameParts.slice(1).join(' ') || 'User';

      console.log('Creating virtual account with:', { user_id: user.id, email: user.email, bvn: bvn ? '***' : 'none' });

      const response = await fetch('/api/flutterwave/virtual-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          phone: user.phone_number,
          firstname,
          lastname,
          bvn,
          account_type: 'permanent',
        }),
      });

      const result = await response.json();
      console.log('Virtual account API response:', result);

      if (result.status === 'success' && result.data) {
        setVirtualAccount(result.data);
        return result.data;
      } else {
        const errorMsg = result.message || result.details?.message || 'Failed to create virtual account';
        console.error('Virtual account creation failed:', errorMsg);
        setError(errorMsg);
        return null;
      }
    } catch (err) {
      console.error('Failed to create virtual account:', err);
      setError('Failed to create virtual account');
      return null;
    } finally {
      setCreating(false);
    }
  }, [user]);

  // Create temporary account (no BVN required)
  const createTempAccount = useCallback(async (amount: number) => {
    if (!user?.id || !user?.email) {
      setError('Please login to create a temporary account');
      return null;
    }

    if (amount < 100) {
      setError('Minimum amount is ₦100');
      return null;
    }

    try {
      setCreatingTemp(true);
      setError(null);

      const nameParts = (user.full_name || 'TADA User').split(' ');
      const firstname = nameParts[0] || 'TADA';
      const lastname = nameParts.slice(1).join(' ') || 'User';

      console.log('Creating temp account for amount:', amount);

      const response = await fetch('/api/flutterwave/virtual-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          phone: user.phone_number,
          firstname,
          lastname,
          amount,
          account_type: 'temporary',
        }),
      });

      const result = await response.json();
      console.log('Temp account API response:', result);

      if (result.status === 'success' && result.data) {
        setTempAccount(result.data as TempAccount);
        return result.data;
      } else {
        const errorMsg = result.message || 'Failed to create temporary account';
        console.error('Temp account creation failed:', errorMsg);
        setError(errorMsg);
        return null;
      }
    } catch (err) {
      console.error('Failed to create temp account:', err);
      setError('Failed to create temporary account');
      return null;
    } finally {
      setCreatingTemp(false);
    }
  }, [user]);

  // Clear temp account
  const clearTempAccount = useCallback(() => {
    setTempAccount(null);
  }, []);

  // Copy account number to clipboard
  const copyAccountNumber = useCallback(async () => {
    if (!virtualAccount?.account_number) return false;
    
    try {
      await navigator.clipboard.writeText(virtualAccount.account_number);
      return true;
    } catch {
      return false;
    }
  }, [virtualAccount?.account_number]);

  // Fetch on mount
  useEffect(() => {
    fetchVirtualAccount();
  }, [fetchVirtualAccount]);

  return {
    virtualAccount,
    tempAccount,
    loading,
    creating,
    creatingTemp,
    error,
    createVirtualAccount,
    createTempAccount,
    clearTempAccount,
    copyAccountNumber,
    refetch: fetchVirtualAccount,
  };
}
