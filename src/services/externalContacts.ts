import { supabase } from './supabase';
import { ExternalContact, ExternalContactInput } from '../types/ExternalContact';

export async function getExternalContacts(
  circleId: string,
): Promise<{ data: ExternalContact[]; error: string | null }> {
  const { data, error } = await supabase
    .from('external_contacts')
    .select('*')
    .eq('circle_id', circleId)
    .order('display_name', { ascending: true });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createExternalContact(
  circleId: string,
  input: ExternalContactInput,
): Promise<{ data: ExternalContact | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('external_contacts')
    .insert({ ...input, circle_id: circleId, created_by: user.id })
    .select()
    .single();

  return { data: data ?? null, error: error?.message ?? null };
}

export async function updateExternalContact(
  id: string,
  input: ExternalContactInput,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('external_contacts')
    .update(input)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteExternalContact(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('external_contacts')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
