# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

i18n (F9) is nearly complete. M1–M8 are done. M7 (settings screens) is the only remaining milestone. M9 and M10 (push notifications and email) are deferred post-MVP.

Vacation & collapsible calendar features are fully implemented (screens, hooks, service, calendar rendering). Just needs i18n strings (covered by M7 if applicable).

---

## What Was Done Last Session

**Completed the remaining i18n string work across all core screens:**

- **`ReminderPicker.tsx`** — fully translated: "Remind me", "Set a time first", "None", "Custom", "Done", all 5 preset chip labels (using existing `appointments.reminderXxx` keys), unit dropdown labels. Replaced hardcoded `PRESETS` array with `PRESET_MINUTES` (numbers only). `formatReminder` and `presetLabel` now live inside component using `t()`. `unitLabels` record maps unit key → translated label.
- **`DayDetailScreen.tsx`** — "Nothing on this day", "On vacation", "With:" prefix, "Appointments", "Tasks due"
- **`AddVacationScreen.tsx` / `EditVacationScreen.tsx`** — headings, title placeholder, "From"/"Until", "With", "Nobody", person count (pluralised), save buttons
- **`CalendarScreen.tsx`** — screen title "Calendar", "Expand"/"Collapse" toggle, "Nothing on this day", "Appointment"/"Vacation" FAB labels, day-letter headers (now reads from `calendar.dayLetters`). Added `LocaleConfig` setup via `useEffect` so `react-native-calendars` Calendar component uses correct month/day names in DE and EN.
- **`en.json` / `de.json`** — 22 new keys added to `appointments` and `calendar` namespaces.

TypeScript check passed clean after all edits.

---

## Next: M7 — Translate Settings Screens

The following screens still have hardcoded English strings:

- **`UserSettingsScreen.tsx`** — profile section, language selector, circle list, sign-out
- **`CircleAdminScreen.tsx`** — member list, invite code, copy/share, remove member confirm — check if already translated (circleAdmin namespace exists in JSON)
- **`AddEditExternalContactScreen.tsx`** (new, untracked) — "Save changes" / "Add contact" on line 186, likely other strings
- Any remaining auth screens if not already done

Also worth checking at runtime: **"Invalid date"** was reported by the user on the task screen. It's not a hardcoded string — it's JS `Date.toLocaleDateString()` output on an invalid Date object. Likely triggered by a formatter being called with a null/undefined input that isn't guarded. Trace it during testing.

---

## Open Issues

| #  | Description                                                    |
|----|----------------------------------------------------------------|
| 10 | Repeating tasks don't appear in calendar for future instances  |

---

## Infrastructure

Supabase project ID: `icmtktdbqrcgtbeiggdc`
Supabase project URL: `https://icmtktdbqrcgtbeiggdc.supabase.co`
Resend SMTP configured and working
GitHub: `ofereisenberg/Caregiver-app`

## Dev build notes

**Dev build** (run in PowerShell from project root):

```powershell
$env:ANDROID_SERIAL = "R58M53P4QDM"
$env:JAVA_HOME = "C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "C:\Users\ofere\AppData\Local\Android\Sdk"
npx expo run:android
```

**Release APK for sideloading:**

```powershell
.\build-release.ps1
npm run build:android
```

After every `npm install`, re-apply the Foojay plugin comment in `node_modules/@react-native/gradle-plugin/settings.gradle.kts`.

- Press `r` in Expo terminal to force full reload when hot reload misses changes.
- OTP is 8 digits.
- `expo-av` was removed — re-install when building voice input (F6).
