# Design: Reminders & Push Notification Infrastructure

> Status: Design agreed — ready for implementation
> Date: 2026-07-01

---

## 1. Overview

A reminder system that notifies relevant care circle members before a task is due or an appointment starts. This is also the foundation for all future push notifications in the app (task assignment alerts, circle announcements, etc.).

**Design principle:** Near-zero friction. Reminders are optional and set inline when creating/editing an item. The default is no reminder.

---

## 2. Scope

### In MVP
- Set one reminder per task or appointment (relative offset: X minutes/hours/days before)
- Recipients: assignee for tasks; assignee + "with" members for appointments
- Delivery: push notification via FCM (works whether app is open, backgrounded, or closed)
- User opt-in: a settings toggle controls whether a user receives any reminders
- Server-side cron fires notifications — no app background process required on device

### Deferred
- Multiple reminders per item
- Snooze from notification
- Per-item recipient overrides
- Notification preferences by type (e.g., reminders on, assignment alerts off)

---

## 3. Agreed Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Unified notification infrastructure | Reminders are use case #1; task-assignment and other future notifications reuse the same service |
| 2 | Both tasks and appointments | No meaningful difference from the user's perspective |
| 3 | Recipients are caller-determined | `NotificationService` receives a list of member IDs; it does not know about task/appointment logic |
| 4 | Task recipients: assignee only | Tasks have one assignee |
| 5 | Appointment recipients: assignee + "with" members | Requires adding `with_member_ids uuid[]` to appointments table |
| 6 | One reminder per item, relative offset | Amount + unit stored (e.g., 30 minutes, 2 hours, 1 day) — no absolute timestamp stored |
| 7 | Opt-in per user | `reminders_enabled` flag on `user_profile`; default off until user enables |
| 8 | Server-side cron (Supabase Edge Function) | Handles multi-recipient delivery; no device needs to be running |
| 9 | Notification log table | Tracks every sent notification; prevents duplicates; reusable for all notification types |
| 10 | No snooze in MVP | Dismissed or acted on; snooze deferred |

---

## 4. Data Model Changes

### `tasks` table — add column
```sql
reminder_offset_minutes integer  -- null = no reminder
```

### `appointments` table — add columns
```sql
reminder_offset_minutes integer   -- null = no reminder
with_member_ids         uuid[]    -- members attending; used for reminder recipients
```

### New table: `push_tokens`
Stores Expo push tokens per user/device. One user may have multiple devices.

```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references user_profile(id) on delete cascade
token       text not null          -- Expo push token
platform    text not null          -- 'android' | 'ios'
created_at  timestamptz default now()
unique(user_id, token)
```

### New table: `notification_log`
Tracks every push notification sent. Used to prevent duplicates and for future debugging/analytics.

```sql
id                uuid primary key default gen_random_uuid()
user_id           uuid references user_profile(id)
notification_type text not null    -- 'reminder' | 'task_assignment' | etc.
item_type         text             -- 'task' | 'appointment' | null for non-item notifications
item_id           uuid             -- references the task or appointment
sent_at           timestamptz default now()
success           boolean not null
error_message     text             -- null on success
```

### `user_profile` table — add column
```sql
reminders_enabled boolean not null default false
```

---

## 5. Architecture

### Push token registration
On login, the app requests notification permission and registers the Expo push token. The token is upserted into `push_tokens` for the current user. This runs once per login per device.

### NotificationService (generic interface)
A single Supabase Edge Function (`notify`) that accepts:
```
{
  user_ids: string[]          // who to notify
  notification_type: string   // 'reminder' | 'task_assignment' | ...
  title: string
  body: string
  data?: object               // deep-link payload (item type + id)
  item_type?: string
  item_id?: string
}
```
It looks up push tokens for the given `user_ids`, filters to users with `reminders_enabled = true` (for reminder type), sends via Expo Push API, and writes to `notification_log`.

### Cron job: reminder dispatcher
A second Supabase Edge Function (`send-reminders`) runs on a 5-minute cron schedule.

Logic:
1. Query tasks where `due_date - reminder_offset_minutes * interval '1 minute'` falls within the past 5-minute window AND `reminder_offset_minutes IS NOT NULL`
2. Same query for appointments using `starts_at`
3. For each match, check `notification_log` — skip if already sent for this item + type
4. Call `notify` with the appropriate `user_ids` and payload

This means: if `due_date` or `starts_at` changes after a reminder is set, the cron automatically fires at the correct new time. No cancellation logic needed.

```
[Supabase cron] every 5 min
    → Edge Function: send-reminders
        → query tasks + appointments due for reminder
        → filter already-sent via notification_log
        → call notify Edge Function
            → look up push_tokens
            → POST to Expo Push API
            → write to notification_log
```

---

## 6. UX

### Setting a reminder (Add/Edit Task and Add/Edit Appointment)
Below the due date / start time field, a row reads:

> **Remind me** · [None ▼]

Tapping opens a picker with options:
- None (default)
- 15 minutes before
- 30 minutes before
- 1 hour before
- 2 hours before
- 1 day before
- Custom (number input + unit selector: minutes / hours / days)

This stores `reminder_offset_minutes` on the item. The "Custom" option converts the user's input to minutes before saving.

### Opt-in setting
In **Settings → Notifications** (new section):

> **Task & appointment reminders** [toggle]
> Receive a push notification before tasks are due and appointments start.

Default: off. When toggled on, the app requests notification permission if not already granted.

### Permission not granted
If the user enables reminders but denies push permission, show a non-alarming inline message:
> "To receive reminders, allow notifications for this app in your device settings."
No blocking modal. The toggle stays on; notifications will work once permission is granted.

---

## 7. Open Questions (not blocking MVP)

- **Verify Supabase free tier** includes cron-triggered Edge Functions before starting implementation.
- **`with_member_ids` on appointments** — confirm data model addition is compatible with existing appointment screens.
