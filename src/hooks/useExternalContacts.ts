import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../services/supabase';
import { getExternalContacts } from '../services/externalContacts';
import { ExternalContact } from '../types/ExternalContact';

interface UseExternalContactsResult {
  contacts: ExternalContact[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useExternalContacts(circleId: string | null): UseExternalContactsResult {
  const [contacts, setContacts] = useState<ExternalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!circleId) return;
    const { data, error: fetchError } = await getExternalContacts(circleId);
    if (fetchError) setError(fetchError);
    else setContacts(data);
    setLoading(false);
  }, [circleId]);

  const fetchRef = useRef(fetchContacts);
  fetchRef.current = fetchContacts;

  useEffect(() => {
    if (circleId) fetchContacts();
  }, [fetchContacts, circleId]);

  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`external_contacts:${circleId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'external_contacts', filter: `circle_id=eq.${circleId}` },
        () => { fetchRef.current(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circleId]);

  return { contacts, loading, error, refresh: fetchContacts };
}
