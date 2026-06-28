# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Project Notes feature complete. Release APK build infrastructure in place — app successfully sideloaded and running on a second device. All core features are done.

---

## What was done this session (2026-06-28)

### Project Notes feature

**Migration `20260628000000_project_notes.sql`**

- New `project_notes` table: `id`, `project_id`, `circle_id`, `content`, `created_by`, `created_at`
- RLS: circle members can read and insert; authors can delete their own notes
- Applied via `supabase db push` — live in production
- TypeScript types regenerated via `supabase gen types typescript --linked`

**`src/services/projectNotes.ts`** — new file

- `getProjectNotes(projectId)` — fetches all notes for a project, newest first
- `addProjectNote(projectId, circleId, content, createdBy)`
- `deleteProjectNote(noteId)`

**`src/hooks/useProjectNotes.ts`** — new file

- `notes`, `loading`, `error`, `refresh`, `addNote`, `removeNote`
- Realtime subscription on `project_notes` filtered by `project_id`
- Optimistic delete (removes from local state, reverts on DB error)

**`src/screens/app/ProjectDetailScreen.tsx`**

- Notes tab (between Active and Past), with note count badge
- FlatList of notes + compose row (TextInput + send icon)
- Note rows: author avatar (initial), author name, timestamp, content
- Long-press on own note → delete confirmation alert

### Release APK build infrastructure

**Bug fix — `src/constants/config.ts`**

- `requireEnv(key)` used dynamic `process.env[key]` access, which Expo's Babel transform cannot substitute at bundle time (it only substitutes static `process.env.LITERAL_KEY` references)
- Fixed to pass the already-accessed value: `requireEnv(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL')`

**`build-release.ps1`** — new file

- Prompts for version number (Enter = keep current)
- Auto-increments `versionCode` in `build.gradle`
- Updates `version` in `app.json` and `versionName` in `build.gradle`
- Deletes cached bundles to force fresh JS bundling
- Builds release APK
- Copies to `releases/v{version}/caregiver-app-v{version}.apk`

**`buildandroid.bat`** — new file

- Double-click launcher for `build-release.ps1`

**`package.json`**

- Added `build:android` npm script → `npm run build:android`

**`.gitignore`**

- Added `releases/` (APK files should not be committed)

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
