import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../services/supabase';
import { Appointment, getAppointmentsForCircle } from '../services/appointments';

interface UseAppointmentListResult {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAppointmentList(circleId: string | null): UseAppointmentListResult {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!circleId) return;
    const { data, error: fetchError } = await getAppointmentsForCircle(circleId);
    if (fetchError) setError(fetchError);
    else setAppointments(data);
    setLoading(false);
  }, [circleId]);

  // Always point to the latest fetchAppointments without triggering subscription re-runs
  const fetchRef = useRef(fetchAppointments);
  fetchRef.current = fetchAppointments;

  useEffect(() => {
    if (circleId) fetchAppointments();
  }, [fetchAppointments, circleId]);

  // Unique suffix per invocation avoids StrictMode double-mount collision.
  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`appointments:${circleId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `circle_id=eq.${circleId}` },
        () => { fetchRef.current(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circleId]); // fetchRef is stable — intentionally omitted from deps

  return { appointments, loading, error, refresh: fetchAppointments };
}
