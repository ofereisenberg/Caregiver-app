# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Reminders & push notification infrastructure (F1) is fully implemented and working end-to-end:
- Cron fires every 5 minutes via pg_cron + pg_net
- `send-reminders` Edge Function queries due reminders and calls `notify`
- `notify` Edge Function sends FCM v1 push notifications and writes to `notification_log`
- ReminderPicker UI wired into AddTask, TaskDetail, AddAppointment screens
- Reminders toggle in Settings (battery optimization prompt deferred to next native rebuild)
- Foreground notification handler set up so notifications show even when app is open
- Timezone bug fixed: all date-only writes now use local timezone (not UTC)
- Task and appointment reminders both tested and confirmed working on device

Vacation & collapsible calendar design is agreed (`docs/designs/design-vacation-calendar.md`) — not yet implemented.

---

## What Was Done This Session (2026-07-01)

### Reminder dedup fix — scheduled_for column

The `notification_log` was missing a `scheduled_for` timestamp, so the dedup check keyed only on `item_id`. Rescheduling an appointment blocked the new reminder because the old log row matched. Fixed by:

- Adding `scheduled_for timestamptz` to `notification_log`
- Passing `starts_at` / task `due_date+start_time` through `send-reminders` → `notify` → log
- Dedup now checks `(item_id, scheduled_for)` — rescheduling always gets a fresh reminder

### Task reminder fixes

Task reminders were broken in two ways:

1. `start_time` was stored as local time (CEST) — the server-side RPC treated it as UTC, firing 2 hours late
2. The RPC used `due_date > now()` on a date-only field (midnight UTC), which is already false by morning
3. `reminder_offset_minutes` was not being saved for date-only tasks (no start_time)

Fixed by:

- `timeToString` now uses `getUTCHours/getUTCMinutes` — start_time stored as UTC
- `parseTimeString` uses `setUTCHours` so round-trip is correct; `toLocaleTimeString` still shows local time
- RPC now combines `due_date::date + start_time` as UTC timestamp for the trigger window
- Dedup keyed on the combined timestamp
- ReminderPicker shows "Set a time first" and is disabled when no start_time is set
- Existing 3 tasks migrated: subtracted 2h to convert CEST → UTC

### Battery optimization prompt temporarily removed

`expo-intent-launcher` is a new native module — installing it without a rebuild caused a crash. Removed the prompt from Settings until the next `npx expo run:android` rebuild.

### Multi-user token registration

Confirmed architecture is correct:

- Each user's FCM token is registered on every app launch via `registerPushToken()` in `AuthContext`
- `notify` Edge Function looks up tokens for all `user_ids` passed to it
- `reminders_enabled` is checked per-user server-side in `notify`

---

## To Implement Next Session

- **Native rebuild required** for battery optimization prompt: `npx expo run:android` with the usual env vars
- **Vacation & collapsible calendar** (F16) — design in `docs/designs/design-vacation-calendar.md`

---

## Open Issues

| #  | Description                                                    |
|----|----------------------------------------------------------------|
| 10 | Repeating tasks don't appear in calendar for future instances  |

---

## Features — priority order

### High

- F2 — Daily digest modal (first app open of the day)

### Medium

- F13 — Email invite (send invite code via Resend to recipient's email)
- F9 — i18n (German/English, i18next)

### Low

- F5 — Google Calendar sync
- F6 — Voice input (Whisper + Claude Haiku)
- F7 — Maps link detection in location field
- F8 — Multiple invitees (join table)
- F11 — Full-text search

---

## Infrastructure

Supabase project ID: `icmtktdbqrcgtbeiggdc`
Supabase project URL: `https://icmtktdbqrcgtbeiggdc.supabase.co`
Resend SMTP configured and working
GitHub: `ofereisenberg/Caregiver-app`

## Dev build notes

See `docs/technical/05-android-dev-build-setup.md` for the full Android setup guide.

**Dev build** (run in PowerShell from project root):

```powershell
$env:ANDROID_SERIAL = "R58M53P4QDM"
$env:JAVA_HOME = "C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "C:\Users\ofere\AppData\Local\Android\Sdk"
npx expo run:android
```

**Release APK for sideloading** — run the build script (handles everything):

```powershell
.\build-release.ps1       # from terminal
npm run build:android     # alternative
buildandroid.bat          # double-click in Explorer
```

Output goes to `releases/v{version}/caregiver-app-v{version}.apk`. Upload that file to Google Drive.

After every `npm install`, re-apply the Foojay plugin comment in `node_modules/@react-native/gradle-plugin/settings.gradle.kts` (see guide Step 3).

**expo-av was removed (2026-06-26)** — LazyKType runtime crash. Re-install when building voice input (F6).

- Press `r` in Expo terminal to force full reload when hot reload misses changes.
- OTP is 8 digits.
