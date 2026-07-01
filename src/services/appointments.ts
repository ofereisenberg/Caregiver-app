import { supabase } from './supabase';
import { Tables, TablesInsert, TablesUpdate } from '../types/database';

export type Appointment = Tables<'appointments'>;
export type AppointmentInsert = Omit<TablesInsert<'appointments'>, 'created_by'>;
export type AppointmentUpdate = TablesUpdate<'appointments'>;

export type AppointmentWithInvitees = Appointment & { invitee_ids: string[] };

export async function getAppointmentsForCircle(circleId: string): Promise<{ data: AppointmentWithInvitees[]; error: string | null }> {
  const { data: appts, error: apptErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('circle_id', circleId)
    .order('starts_at', { ascending: true });

  if (apptErr) return { data: [], error: apptErr.message };
  if (!appts || appts.length === 0) return { data: [], error: null };

  const { data: invitees } = await supabase
    .from('appointment_invitees')
    .select('appointment_id, user_id')
    .in('appointment_id', appts.map((a) => a.id));

  const inviteeMap = new Map<string, string[]>();
  (invitees ?? []).forEach(({ appointment_id, user_id }) => {
    if (!inviteeMap.has(appointment_id)) inviteeMap.set(appointment_id, []);
    inviteeMap.get(appointment_id)!.push(user_id);
  });

  return {
    data: appts.map((a) => ({ ...a, invitee_ids: inviteeMap.get(a.id) ?? [] })),
    error: null,
  };
}

export async function getAppointment(id: string): Promise<{ data: AppointmentWithInvitees | null; error: string | null }> {
  const [apptResult, inviteesResult] = await Promise.all([
    supabase.from('appointments').select('*').eq('id', id).single(),
    supabase.from('appointment_invitees').select('user_id').eq('appointment_id', id),
  ]);

  if (apptResult.error) return { data: null, error: apptResult.error.message };

  return {
    data: {
      ...apptResult.data,
      invitee_ids: (inviteesResult.data ?? []).map((r) => r.user_id),
    },
    error: null,
  };
}

async function setInvitees(appointmentId: string, userIds: string[]): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase
    .from('appointment_invitees')
    .delete()
    .eq('appointment_id', appointmentId);
  if (deleteError) return { error: deleteError.message };

  if (userIds.length === 0) return { error: null };

  const { error: insertError } = await supabase
    .from('appointment_invitees')
    .insert(userIds.map((user_id) => ({ appointment_id: appointmentId, user_id })));

  return { error: insertError?.message ?? null };
}

export async function createAppointment(
  appt: AppointmentInsert,
  inviteeIds: string[] = [],
): Promise<{ data: Appointment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...appt, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  if (inviteeIds.length > 0) await setInvitees(data.id, inviteeIds);

  return { data, error: null };
}

export async function updateAppointment(
  id: string,
  updates: AppointmentUpdate,
  inviteeIds?: string[],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) return { error: error.message };
  if (inviteeIds !== undefined) await setInvitees(id, inviteeIds);

  return { error: null };
}

export async function deleteAppointment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
