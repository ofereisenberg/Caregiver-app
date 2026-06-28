import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '../services/supabase';
import {
  addProjectNote,
  deleteProjectNote,
  getProjectNotes,
  ProjectNote,
} from '../services/projectNotes';

interface UseProjectNotesResult {
  notes: ProjectNote[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addNote: (content: string) => Promise<string | null>;
  removeNote: (noteId: string) => Promise<void>;
}

export function useProjectNotes(
  projectId: string,
  circleId: string | null,
  userId: string | null,
): UseProjectNotesResult {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data, error: fetchError } = await getProjectNotes(projectId);
    setNotes(data);
    setError(fetchError);
    setLoading(false);
  }, [projectId, circleId]);

  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!circleId) return;
    const suffix = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`project-notes:${projectId}:${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_notes', filter: `project_id=eq.${projectId}` },
        () => { fetchRef.current(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, circleId]);

  const addNote = useCallback(async (content: string): Promise<string | null> => {
    if (!circleId || !userId) return 'Not in a circle';
    const { error: addError } = await addProjectNote(projectId, circleId, content, userId);
    if (addError) return addError;
    await fetchRef.current();
    return null;
  }, [projectId, circleId, userId]);

  const removeNote = useCallback(async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    const { error: delError } = await deleteProjectNote(noteId);
    if (delError) await fetchRef.current();
  }, []);

  return { notes, loading, error, refresh: fetch, addNote, removeNote };
}
