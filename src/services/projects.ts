import { supabase } from './supabase';
import { Tables, TablesInsert, TablesUpdate } from '../types/database';
import { Task } from './tasks';
import { Appointment } from './appointments';

export type Project = Tables<'projects'>;
export type ProjectInsert = Omit<TablesInsert<'projects'>, 'created_by'>;
export type ProjectUpdate = TablesUpdate<'projects'>;

export interface ProjectWithChildren extends Project {
  tasks: Task[];
  appointments: Appointment[];
}

export async function getProjectsForCircle(circleId: string): Promise<{ data: Project[]; error: string | null }> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function getProject(id: string): Promise<{ data: Project | null; error: string | null }> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error: error?.message ?? null };
}

export async function getProjectWithChildren(id: string): Promise<{ data: ProjectWithChildren | null; error: string | null }> {
  const [projectResult, tasksResult, apptResult] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('tasks').select('*').eq('project_id', id).order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('appointments').select('*').eq('project_id', id).order('starts_at', { ascending: true }),
  ]);

  if (projectResult.error) return { data: null, error: projectResult.error.message };

  return {
    data: {
      ...projectResult.data,
      tasks: tasksResult.data ?? [],
      appointments: apptResult.data ?? [],
    },
    error: null,
  };
}

export async function createProject(project: ProjectInsert): Promise<{ data: Project | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, created_by: user.id })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

export async function updateProject(id: string, updates: ProjectUpdate): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteProject(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteProjectAndItems(id: string): Promise<{ error: string | null }> {
  // Delete linked items first — if we delete the project first, ON DELETE SET NULL
  // clears project_id before our deletes run and they'd match 0 rows.
  const [taskResult, apptResult] = await Promise.all([
    supabase.from('tasks').delete().eq('project_id', id),
    supabase.from('appointments').delete().eq('project_id', id),
  ]);

  if (taskResult.error) return { error: taskResult.error.message };
  if (apptResult.error) return { error: apptResult.error.message };

  const { error } = await supabase.from('projects').delete().eq('id', id);
  return { error: error?.message ?? null };
}
