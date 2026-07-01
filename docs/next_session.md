# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Reminders & push notification infrastructure (F1) is fully implemented and working end-to-end:
- Cron fires every 5 minutes via pg_cron + pg_net
- `send-reminders` Edge Function queries due reminders and calls `notify`
- `notify` Edge Function sends FCM v1 push notifications and writes to `notification_log`
- ReminderPicker UI wired into AddTask, TaskDetail, AddAppointment screens
- Reminders toggle in Settings with automatic battery optimization prompt (Android)
- Foreground notification handler set up so notifications show even when app is open
- Timezone bug fixed: all date-only writes now use local timezone (not UTC)

Vacation & collapsible calendar design is agreed (`docs/designs/design-vacation-calendar.md`) — not yet implemented.

---

## What Was Done This Session (2026-07-01)

### Push notifications (F1) — implementation & debugging

All phases from the previous session's implementation plan were completed. Key debugging discoveries:

- `pg_net` extension was not enabled — cron was failing silently on every tick
- `FIREBASE_SERVICE_ACCOUNT` secret was stored with malformed JSON from PowerShell minification — re-set via Python
- FCM v1 requires `android.notification.channel_id` in the message payload for Android 8+ — notifications were silently dropped without it
- `notify` Edge Function had no try/catch — crashed on bad secrets with no error surfaced to caller
- `send-reminders` did not check the response from `notify` — added error logging
- Samsung battery optimization was killing FCM background delivery — added automatic `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` prompt on Settings toggle
- No foreground notification handler — added `Notifications.setNotificationHandler` in `services/notifications.ts`

### Timezone bug fix

All date-only values (`due_date`, `start_date`, `end_date`) were being written to the DB using `toISOString().split('T')[0]` which converts to UTC first — causing off-by-one errors for UTC+ timezones (Israel = UTC+3).

Created `src/utils/dateUtils.ts` with:
- `toLocalISODate(date)` — extracts Y/M/D in local timezone
- `parseDateOnly(str)` — parses date-only strings as local midnight (avoids UTC parse default)

Fixed all call sites: AddVacationScreen, EditVacationScreen, AddTaskScreen, TaskDetailScreen, AddProjectScreen, AddAppointmentScreen, CalendarScreen, taskGrouping.ts.

### Battery optimization UX

- Added `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission to `AndroidManifest.xml`
- Installed `expo-intent-launcher`
- Settings reminders toggle now fires the system battery optimization exemption dialog on enable (Android only)
- **Requires a native rebuild** to take effect (AndroidManifest change + new native module)

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
