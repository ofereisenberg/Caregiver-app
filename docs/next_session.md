# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Multi-circle support fully implemented. Design for F16 (vacation entries) and collapsible calendar agreed and documented in `docs/designs/design-vacation-calendar.md`. Implementation starts next.

At the start of the implementation session, convert the checklist below to todos and mark each item done as you complete it.

---

## Implementation Plan — Vacation & Collapsible Calendar

### Phase 1 — Database & types

- [ ] Create `vacation` table (id, circle_id, user_id, title, start_date, end_date, with_member_ids uuid[], created_at)
- [ ] Add RLS: all circle members can read; only owner (user_id) can insert/update/delete
- [ ] Run `supabase db push` and regenerate TypeScript types

### Phase 2 — Service & hook

- [ ] Create `services/vacations.ts` — getVacationsForCircle, createVacation, updateVacation, deleteVacation
- [ ] Create `hooks/useVacations.ts` — fetches vacations for active circle, realtime subscription, clean up on unmount

### Phase 3 — Add Vacation screen

- [ ] Create `screens/app/AddVacationScreen.tsx` — title input, start date, end date, "with" multi-select from circle members
- [ ] Add `AddVacation` to `AppStackParamList` and `AppNavigator`
- [ ] Wire FAB or "+" button in CalendarScreen to open AddVacationScreen

### Phase 4 — Collapsible calendar

- [ ] Add expand/collapse state to `CalendarScreen`
- [ ] Implement swipe-up/down gesture to toggle states
- [ ] Implement swipe-left/right on calendar grid to move months (both states)
- [ ] Collapsed state: render mini-month grid (M T W T F S S header, week-number left column, colored dots per cell)
- [ ] Collapsed state: bottom day-event panel with selected day's items; swipe left/right moves day

### Phase 5 — Expanded calendar

- [ ] Expanded state: taller cells showing up to 3 items at 1–2 words each
- [ ] "+X" overflow badge when a day has more than 3 items
- [ ] Tapping any day cell opens DayDetailScreen (modal)

### Phase 6 — Vacation rendering in calendar

- [ ] Collapsed: red dot in each day cell within a vacation range
- [ ] Expanded: full-width red background fill per cell in range; title text only in first cell of range

### Phase 7 — Day Detail modal screen

- [ ] Create `screens/app/DayDetailScreen.tsx` — modal, header with date, lists vacations/appointments/tasks with color labels, view-only
- [ ] Add `DayDetail` to `AppStackParamList` and `AppNavigator` as modal

### Phase 8 — Vacation assignment warning

- [ ] In `AddTaskScreen`: check if assignee has a vacation covering the selected due date; show warning if so
- [ ] In `AddAppointmentScreen`: same check for start date range

---

## Previous session work (2026-06-28)

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
