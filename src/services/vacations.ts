import { supabase } from './supabase';
import { Tables, TablesInsert, TablesUpdate } from '../types/database';

export type Vacation = Tables<'vacations'>;
export type VacationInsert = Omit<TablesInsert<'vacations'>, 'created_at'>;
export type VacationUpdate = TablesUpdate<'vacations'>;

export async function getVacationsForCircle(
  circleId: string,
): Promise<{ data: Vacation[]; error: string | null }> {
  const { data, error } = await supabase
    .from('vacations')
    .select('*')
    .eq('circle_id', circleId)
    .order('start_date', { ascending: true });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createVacation(
  vacation: Omit<VacationInsert, 'user_id'>,
): Promise<{ data: Vacation | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('vacations')
    .insert({ ...vacation, user_id: user.id })
    .select()
    .single();

  return { data: data ?? null, error: error?.message ?? null };
}

export async function updateVacation(
  id: string,
  updates: VacationUpdate,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vacations')
    .update(updates)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteVacation(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vacations')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
