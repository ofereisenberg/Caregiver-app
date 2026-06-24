import { supabase } from './supabase';
import { Tables } from '../types/database';

type UserProfile = Tables<'user_profile'>;

export async function getProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error: error?.message ?? null };
}

export async function updateDisplayName(userId: string, displayName: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_profile')
    .update({ display_name: displayName })
    .eq('id', userId);
  return { error: error?.message ?? null };
}
