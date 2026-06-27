# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Calendar week start fixed to Monday. Overview "This week" bucket now ends on the actual Sunday of the current Mon–Sun week. Full design for the Projects feature is complete and documented at `docs/design-projects.md`. Implementation is the next task.

---

## What was done this session (2026-06-27)

- Fixed `CalendarScreen` to start weeks on Monday (`firstDay={1}` on react-native-calendars)
- Fixed `overviewGrouping` "This week" bucket to end on the Sunday of the current Mon–Sun week (was a rolling +6 days)
- Removed pre-existing `appt.assignee` TypeScript error from CalendarScreen (Appointment uses invitees join table, not a single assignee field)
- Committed all accumulated work from the previous session (Overview screen, appointment invitees, full task editing)
- Designed the Projects feature in full — decisions documented in `docs/design-projects.md`

---

## Testing checklist (still pending from 2026-06-25 session)

Work through this before building anything new if possible:

- [ ] Create a task (title only) → appears in list
- [ ] Create a task with repeat, assignee, due date, Only me → fields shown correctly
- [ ] Tap task → detail screen loads all fields
- [ ] Edit assignee, repeat, date, visibility in detail → persists after leaving and returning
- [ ] Complete task (checkbox) → removed from list
- [ ] Delete task → removed from list
- [ ] Calendar shows Monday as first day of week
- [ ] Appointment appears in Calendar tab on correct date
- [ ] Add prep task from appointment detail → task appears in checklist
- [ ] Settings tab → navigates correctly via avatar

---

## Implementation Plan: Projects Feature

At the start of the implementation session, convert the checklist to todos and mark each item done as you complete it.

Read `docs/design-projects.md` before starting — it has the full data model, status lifecycle, and UI spec.

### Phase 1 — Data layer

- [ ] Write migration: create `projects` table with all fields (id, title, description, owner, due_date, status enum, visibility, circle_id, created_by, created_at)
- [ ] Write migration: add `project_status` enum (`not_started`, `in_progress`, `done`) if not already in schema
- [ ] Write migration: add `project_id` FK (nullable) to `tasks` table
- [ ] Write migration: add `project_id` FK (nullable) to `appointments` table
- [ ] Run migrations against linked Supabase project
- [ ] Regenerate TypeScript types: `supabase gen types typescript --linked > src/types/database.ts`
- [ ] Create `services/projects.ts` — CRUD: getProjectsForCircle, getProject (with children), createProject, updateProject, deleteProject
- [ ] Create `hooks/useProjectList.ts` — list of projects for circle with realtime subscription
- [ ] Create `hooks/useProject.ts` — single project with child tasks and appointments

### Phase 2 — Project screens

- [ ] Add navigation types for ProjectsList, ProjectDetail, AddProject to `navigation/types.ts`
- [ ] Create `screens/app/ProjectsScreen.tsx` — list of projects grouped by status (active first, done below); each row shows title, status badge, due date, child count
- [ ] Create `screens/app/ProjectDetailScreen.tsx` — two tabs (Active / Past); each tab shows interleaved child tasks and appointments; "+" FAB to add task or appointment
- [ ] Create `screens/app/AddProjectScreen.tsx` — form: title (required), description, owner picker, due date (optional), visibility

### Phase 3 — Navigation changes

- [ ] Update `AppNavigator` — remove Settings tab from bottom nav; add Projects tab; wire up ProjectsScreen
- [ ] Add user avatar (→ Settings) to CalendarScreen header (same pattern as Overview)
- [ ] Add user avatar (→ Settings) to ProjectsScreen header
- [ ] Add ProjectDetail, AddProject as stack screens in AppNavigator

### Phase 4 — Linking projects from tasks and appointments

- [ ] Update `AddTaskScreen` — add optional "Link to project" picker field
- [ ] Update `AddAppointmentScreen` — add optional "Link to project" picker field
- [ ] Update `TaskDetailScreen` — add project link row (shows linked project name, tappable to navigate; allow unlinking)
- [ ] Update `AppointmentDetailScreen` — same project link row

### Phase 5 — Overview and Calendar tags

- [ ] Update `OverviewItemRow` — show project name tag below title when `project_id` is set; tag navigates to ProjectDetail
- [ ] Update `OverviewItemRow` — add "..." button to right of row; action sheet: "Add to project" / "Remove from project", "Delete" (checkbox stays for quick-complete)
- [ ] Update `CalendarScreen` agenda items — show project name tag when item has a project

### Phase 6 — Status auto-transitions

- [ ] In `useProject` / project service: when a child task is marked complete and project is `not_started`, auto-update status to `in_progress`
- [ ] In `useProject`: when viewing a project, check if any child appointment date has passed — if so and status is `not_started`, update to `in_progress`
- [ ] When all children are completed/past and project is `in_progress`, prompt user to mark project done (Alert with confirm/cancel)

---

## Open items

- Testing checklist above not yet verified against running app
- Google OAuth client ID not yet configured (Calendar sync — defer)
- Apple Developer account deferred (EAS Build post-MVP)
- Appointment editing (changing date/time after creation) not yet built
- Email auth setup guide — collect lessons from past sessions into `docs/technical/email-auth-setup-guide.md` (deferred)

---

## Infrastructure

Supabase project ID: `icmtktdbqrcgtbeiggdc`
Supabase project URL: `https://icmtktdbqrcgtbeiggdc.supabase.co`
Resend SMTP configured and working
GitHub: `ofereisenberg/Caregiver-app`

## Dev build notes

See `docs/technical/05-android-dev-build-setup.md` for the full Android setup guide.

Working build command (run in PowerShell from project root):

```powershell
$env:ANDROID_SERIAL = "R58M53P4QDM"
$env:JAVA_HOME = "C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "C:\Users\ofere\AppData\Local\Android\Sdk"
npx expo run:android
```

After every `npm install`, re-apply the Foojay plugin comment in `node_modules/@react-native/gradle-plugin/settings.gradle.kts` (see guide Step 3).

**expo-av was removed (2026-06-26)** — LazyKType runtime crash. Re-install when building voice input (Step 11).

- Press `r` in Expo terminal to force full reload when hot reload misses changes.
- OTP is 8 digits.
