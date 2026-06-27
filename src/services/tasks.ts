import { supabase } from './supabase';
import { Tables, TablesInsert, TablesUpdate } from '../types/database';

export type Task = Tables<'tasks'>;
export type TaskInsert = Omit<TablesInsert<'tasks'>, 'created_by'>;
export type TaskUpdate = TablesUpdate<'tasks'>;

export async function getTask(id: string): Promise<{ data: Task | null; error: string | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error: error?.message ?? null };
}

export async function getTasksForCircle(circleId: string): Promise<{ data: Task[]; error: string | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('circle_id', circleId)
    .eq('completed', false)
    .order('due_date', { ascending: true, nullsFirst: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createTask(task: TaskInsert): Promise<{ data: Task | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, created_by: user.id })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

export async function updateTask(id: string, updates: TaskUpdate): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function completeTask(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tasks')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function getCompletedTasksForCircle(circleId: string): Promise<{ data: Task[]; error: string | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('circle_id', circleId)
    .eq('completed', true)
    .order('completed_at', { ascending: false, nullsFirst: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function getTasksForAppointment(appointmentId: string): Promise<{ data: Task[]; error: string | null }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('parent_appointment_id', appointmentId)
    .order('created_at', { ascending: true });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function deleteTask(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
