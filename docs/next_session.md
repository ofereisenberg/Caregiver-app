# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

i18n (F9) is complete through M8. M9 and M10 (push notifications and email) are deferred until the notification/email infrastructure is built.

All core and settings screens are fully translated. Formatters are in place.

---

## What Was Done Last Session

**Completed M7 — Translate Settings Screens (all screens):**

- **`UserSettingsScreen.tsx`** — screen title, section headers (Account, Text size, Language, Notifications, Google Calendar, Circles), row labels (Name, Email, Reminders + subtitle, Sync appointments, Coming soon), menu items (Create circle, Join with code), member count pluralisation, sign-out alert, could-not-save alert. Language picker chips now use `language.german` / `language.english` keys.
- **`CircleAdminScreen.tsx`** — back label, circle fallback name, section headers (Members, External contacts, Invites), member name fallback + "(you)" suffix, role labels (Admin/Member), "External" placeholder, Add external contact, Manage invites.
- **`AddEditExternalContactScreen.tsx`** — back label, screen title (Add/Edit modes), all 3 section labels, all 3 input placeholders, Remove contact alert, Save changes / Add contact button, Remove from circle button.
- **`JoinCircleScreen.tsx`** — back label, screen title, subtitle, placeholder (reused `auth.inviteCodePlaceholder`), validation error (reused `auth.errorEnterInviteCode`), button (reused `auth.joinCircle`).
- **`CreateCircleScreen.tsx`** — back label, screen title, subtitle, placeholder, validation error (reused `auth.errorCircleName`), button (reused `auth.createCircleButton`).
- **`en.json` / `de.json`** — 15 new `settings.*` keys and 21 new `circleAdmin.*` keys, plus 4 additional keys (`joinCircleSubtitle`, `newCircleTitle`, `newCircleSubtitle`, `newCirclePlaceholder`).

TypeScript check passed clean after all edits.

---

## Next: M9 & M10 — Server-side Translation (Deferred)

Blocked until notification and email infrastructure is built (Feature #1 and #14).

### M9 — Push notifications

- Update reminder notification Edge Function to look up `user_profile.language` before composing text
- Add German and English string variants for all notification types
- Verify end-to-end: German user receives German notification, English user receives English

### M10 — Magic link email

- Update Resend email template/Edge Function to look up `user_profile.language`
- Add German and English body/subject variants
- Fall back to German when `language` is null (first invite before preference is set)

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
