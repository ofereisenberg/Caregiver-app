# Design: i18n — German / English Language Support (F9)

> Status: Design complete. Ready for implementation milestone by milestone.
> Last updated: 2026-07-01

---

## Context

The app is used by a German-based care circle whose members may prefer German or English. Language support is per-user, stored in Supabase, and takes effect instantly. Two locales are supported: `de` (German) and `en` (English). Both share the same date and time conventions (German standard), differing only in UI language and number formatting.

---

## Decisions

| Decision | Choice |
|---|---|
| Language scope | Per-user preference, stored in `user_profile.language` |
| Default on first launch | Language picker screen — very first screen before email entry |
| Device locale | Used to pre-select the picker option, not authoritative |
| Returning users | Language loaded from `user_profile` at login |
| Language switch | Instant — full app re-renders; no restart required |
| Language in Settings | Picker in UserSettingsScreen; saves to `user_profile` immediately |
| Invite email default | German (recipient has no preference set yet) |

---

## Locale Definitions

Both locales use **German date and time conventions**. They differ in UI language and number separators only.

| Format | `de` (German) | `en` (English) |
|---|---|---|
| UI language | German | English |
| Date | DD.MM.YYYY | DD.MM.YYYY |
| Time | 24h (14:30) | 24h (14:30) |
| Decimal separator | Comma → `1,50` | Period → `1.50` |
| Thousands separator | Period → `1.234` | Comma → `1,234` |

---

## First Launch Flow

```
App open (first time)
  └─▶ LanguagePickerScreen   ← NEW — very first screen
        ├── "Deutsch"  (pre-selected if device locale = de)
        └── "English"  (pre-selected if device locale = en)
              │  Store choice in AsyncStorage
              ▼
        EnterEmailScreen  (i18next already active)
              │
              ▼
        ... OTP → onboarding → sync language to user_profile
```

Returning users skip LanguagePickerScreen — language is loaded from `user_profile` on auth.

---

## Server-side Language

Push notifications and email must respect the user's language preference:
- **Push notifications:** server-side function looks up `user_profile.language` before composing text.
- **Magic link email:** looks up `user_profile.language`; falls back to German if not set (first invite).

---

## Implementation Milestones

At the start of the implementation session, convert the checklist to todos and mark each item done as you complete it.

### M1 — Database & types
- [ ] Add `language text NOT NULL DEFAULT 'de'` column to `user_profile` (migration)
- [ ] Apply migration via `supabase db push`
- [ ] Regenerate TypeScript types

### M2 — i18next setup
- [ ] Install `i18next` and `react-i18next`
- [ ] Create `src/i18n/de.json` and `src/i18n/en.json` with placeholder structure
- [ ] Create `src/i18n/index.ts` — initialise i18next with both locales, no backend (bundled translations)
- [ ] Wrap app root in `I18nextProvider`
- [ ] Create `src/hooks/useLanguage.ts` — exposes current language, `setLanguage(lang)` function that updates both i18next and `user_profile`

### M3 — Language picker screen (onboarding)
- [ ] Create `src/screens/auth/LanguagePickerScreen.tsx` — two options (Deutsch / English), pre-selects based on device locale
- [ ] On selection: store to AsyncStorage, update i18next immediately
- [ ] Add `LanguagePicker` to `AuthStackParamList` and `AuthNavigator` as the first route
- [ ] On auth completion: sync AsyncStorage language to `user_profile.language`
- [ ] Returning user path: skip picker, load `language` from `user_profile` and apply at login

### M4 — Language in Settings
- [ ] Add language selector row to `UserSettingsScreen` (shows current language, tap to toggle)
- [ ] On change: call `setLanguage()` from `useLanguage` — instant re-render, saves to `user_profile`

### M5 — Translate auth screens
- [ ] `LanguagePickerScreen` strings in both locales
- [ ] `EnterEmailScreen` — label, placeholder, button, OTP instructions
- [ ] `OTPScreen` (or equivalent) — all strings
- [ ] `InviteManagementScreen`, `SelectCircleScreen` — all strings

### M6 — Translate core app screens
- [ ] `TaskListScreen` — section headers, empty state, FAB label
- [ ] `AddTaskScreen` — all labels, placeholders, buttons, validation messages
- [ ] `TaskDetailScreen` — field labels, status values, actions
- [ ] `AddAppointmentScreen`, `AppointmentDetailScreen` — all strings
- [ ] `CalendarScreen` — month/day names, headers
- [ ] `ProjectsScreen`, `ProjectDetailScreen` (if applicable)

### M7 — Translate settings screens
- [ ] `UserSettingsScreen` — all section headers and row labels
- [ ] `CircleAdminScreen` — all strings
- [ ] `CreateCircleScreen`, `JoinCircleScreen` — all strings

### M8 — Date, time, and number formatting
- [ ] Create `src/utils/formatters.ts` — `formatDate(date)`, `formatTime(date)`, `formatNumber(n)` using active locale
- [ ] `formatDate` always outputs DD.MM.YYYY (same for both locales)
- [ ] `formatTime` always outputs 24h (same for both locales)
- [ ] `formatNumber` uses `de-DE` separators for `de`, `en-US` separators for `en`
- [ ] Replace all raw date/time/number display strings across screens with formatter calls

### M9 — Push notifications (server-side)
- [ ] Update reminder notification Edge Function (or service) to look up `user_profile.language` before composing text
- [ ] Add German and English string variants for all existing notification types
- [ ] Verify end-to-end: German user receives German notification, English user receives English

### M10 — Magic link email (last)
- [ ] Update Resend email template or Edge Function to look up `user_profile.language`
- [ ] Add German and English body/subject variants
- [ ] Fall back to German when `language` is null (first invite before preference is set)
