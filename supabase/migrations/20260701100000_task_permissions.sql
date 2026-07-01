-- Relax task UPDATE: any circle member can edit shared tasks (not just creator/assignee).
-- Private tasks remain creator-only (enforced via visibility check).
-- Delete: creator or circle admin only.

DROP POLICY IF EXISTS tasks_update ON tasks;
DROP POLICY IF EXISTS tasks_delete ON tasks;

CREATE POLICY tasks_update ON tasks
  FOR UPDATE
  USING (is_circle_member(circle_id) AND (visibility = 'shared' OR created_by = auth.uid()))
  WITH CHECK (is_circle_member(circle_id) AND (visibility = 'shared' OR created_by = auth.uid()));

CREATE POLICY tasks_delete ON tasks
  FOR DELETE
  USING (created_by = auth.uid() OR is_circle_admin(circle_id));
