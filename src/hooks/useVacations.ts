import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../services/supabase';
import { Vacation, getVacationsForCircle } from '../services/vacations';

interface UseVacationsResult {
  vacations: Vacation[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useVacations(circleId: string | null): UseVacationsResult {
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVacations = useCallback(async () => {
    if (!circleId) return;
    const { data, error: fetchError } = await getVacationsForCircle(circleId);
    if (fetchError) setError(fetchError);
    else setVacations(data);
    setLoading(false);
  }, [circleId]);

  const fetchRef = useRef(fetchVacations);
  fetchRef.current = fetchVacations;

  useEffect(() => {
    if (circleId) fetchVacations();
  }, [fetchVacations, circleId]);

  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`vacations:${circleId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vacations', filter: `circle_id=eq.${circleId}` },
        () => { fetchRef.current(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circleId]);

  return { vacations, loading, error, refresh: fetchVacations };
}
