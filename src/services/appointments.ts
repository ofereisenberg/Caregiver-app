import { supabase } from './supabase';
import { Tables, TablesInsert, TablesUpdate } from '../types/database';

export type Appointment = Tables<'appointments'>;
export type AppointmentInsert = Omit<TablesInsert<'appointments'>, 'created_by'>;
export type AppointmentUpdate = TablesUpdate<'appointments'>;

export async function getAppointmentsForCircle(circleId: string): Promise<{ data: Appointment[]; error: string | null }> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('circle_id', circleId)
    .order('starts_at', { ascending: true });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function getAppointment(id: string): Promise<{ data: Appointment | null; error: string | null }> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error: error?.message ?? null };
}

export async function createAppointment(appt: AppointmentInsert): Promise<{ data: Appointment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...appt, created_by: user.id })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

export async function updateAppointment(id: string, updates: AppointmentUpdate): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteAppointment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
