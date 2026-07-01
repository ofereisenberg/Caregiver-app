# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

i18n design (F9 — German/English language support) is fully agreed and documented in `docs/designs/design-i18n.md`. Implementation starts next, milestone by milestone.

Vacation & collapsible calendar design is complete (`docs/designs/design-vacation-calendar.md`) and deferred — implement after i18n is done.

At the start of the implementation session, convert the checklist below to todos and mark each item done as you complete it.

---

## Implementation Plan — i18n (F9)

### M1 — Database & types
- [ ] Add `language text NOT NULL DEFAULT 'de'` column to `user_profile` (migration)
- [ ] Apply migration via `supabase db push`
- [ ] Regenerate TypeScript types

### M2 — i18next setup
- [ ] Install `i18next` and `react-i18next`
- [ ] Create `src/i18n/de.json` and `src/i18n/en.json` with placeholder structure
- [ ] Create `src/i18n/index.ts` — initialise i18next with both locales, bundled (no backend)
- [ ] Wrap app root in `I18nextProvider`
- [ ] Create `src/hooks/useLanguage.ts` — exposes current language and `setLanguage(lang)` that updates both i18next and `user_profile`

### M3 — Language picker screen (onboarding)
- [ ] Create `src/screens/auth/LanguagePickerScreen.tsx` — two options (Deutsch / English), pre-selects from device locale
- [ ] On selection: store to AsyncStorage, update i18next immediately
- [ ] Add `LanguagePicker` to `AuthStackParamList` and `AuthNavigator` as the first route
- [ ] On auth completion: sync AsyncStorage language to `user_profile.language`
- [ ] Returning user path: skip picker, load `language` from `user_profile` and apply at login

### M4 — Language in Settings
- [ ] Add language selector row to `UserSettingsScreen`
- [ ] On change: call `setLanguage()` — instant re-render, saves to `user_profile`

### M5 — Translate auth screens
- [ ] `LanguagePickerScreen` strings in both locales
- [ ] `EnterEmailScreen` — label, placeholder, button, OTP instructions
- [ ] `OTPScreen` (or equivalent)
- [ ] `InviteManagementScreen`, `SelectCircleScreen`

### M6 — Translate core app screens
- [ ] `TaskListScreen` — section headers, empty state, FAB label
- [ ] `AddTaskScreen` — labels, placeholders, buttons, validation messages
- [ ] `TaskDetailScreen` — field labels, status values, actions
- [ ] `AddAppointmentScreen`, `AppointmentDetailScreen`
- [ ] `CalendarScreen` — month/day names, headers
- [ ] `ProjectsScreen`, `ProjectDetailScreen`

### M7 — Translate settings screens
- [ ] `UserSettingsScreen`, `CircleAdminScreen`
- [ ] `CreateCircleScreen`, `JoinCircleScreen`

### M8 — Date, time, and number formatting
- [ ] Create `src/utils/formatters.ts` — `formatDate`, `formatTime`, `formatNumber` using active locale
- [ ] Both locales: DD.MM.YYYY dates, 24h time
- [ ] German: comma decimal / period thousands; English: period decimal / comma thousands
- [ ] Replace all raw date/number display strings across screens with formatter calls

### M9 — Push notifications
- [ ] Update reminder notification logic to look up `user_profile.language` before composing text
- [ ] Add German and English variants for all existing notification types

### M10 — Magic link email (last)
- [ ] Update Resend email template/function to look up `user_profile.language`
- [ ] German and English body/subject variants
- [ ] Fall back to German when language is null

---

## Deferred: Vacation & Collapsible Calendar

Design is complete in `docs/designs/design-vacation-calendar.md`. Implementation plan preserved below for when i18n is done.

### Phase 1 — Database & types
- [ ] Create `vacation` table (id, circle_id, user_id, title, start_date, end_date, with_member_ids uuid[], created_at)
- [ ] Add RLS: all circle members can read; only owner can insert/update/delete
- [ ] Run `supabase db push` and regenerate TypeScript types

### Phase 2 — Service & hook
- [ ] Create `services/vacations.ts` — getVacationsForCircle, createVacation, updateVacation, deleteVacation
- [ ] Create `hooks/useVacations.ts` — fetches, realtime subscription, clean up on unmount

### Phase 3 — Add Vacation screen
- [ ] Create `screens/app/AddVacationScreen.tsx`
- [ ] Add to `AppStackParamList` and `AppNavigator`

### Phase 4 — Collapsible calendar
- [ ] Expand/collapse state + swipe gestures
- [ ] Collapsed: mini-month grid, colored dots, bottom day-event panel
- [ ] Expanded: taller cells, up to 3 items, +X overflow badge

### Phase 5 — Day Detail modal
- [ ] Create `screens/app/DayDetailScreen.tsx` — modal, view-only

### Phase 6 — Vacation rendering in calendar
- [ ] Collapsed: red dot per vacation day
- [ ] Expanded: full-width red fill, title in first cell only

### Phase 7 — Vacation assignment warning
- [ ] AddTaskScreen: warn if assignee is on vacation on due date
- [ ] AddAppointmentScreen: same check

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
