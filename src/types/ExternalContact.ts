export interface ExternalContact {
  id: string;
  circle_id: string;
  display_name: string;
  email: string | null;
  notes: string | null;
  linked_user_id: string | null;
  created_by: string;
  created_at: string;
}

export interface ExternalContactInput {
  display_name: string;
  email: string | null;
  notes: string | null;
}
