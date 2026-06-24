import { useCallback, useEffect, useState } from 'react';

import { getTask, Task } from '../services/tasks';

interface UseTaskResult {
  task: Task | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTask(taskId: string): UseTaskResult {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await getTask(taskId);
    if (fetchError) setError(fetchError);
    else setTask(data);
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await getTask(taskId);
      if (cancelled) return;
      if (fetchError) setError(fetchError);
      else setTask(data);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [taskId]);

  return { task, loading, error, refresh };
}
