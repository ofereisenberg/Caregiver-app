import { ExternalContact } from './ExternalContact';

export type PersonSelection =
  | { type: 'user'; id: string }
  | { type: 'external'; id: string }
  | null;

export function personSelectionFromTask(
  assignee: string | null,
  externalAssigneeId: string | null,
): PersonSelection {
  if (assignee) return { type: 'user', id: assignee };
  if (externalAssigneeId) return { type: 'external', id: externalAssigneeId };
  return null;
}

export function personSelectionToTaskFields(
  sel: PersonSelection,
): { assignee: string | null; external_assignee_id: string | null } {
  if (!sel) return { assignee: null, external_assignee_id: null };
  if (sel.type === 'user') return { assignee: sel.id, external_assignee_id: null };
  return { assignee: null, external_assignee_id: sel.id };
}

export function personSelectionToProjectFields(
  sel: PersonSelection,
): { owner: string | null; external_owner_id: string | null } {
  if (!sel) return { owner: null, external_owner_id: null };
  if (sel.type === 'user') return { owner: sel.id, external_owner_id: null };
  return { owner: null, external_owner_id: sel.id };
}

export function personSelectionFromProject(
  owner: string | null,
  externalOwnerId: string | null,
): PersonSelection {
  if (owner) return { type: 'user', id: owner };
  if (externalOwnerId) return { type: 'external', id: externalOwnerId };
  return null;
}

export function resolvePersonName(
  sel: PersonSelection,
  members: { user_id: string; displayName: string }[],
  contacts: ExternalContact[],
): string {
  if (!sel) return 'Unassigned';
  if (sel.type === 'user') return members.find((m) => m.user_id === sel.id)?.displayName ?? 'Unknown';
  return contacts.find((c) => c.id === sel.id)?.display_name ?? 'Unknown';
}
