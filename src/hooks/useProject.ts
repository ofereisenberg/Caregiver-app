import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from '../services/supabase';
import { getProjectWithChildren, ProjectWithChildren, updateProject } from '../services/projects';
import { completeTask } from '../services/tasks';

interface UseProjectResult {
  project: ProjectWithChildren | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  handleCompleteTask: (taskId: string) => Promise<void>;
}

export function useProject(projectId: string): UseProjectResult {
  const [project, setProject] = useState<ProjectWithChildren | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    const { data, error: fetchError } = await getProjectWithChildren(projectId);
    if (fetchError) setError(fetchError);
    else setProject(data);
    setLoading(false);
  }, [projectId]);

  const fetchRef = useRef(fetchProject);
  fetchRef.current = fetchProject;

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    const suffix = Math.random().toString(36).slice(2);

    const taskChannel = supabase
      .channel(`project-tasks:${projectId}:${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        () => { fetchRef.current(); },
      )
      .subscribe();

    const apptChannel = supabase
      .channel(`project-appts:${projectId}:${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `project_id=eq.${projectId}` },
        () => { fetchRef.current(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(apptChannel);
    };
  }, [projectId]);

  const handleCompleteTask = useCallback(async (taskId: string) => {
    // Optimistic: mark task complete locally
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) => t.id === taskId ? { ...t, completed: true } : t),
      };
    });

    const { error: completeError } = await completeTask(taskId);
    if (completeError) {
      fetchRef.current();
      return;
    }

    // Auto-transition: not_started → in_progress when first task completes
    const current = project;
    if (current && current.status === 'not_started') {
      await updateProject(projectId, { status: 'in_progress' });
      await fetchRef.current();
      return;
    }

    // Check if all children are done/past — prompt to mark project done
    const refreshed = await getProjectWithChildren(projectId);
    if (!refreshed.data) return;

    setProject(refreshed.data);

    if (refreshed.data.status === 'in_progress') {
      const allTasksDone = refreshed.data.tasks.every((t) => t.completed);
      const allApptsPast = refreshed.data.appointments.every(
        (a) => new Date(a.starts_at) < new Date(),
      );
      if (allTasksDone && allApptsPast) {
        Alert.alert(
          'All done?',
          'All tasks and appointments in this project are complete. Mark the project as done?',
          [
            { text: 'Not yet', style: 'cancel' },
            {
              text: 'Mark done',
              onPress: async () => {
                await updateProject(projectId, { status: 'done' });
                await fetchRef.current();
              },
            },
          ],
        );
      }
    }
  }, [project, projectId]);

  // Auto-transition: check if any appointment has passed and project is not_started
  useEffect(() => {
    if (!project || project.status !== 'not_started') return;
    const anyPast = project.appointments.some((a) => new Date(a.starts_at) < new Date());
    if (anyPast) {
      updateProject(projectId, { status: 'in_progress' }).then(() => fetchRef.current());
    }
  }, [project, projectId]);

  return { project, loading, error, refresh: fetchProject, handleCompleteTask };
}
