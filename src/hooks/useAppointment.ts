import { useCallback, useEffect, useState } from 'react';

import { Appointment, getAppointment } from '../services/appointments';
import { Task, getTasksForAppointment } from '../services/tasks';

interface UseAppointmentResult {
  appointment: Appointment | null;
  prepTasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAppointment(appointmentId: string): UseAppointmentResult {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [prepTasks, setPrepTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [apptResult, tasksResult] = await Promise.all([
      getAppointment(appointmentId),
      getTasksForAppointment(appointmentId),
    ]);
    if (apptResult.error) setError(apptResult.error);
    else setAppointment(apptResult.data);
    if (!tasksResult.error) setPrepTasks(tasksResult.data);
  }, [appointmentId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [apptResult, tasksResult] = await Promise.all([
        getAppointment(appointmentId),
        getTasksForAppointment(appointmentId),
      ]);
      if (cancelled) return;
      if (apptResult.error) setError(apptResult.error);
      else setAppointment(apptResult.data);
      if (!tasksResult.error) setPrepTasks(tasksResult.data);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [appointmentId]);

  return { appointment, prepTasks, loading, error, refresh };
}
