# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Settings screens are complete. A third "Settings" tab is live in the bottom nav. The Realtime subscription bug that was noted last session was already fixed (useRef pattern was already in place in both hooks).

**Testing checklist from last session is still pending** — work through it before building anything new.

---

## What was done this session (2026-06-25) — Settings Screens

### New files created

- `src/hooks/useProfile.ts` — fetches `user_profile` row for the current user; exposes `profile`, `loading`, `error`, `reload`
- `src/screens/settings/UserSettingsScreen.tsx` — full implementation (was a stub)
- `src/screens/settings/CircleAdminScreen.tsx` — full implementation (was a stub)

### Modified files

- `src/contexts/AuthContext.tsx` — added `signOut` to context value (delegates to `services/auth.ts`)
- `src/navigation/types.ts` — added `Settings` to `BottomTabParamList`; removed `UserSettings` from `AppStackParamList` (now a tab, not a push screen)
- `src/navigation/AppNavigator.tsx` — added Settings tab (settings-outline icon); removed `UserSettings` stack screen

### Feature detail

#### UserSettingsScreen

- Shows display name with tap-to-edit (inline TextInput with save / cancel)
- Shows email (read-only, from session)
- Google Calendar sync toggle — disabled, shows "Coming soon"
- "Circle settings" row — only visible if user is admin role; navigates to CircleAdmin
- Sign out button with confirmation alert

#### CircleAdminScreen

- Shows circle name as screen title
- Members list with initials avatars (sage bg for self, sageTint for others), name, role badge
- "Manage invites" row → navigates to InviteManagement (existing screen)
- Back button → Settings tab

---

## Testing checklist

Work through this before building anything new:

### Task flow

- [ ] Create a task (title only) → appears in list
- [ ] Create a task with repeat, assignee, due date, Only me → fields shown correctly
- [ ] Tap task → detail screen loads all fields
- [ ] Edit assignee, repeat, date, visibility in detail → persists after leaving and returning
- [ ] Add/edit progress note → saves
- [ ] Complete task (checkbox) → removed from list
- [ ] Delete task → removed from list
- [ ] Mine filter → shows only tasks assigned to you

### Appointment flow

- [ ] Calendar tab shows empty state
- [ ] Tap + in Calendar → add appointment sheet; date chips show correct dates
- [ ] Select date + time + optional duration/assignee → Add appointment → navigates to detail
- [ ] Appointment appears in Calendar tab on correct date
- [ ] "Make an appointment" from task detail → title pre-filled
- [ ] Add prep task from appointment detail → task appears in checklist
- [ ] Complete a prep task → checkbox fills, count updates
- [ ] Delete appointment → gone from calendar

### Settings flow

- [ ] Settings tab appears in bottom nav
- [ ] Display name shown correctly
- [ ] Tap name → editable; save persists; cancel reverts
- [ ] Email shown correctly (read-only)
- [ ] Google Calendar toggle is disabled with "Coming soon"
- [ ] Admin user sees "Circle settings" row; member does not
- [ ] Circle settings → members list shows correct names and roles
- [ ] Manage invites → existing invite screen
- [ ] Sign out → confirmation alert → signs out

---

## Next steps

### Step 8 — Push notifications (basic)

- Register push token on login → save to `user_profile.push_token`
- Send notification when a task is assigned to you (Supabase Edge Function or client-side trigger)

### Step 9 — Daily digest modal

- `DailyDigestScreen` stub already exists
- Show on first app open of the day if there are tasks/appointments upcoming
- Gate with `last_digest_shown_at` on `user_profile`

---

## Open items

- Testing checklist above not yet verified against running app
- Google OAuth client ID not yet configured (Calendar sync — defer until after push notifications)
- Apple Developer account deferred (EAS Build post-MVP)
- Appointment editing (changing date/time/assignee after creation) not yet built

---

## Deferred documentation task — Email auth setup guide

Collect lessons learned from all chat sessions where we worked on email auth (Supabase + Resend + magic link + OTP + custom domain) and produce a guide at `docs/technical/email-auth-setup-guide.md`.

The info is scattered across multiple chat sessions. Key topics to consolidate:

- Resend SMTP setup and connecting it to Supabase
- Supabase Auth email templates (each type: confirm signup, magic link, OTP, invite) — which variables go in each (`{{ .Token }}`, `{{ .ConfirmationURL }}`)
- Supabase Auth Hooks (Send Email hook) — event types, how the hook payload works, which Resend template is called per event
- Custom domain setup in Supabase + Namecheap DNS records (TXT + CNAME) — the "all records missing" gotcha
- The distinction between the login OTP email and the "confirm your email address" signup email — they go through different paths and need separate templates
- Propagation delay gotcha (wait before restarting verification in Supabase)
- Testing: how to verify each email type is working end-to-end

---

## Infrastructure

Supabase project ID: `icmtktdbqrcgtbeiggdc`
Supabase project URL: `https://icmtktdbqrcgtbeiggdc.supabase.co`
Resend SMTP configured and working
GitHub: `ofereisenberg/Caregiver-app`

## Dev build notes

See `docs/technical/05-android-dev-build-setup.md` for the full Android setup guide including all Windows-specific fixes.

Working build command (run in PowerShell from project root):

```powershell
$env:ANDROID_SERIAL = "R58M53P4QDM"
$env:JAVA_HOME = "C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "C:\Users\ofere\AppData\Local\Android\Sdk"
npx expo run:android
```

After every `npm install`, re-apply the Foojay plugin comment in `node_modules/@react-native/gradle-plugin/settings.gradle.kts` (see guide Step 3).

**expo-av was removed (2026-06-26)** — it caused a `LazyKType` runtime crash due to a version incompatibility with expo-modules-core 56.0.17. It was not yet used anywhere in the app. Re-install it (`npm install expo-av`) when building the voice input feature (Step 11), and follow the guidance in the setup guide under "LazyKType runtime crash".

### Other testing notes

- Press `r` in Expo terminal to force full reload when hot reload misses changes.
- OTP is 8 digits.
