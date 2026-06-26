import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../services/supabase';
import { completeTask, getTasksForCircle, Task } from '../services/tasks';
import { groupTasksIntoSections, TaskSection } from '../utils/taskGrouping';

interface UseTaskListResult {
  sections: TaskSection[];
  loading: boolean;
  error: string | null;
  handleComplete: (taskId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTaskList(
  circleId: string | null,
  filter: 'all' | 'mine',
  currentUserId: string,
): UseTaskListResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!circleId) return;
    const { data, error: fetchError } = await getTasksForCircle(circleId);
    if (fetchError) setError(fetchError);
    else setTasks(data);
    setLoading(false);
  }, [circleId]);

  // Always point to the latest fetchTasks without triggering subscription re-runs
  const fetchRef = useRef(fetchTasks);
  fetchRef.current = fetchTasks;

  useEffect(() => {
    if (circleId) fetchTasks();
  }, [fetchTasks, circleId]);

  // Realtime subscription — re-fetch on any change to the circle's tasks.
  // Unique suffix per invocation avoids StrictMode double-mount collision
  // (same channel name + already-subscribed → Supabase throws on .on()).
  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`tasks:${circleId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `circle_id=eq.${circleId}` },
        () => { fetchRef.current(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circleId]); // fetchRef is stable — intentionally omitted from deps

  const handleComplete = useCallback(async (taskId: string) => {
    // Optimistic: remove from list immediately
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    const { error: completeError } = await completeTask(taskId);
    if (completeError) {
      // Reconcile on failure by re-fetching
      fetchTasks();
    }
  }, [fetchTasks]);

  const visibleTasks = filter === 'mine'
    ? tasks.filter((t) => t.assignee === currentUserId)
    : tasks;

  const sections = groupTasksIntoSections(visibleTasks);

  return { sections, loading, error, handleComplete, refresh: fetchTasks };
}
