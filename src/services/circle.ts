import { supabase } from './supabase';
import { Tables } from '../types/database';

type CareCircle = Tables<'care_circle'>;
type CircleMember = Tables<'care_circle_member'>;
type CircleInvite = Tables<'circle_invites'>;

export type CircleMemberWithName = CircleMember & { displayName: string };

export async function getUserCircles(userId: string): Promise<{ data: CareCircle[]; error: string | null }> {
  const { data: members, error: memberError } = await supabase
    .from('care_circle_member')
    .select('circle_id')
    .eq('user_id', userId);

  if (memberError || !members?.length) return { data: [], error: memberError?.message ?? null };

  const circleIds = members.map((m) => m.circle_id);
  const { data: circles, error: circleError } = await supabase
    .from('care_circle')
    .select('*')
    .in('id', circleIds);

  return { data: circles ?? [], error: circleError?.message ?? null };
}

export async function setActiveCircle(userId: string, circleId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_profile')
    .update({ active_circle_id: circleId })
    .eq('id', userId);
  return { error: error?.message ?? null };
}

export async function getUserCircle(userId: string): Promise<{ data: CareCircle | null; error: string | null }> {
  const { data: member, error: memberError } = await supabase
    .from('care_circle_member')
    .select('circle_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError) return { data: null, error: memberError.message };
  if (!member) return { data: null, error: null };

  const { data: circle, error: circleError } = await supabase
    .from('care_circle')
    .select('*')
    .eq('id', member.circle_id)
    .single();

  return { data: circle, error: circleError?.message ?? null };
}

export async function createCareCircle(name: string): Promise<{ data: CareCircle | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_care_circle', { p_name: name });
  return { data: data ?? null, error: error?.message ?? null };
}

export async function joinCircleWithToken(token: string): Promise<{ data: CareCircle | null; error: string | null }> {
  const { data: invite, error: inviteError } = await supabase
    .from('circle_invites')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (inviteError || !invite) {
    return { data: null, error: 'Invalid or expired invite code.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated.' };

  const { error: memberError } = await supabase
    .from('care_circle_member')
    .insert({ circle_id: invite.circle_id, user_id: user.id, role: 'member' });

  if (memberError) return { data: null, error: memberError.message };

  await supabase
    .from('circle_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id);

  const { data: circle, error: circleError } = await supabase
    .from('care_circle')
    .select('*')
    .eq('id', invite.circle_id)
    .single();

  return { data: circle, error: circleError?.message ?? null };
}

export async function getCircleMembers(circleId: string): Promise<{ data: CircleMemberWithName[]; error: string | null }> {
  const { data: members, error } = await supabase
    .from('care_circle_member')
    .select('*')
    .eq('circle_id', circleId);

  if (error || !members) return { data: [], error: error?.message ?? null };

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from('user_profile')
    .select('id, display_name')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return {
    data: members.map((m) => ({ ...m, displayName: profileMap.get(m.user_id) ?? '' })),
    error: null,
  };
}

export async function createInvite(circleId: string): Promise<{ data: CircleInvite | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated.' };

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('circle_invites')
    .insert({ circle_id: circleId, token, created_by: user.id, expires_at: expiresAt.toISOString() })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

export async function getActiveInvite(circleId: string): Promise<{ data: CircleInvite | null; error: string | null }> {
  const { data, error } = await supabase
    .from('circle_invites')
    .select('*')
    .eq('circle_id', circleId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error: error?.message ?? null };
}

// 8-char code using unambiguous characters (no 0/O, 1/I)
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
