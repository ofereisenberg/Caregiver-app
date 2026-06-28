import { supabase } from './supabase';
import { Tables } from '../types/database';

export type ProjectNote = Tables<'project_notes'>;

export async function getProjectNotes(projectId: string): Promise<{ data: ProjectNote[]; error: string | null }> {
  const { data, error } = await supabase
    .from('project_notes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

export async function addProjectNote(
  projectId: string,
  circleId: string,
  content: string,
  createdBy: string,
): Promise<{ data: ProjectNote | null; error: string | null }> {
  const { data, error } = await supabase
    .from('project_notes')
    .insert({ project_id: projectId, circle_id: circleId, content, created_by: createdBy })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function deleteProjectNote(noteId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('project_notes')
    .delete()
    .eq('id', noteId);

  if (error) return { error: error.message };
  return { error: null };
}
