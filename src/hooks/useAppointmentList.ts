import { useCallback, useEffect, useState } from 'react';

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

  useEffect(() => {
    if (circleId) fetchAppointments();
  }, [fetchAppointments, circleId]);

  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`appointments:circle:${circleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `circle_id=eq.${circleId}` },
        () => { fetchAppointments(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circleId, fetchAppointments]);

  return { appointments, loading, error, refresh: fetchAppointments };
}
