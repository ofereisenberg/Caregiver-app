# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Multi-circle support fully implemented. A user can now create multiple circles, switch between them in Settings, and invite existing users (via code entry) or new users (via the existing invite flow). All main screen headers show the active circle name.

---

## What was done this session (2026-06-28)

### Multi-circle support (F12)

**Migration `20260628100000_active_circle.sql`**
- Added `active_circle_id uuid REFERENCES care_circle(id)` (nullable) to `user_profile`
- Applied via `supabase db push` — live in production
- TypeScript types regenerated

**`src/services/circle.ts`**
- `getUserCircles(userId)` — returns all circles the user belongs to
- `setActiveCircle(userId, circleId)` — writes `active_circle_id` to `user_profile`

**`src/contexts/AuthContext.tsx`** — significant update
- New `SetupStage`: `'needs_active_circle'` (user has 2+ circles, none selected yet)
- Loads `active_circle_id` from `user_profile` at login; holds in memory for the session
- Null-default logic: 1 circle → auto-select silently; 2+ circles → `needs_active_circle` stage
- Exposes `activeCircleId` and `switchCircle(circleId)` to all consumers

**`src/hooks/useCircle.ts`**
- Now reads `activeCircleId` from AuthContext instead of first-found DB lookup

**`src/hooks/useUserCircles.ts`** — new file
- Returns all user circles with member counts; used in Settings

**Navigation**
- `SelectCircle` added to `AuthStackParamList` + `AuthNavigator`
- `CreateCircle`, `JoinCircle` added to `AppStackParamList` + `AppNavigator`

**`src/screens/auth/SelectCircleScreen.tsx`** — new file
- Shown when `setupStage === 'needs_active_circle'`
- Lists all circles; tapping one sets it as active and enters the app

**`src/screens/auth/EnterEmailScreen.tsx`**
- Routes to `SelectCircle` for `needs_active_circle` stage

**`src/screens/auth/InviteManagementScreen.tsx`** — bug fix
- Was calling `getUserCircle()` (`.maybeSingle()`) which errors with multiple circles → infinite spinner
- Now uses `activeCircleId` from context; falls back to `getUserCircle` only during onboarding

**`src/screens/settings/CreateCircleScreen.tsx`** — new file
- Simple name input; creates circle and returns to Settings (does not auto-switch)

**`src/screens/settings/JoinCircleScreen.tsx`** — new file
- Code input for existing users to join a second circle; calls `joinCircleWithToken`

**`src/screens/settings/UserSettingsScreen.tsx`**
- CIRCLE section replaced with CIRCLES section
- Lists all user circles: name + member count + checkmark on active
- Tapping active circle → navigate to CircleAdmin; tapping non-active → switch then navigate
- `+` button opens inline popup menu (react-native-popup-menu): "Create circle" / "Join with code"

**`src/screens/app/ProjectsScreen.tsx`**
- Circle name added to header (matching TaskListScreen and CalendarScreen which already had it)

**`src/screens/app/ProjectDetailScreen.tsx`** — minor fix
- Status array typed as literal union (pre-existing TS error surfaced by type regeneration)

---

## Open Issues

| #  | Description                                                    |
|----|----------------------------------------------------------------|
| 10 | Repeating tasks don't appear in calendar for future instances  |

---

## Features — priority order

### High

- F1 — Push notifications (register token on login, notify on task assignment)
- F2 — Daily digest modal (first app open of the day)

### Medium

- F13 — Email invite (send invite code via Resend to recipient's email — design: enter email in app, Edge Function sends message with code + instructions)
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
