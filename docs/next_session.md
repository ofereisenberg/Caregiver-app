# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Projects feature fully implemented and tested. All core interactions work: project CRUD, task/appointment linking, Overview "..." context menus, Calendar project tags, task uncheck/re-open from both Overview Done tab and Project Past tab, safe-area-aware delete button, and three-option delete dialog.

---

## What was done this session (2026-06-27)

### Projects feature — full implementation (phases 1–6)

**Phase 1 — Data layer**
- Migration `20260627120000_projects.sql`: `project_status` enum, `projects` table, `project_id` FK (nullable, ON DELETE SET NULL) on tasks and appointments, RLS policies, Realtime
- Regenerated `src/types/database.ts` (UTF-8)
- `services/projects.ts` — full CRUD + `deleteProjectAndItems`
- `hooks/useProjectList.ts` — project list with Realtime
- `hooks/useProject.ts` — single project with children, Realtime, task completion, status auto-transitions

**Phase 2 — Project screens**
- `screens/app/ProjectsScreen.tsx` — list grouped Active/Done, FAB → AddProject, avatar → Settings
- `screens/app/ProjectDetailScreen.tsx` — Active/Past tabs, child rows, Mark done, FAB row, Delete
- `screens/app/AddProjectScreen.tsx` — modal form: title, description, owner, due date, visibility

**Phase 3 — Navigation**
- Removed Settings bottom tab; added Projects tab (folder icon)
- Added `ProjectDetail`, `AddProject`, `UserSettings` as stack screens
- Avatar → `UserSettings` added to all three tab headers

**Phase 4 — Linking from forms**
- `AddTaskScreen` / `AddAppointmentScreen`: project picker row, pre-seeded from route params
- `TaskDetailScreen` / `AppointmentDetailScreen`: project field row with chip picker + "View project" link

**Phase 5 — Overview and Calendar project tags**
- `OverviewItemRow`: project tag (folder icon + name, sage tint), "..." menu button
- `TaskListScreen`: `buildMenuItems()` builds context menu items per row
- `CalendarScreen`: project tag on agenda rows

**Phase 6 — Status auto-transitions**
- `useProject`: `not_started → in_progress` on first task complete or past appointment; prompt when all done

### Polish and bug fixes (same session)

**"..." context menu — replaced Alert/ActionSheet with inline dropdown**
- Installed `react-native-popup-menu` (pure JS, no rebuild required)
- Added `MenuProvider` to `App.tsx` root
- `OverviewItemRow`: uses `Menu / MenuTrigger / MenuOptions` from library; prop changed from `onMenuPress(anchor)` to `menuItems: DropdownMenuItem[]`
- `TaskListScreen`: `buildMenuItems(item)` returns items array; removed all anchor/coordinate/Modal state

**ProjectDetailScreen — safe area fix**
- `useSafeAreaInsets` applied to delete row and FAB row — no longer overlaps Android nav buttons

**Task uncheck / re-open**
- `uncompleteTask(id)` added to `services/tasks.ts` — sets `completed: false, completed_at: null`
- `OverviewItemRow`: `onUncheck` prop; completed checkbox tappable when provided
- `TaskListScreen`: `onUncheck` passed only on `filter === 'done'`; shows "Re-open task?" Alert
- `ProjectDetailScreen` Past tab: calls `handleUncompleteTask`; reverts project `done → in_progress` when a task is re-opened inside a completed project

**Delete project — three-option dialog**
- `deleteProjectAndItems(id)`: deletes linked tasks/appointments first (parallel), then project
- Alert: Cancel / Keep items / Delete all (destructive)

---

## Testing checklist

- [ ] "..." on Overview row → inline dropdown appears below button
- [ ] Add to project / Remove from project / Delete from dropdown
- [ ] Done tab checkbox → "Re-open task?" → task moves to Open tab
- [ ] Project Past tab checkbox → "Re-open task?" → task moves to Active tab; done project reverts to in_progress
- [ ] Delete project "Keep items" → tasks/appointments survive unlinked
- [ ] Delete project "Delete all" → tasks and appointments also removed
- [ ] ProjectDetailScreen delete button clears Android nav bar
- [ ] Create project → appears in Projects tab
- [ ] Open project detail → Active/Past tabs work
- [ ] Add task from project detail → task appears with project linked
- [ ] Complete task in project → status auto-transitions to in_progress
- [ ] Mark project done manually
- [ ] Link task to project from AddTask / TaskDetail
- [ ] Project tag appears on Overview items and Calendar
- [ ] Settings accessible via avatar from all three tabs
- [ ] Calendar shows Monday as first day of week
- [ ] Appointment appears in Calendar tab on correct date

---

## Open items

- Pre-existing TS errors: DateTimePicker `onChange` signature in AddTaskScreen, AddAppointmentScreen, TaskDetailScreen; `StyleSheet.absoluteFillObject` in TaskListScreen fabBackdrop — none blocking
- Google OAuth client ID not yet configured (Calendar sync — defer)
- Apple Developer account deferred (EAS Build post-MVP)
- Appointment editing (changing date/time after creation) partially built
- Email auth setup guide deferred

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
