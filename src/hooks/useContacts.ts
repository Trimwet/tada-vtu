import { useState, useCallback } from 'react';
import useSWR from 'swr';

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  network?: string;
  dob?: string;
  created_at: string;
}

export function useContacts(userId?: string) {
  const { data, error, mutate } = useSWR<{ status: boolean; data: Contact[] }>(
    userId ? `/api/contacts?userId=${userId}` : null,
    async (url: string) => {
      const response = await fetch(url);
      const result = await response.json();
      return result;
    }
  );

  const [isSaving, setIsSaving] = useState(false);

  const saveContact = useCallback(async (contact: Partial<Contact>) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contact, userId }),
      });
      const result = await response.json();
      if (result.status) mutate();
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [userId, mutate]);

  const deleteContact = useCallback(async (contactId: string) => {
    try {
      const response = await fetch(`/api/contacts?id=${contactId}&userId=${userId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.status) mutate();
      return result;
    } catch (err) {
      return { status: false, message: 'Failed to delete contact' };
    }
  }, [userId, mutate]);

  return {
    contacts: data?.data || [],
    loading: !data && !error,
    saveContact,
    deleteContact,
    refresh: mutate,
    isSaving
  };
}
