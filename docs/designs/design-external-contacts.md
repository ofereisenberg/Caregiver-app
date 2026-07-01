# External Contacts
**Feature:** External Contacts — assignable people without app accounts
**Status:** M1 in progress
**Last updated:** 2026-07-01

---

## Problem

The care circle needs to assign tasks and appointments to people who are not (and may never be) app users — a Pflegedienst nurse, Dr. Müller, a cleaning service. Currently `assignee` only accepts circle members with accounts.

---

## Design

### Core concept

External contacts are named people managed per care circle. They can be assigned to tasks, added as appointment invitees, and set as project owners — exactly like circle members, but with no login and no push token. They are distinguished in the UI by a distinct warm clay color (vs. sage green for circle members).

### Elevation path

An external contact can later be promoted to a full circle member. The data model anticipates this from day one:
- `email` — optional field stored on creation; used to match the person when they join via invite
- `linked_user_id` — populated on elevation; once set, tasks/appointments can be migrated from the external contact reference to the user FK in one SQL sweep

No elevation logic is built in M1 or M2 — the columns are just scaffolded so the migration will be clean.

---

## Data Model

### `external_contacts` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `circle_id` | uuid FK → care_circle | Scoped per circle |
| `display_name` | text NOT NULL | Full name or role ("Dr. Müller", "Pflegedienst Nord") |
| `email` | text nullable | Optional; used to match on elevation (M3) |
| `notes` | text nullable | Free text ("available Mon/Wed", phone number) |
| `linked_user_id` | uuid nullable FK → user_profile | Populated on elevation (M3); dormant in M1/M2 |
| `created_by` | uuid FK → user_profile | |
| `created_at` | timestamptz | |

### Changes to existing tables (M2)

| Table | Change |
|---|---|
| `tasks` | Add `external_assignee_id uuid nullable FK → external_contacts`; check constraint: at most one of `(assignee, external_assignee_id)` non-null |
| `appointment_invitees` equivalent | New join table `appointment_external_invitees (appointment_id, external_contact_id)` — no mutual-exclusion constraint (multiple invitees of both types is fine) |
| `projects` | Add `external_owner_id uuid nullable FK → external_contacts`; check constraint: at most one of `(owner, external_owner_id)` non-null |

### RLS on `external_contacts`

| Operation | Policy |
|---|---|
| SELECT | `is_circle_member(circle_id)` |
| INSERT | `is_circle_member(circle_id) AND auth.uid() = created_by` |
| UPDATE | `is_circle_member(circle_id)` — any member can edit contacts |
| DELETE | `created_by = auth.uid() OR is_circle_admin(circle_id)` |

---

## UI

### Color treatment

External contacts use a warm clay palette to distinguish them from circle members (sage green):

| Token | Value | Usage |
|---|---|---|
| `externalBg` | `#ede4de` | Chip selected background, avatar background |
| `externalFg` | `#7a4f3a` | Chip selected text, avatar text |

External contacts chips: same shape/size as circle member chips, clay tint when selected, "External" section label above them in the picker.

### Surfaces affected (M2)

- **Add/Edit Task** → Assign row: unified list of circle members (first) then external contacts (below a divider), single select
- **Add/Edit Appointment** → With row: unified multi-select list, same grouping
- **Add/Edit Project** → Owner row: unified list, single select
- **Task cards / detail screens** → Display external contact name with a small clay-colored "Ext" badge or just the name in clay text

### Notification behavior

External contacts have no push token and no account. When an external is the assignee:
- No push notification is sent
- The notification logic skips rows where the assignee resolves to an external contact (no change needed until M2)

---

## Milestones

### M1 — External contacts CRUD (this session)
- `external_contacts` table + RLS migration
- Service, hook
- `AddEditExternalContactScreen` (create, edit, delete)
- `CircleAdminScreen` extended: "External Contacts" section below Members

### M2 — Extend assignee pickers
- Add `external_assignee_id` to `tasks`
- Add `appointment_external_invitees` join table
- Add `external_owner_id` to `projects`
- Update all assignee/invitee pickers (AddTask, AddAppointment, AddProject + their edit counterparts)
- Update display everywhere: task cards, detail screens, calendar chips

### M3 — Elevation flow
- Circle admin can tap "Invite to circle" on an external contact detail
- Invite flow pre-fills email if stored; invite is linked to the external contact record
- On invite acceptance: `linked_user_id` set → migration SQL moves all task/appointment references from `external_assignee_id` → `assignee`, `appointment_external_invitees` → `appointment_invitees`
- External contact entry in admin settings shows "Now a circle member" state
