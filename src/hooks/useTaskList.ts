import { useCallback, useEffect, useState } from 'react';

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

  useEffect(() => {
    if (circleId) fetchTasks();
  }, [fetchTasks, circleId]);

  // Realtime subscription — re-fetch on any change to the circle's tasks
  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`tasks:circle:${circleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `circle_id=eq.${circleId}` },
        () => { fetchTasks(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circleId, fetchTasks]);

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
