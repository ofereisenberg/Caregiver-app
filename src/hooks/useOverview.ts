import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../services/supabase';
import { completeTask, getCompletedTasksForCircle, getTasksForCircle, Task } from '../services/tasks';
import { Appointment, getAppointmentsForCircle } from '../services/appointments';
import { groupOverviewIntoSections, OverviewItem, OverviewSection } from '../utils/overviewGrouping';

interface UseOverviewResult {
  sections: OverviewSection[];
  loading: boolean;
  error: string | null;
  handleComplete: (taskId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useOverview(
  circleId: string | null,
  filter: 'all' | 'mine' | 'done',
  currentUserId?: string,
): UseOverviewResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!circleId) return;
    if (filter === 'done') {
      const { data, error: err } = await getCompletedTasksForCircle(circleId);
      if (err) setError(err);
      else { setTasks(data); setAppointments([]); }
    } else {
      const [taskResult, apptResult] = await Promise.all([
        getTasksForCircle(circleId),
        getAppointmentsForCircle(circleId),
      ]);
      if (taskResult.error) setError(taskResult.error);
      else if (apptResult.error) setError(apptResult.error);
      else {
        setTasks(taskResult.data);
        setAppointments(apptResult.data);
      }
    }
    setLoading(false);
  }, [circleId, filter]);

  const fetchRef = useRef(fetchAll);
  fetchRef.current = fetchAll;

  useEffect(() => {
    if (circleId) fetchAll();
  }, [fetchAll, circleId]);

  // Realtime — tasks
  useEffect(() => {
    if (!circleId) return;
    const channel = supabase
      .channel(`overview-tasks:${circleId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `circle_id=eq.${circleId}` }, () => fetchRef.current())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circleId]);

  // Realtime — appointments
  useEffect(() => {
    if (!circleId) return;
    const channel = supabase
      .channel(`overview-appts:${circleId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `circle_id=eq.${circleId}` }, () => fetchRef.current())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circleId]);

  const handleComplete = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const { error: err } = await completeTask(taskId);
    if (err) fetchAll();
  }, [fetchAll]);

  const visibleTasks = filter === 'mine'
    ? tasks.filter(t => currentUserId ? t.assignee === currentUserId : false)
    : tasks;

  const visibleAppointments = filter === 'mine' ? [] : appointments;

  const sections: OverviewSection[] = filter === 'done'
    ? (visibleTasks.length > 0
        ? [{ key: 'done' as const, title: 'Completed', count: visibleTasks.length, data: visibleTasks.map(t => ({ kind: 'task' as const, data: t })) }]
        : [])
    : groupOverviewIntoSections(visibleTasks, visibleAppointments);

  return { sections, loading, error, handleComplete, refresh: fetchAll };
}
