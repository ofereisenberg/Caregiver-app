import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../services/supabase';
import { getProjectsForCircle, Project } from '../services/projects';

interface UseProjectListResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjectList(circleId: string | null): UseProjectListResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!circleId) return;
    const { data, error: fetchError } = await getProjectsForCircle(circleId);
    if (fetchError) setError(fetchError);
    else setProjects(data);
    setLoading(false);
  }, [circleId]);

  const fetchRef = useRef(fetchProjects);
  fetchRef.current = fetchProjects;

  useEffect(() => {
    if (circleId) fetchProjects();
  }, [fetchProjects, circleId]);

  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`projects:${circleId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `circle_id=eq.${circleId}` },
        () => { fetchRef.current(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circleId]);

  return { projects, loading, error, refresh: fetchProjects };
}
