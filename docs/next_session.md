# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Reminders & push notification infrastructure (F1) is fully implemented and working end-to-end, including custom reminder offsets. Vacation entry & editing is implemented. Collapsible calendar design is agreed but not yet implemented.

---

## What Was Done This Session (2026-07-01)

### Vacation editing (bug fix)

- Created `src/screens/app/EditVacationScreen.tsx` — same form as Add, pre-populated from existing data, calls `updateVacation`, no delete button
- Added `EditVacation: { vacationId: string }` route to `AppStackParamList` and `AppNavigator`
- Made vacation cards tappable in **CalendarScreen** (day-panel agenda list) and **DayDetailScreen** — both navigate to `EditVacation`; save button disabled for non-owners (owner = `vacation.user_id === currentUserId`)
- Root cause of "no reaction": original code had an owner-only gate using `isOwner` check that silently fell through; replaced with always-tappable cards (auth enforced in EditVacationScreen UI + Supabase RLS on save)

### Default appointment invitee

- `AddAppointmentScreen`: `inviteeIds` now initialises with `[session.user.id]` so the current user is pre-selected in the "With" list when creating a new appointment. Removable. Edit mode unaffected (useEffect overwrites with saved value).

### Custom reminder picker

- `ReminderPicker`: added **Custom** chip after the 5 presets
- Custom panel: `TextInput` (number-pad, 1–99) + unit dropdown (min / hours / days) — inline expanding, connected border styling
- Done button computes `num × multiplier` minutes and calls the existing `onChange` callback — no changes needed anywhere else
- Round-trips correctly: opening Custom when a custom value is already saved pre-fills the fields

### Reminder save bug (stale closure)

- `reminder_offset_minutes` was missing from the `useCallback` dependency array in both `AddAppointmentScreen` and `AddTaskScreen`
- Effect: `handleSave` always captured the initial `null` and wrote `null` to the DB regardless of what was selected
- Fixed by adding `reminderOffsetMinutes` to both dependency arrays

### Short reminder notification bug (RPC fix)

- Appointments / tasks with reminder offsets shorter than the cron interval (5 min) were silently skipped
- Root cause: RPC had `starts_at > now()` — if the cron fired even 1 minute after a short-reminder appointment started, the row was excluded
- Fixed both `get_due_appointment_reminders` and `get_due_task_reminders`: `> now()` → `> now() - interval '5 minutes'`
- Deployed directly via `supabase db query`; migration file updated to match
- Deduplication via `notification_log (item_id, scheduled_for)` prevents double-sends

---

## To Implement Next Session

- **Vacation & collapsible calendar** (F16) — design in `docs/designs/design-vacation-calendar.md`
- **Native rebuild** (when convenient): needed to enable battery optimization prompt in Settings (`expo-intent-launcher`)

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
