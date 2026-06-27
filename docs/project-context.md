# Caregiver App — Project Context

> Load this at session start. Edit freely — this is a living reference, not a spec.
> Last updated: 2026-06-26

---

## 1. What is this project?

A shared coordination app for a family caring for a mother (70+) with younger-onset Alzheimer's (frontal variant, Germany). Three adult daughters + partners form the care circle. The core pain is mental load — one person holding the whole picture in their head. The app distributes that load across the circle with minimal friction.

**Design principle:** Near-zero data entry friction above all else. If adding something costs more time than it saves, the feature failed.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Expo SDK 56 (React Native) | Cross-platform; read versioned docs at https://docs.expo.dev/versions/v56.0.0/ |
| Language | TypeScript | Strict mode; no `any` |
| Backend | Supabase | Postgres + Auth (magic link) + Realtime + free tier |
| Realtime | Supabase Realtime | `tasks` and `appointments` tables only |
| Auth | Magic link (email) | No passwords; Supabase handles natively |
| AI — transcription | OpenAI Whisper API | Via Supabase Edge Function; never called from client |
| AI — parsing | Claude Haiku 4.5 | Via Supabase Edge Function; max_tokens: 300 |
| Google Calendar | One-way push (app → Google) | Appointments only; per-user setting; optional |
| Dev platform | Windows + Android physical device | No Mac; primary test device is Samsung Galaxy S10e (SM_G975F, ADB serial R58M53P4QDM) |
| iOS builds | EAS Build | Deferred post-MVP |

---

## 3. Folder Layout

```
src/
  screens/       navigation targets; compose components, wire up hooks
  components/    reusable UI; props in, events out; no Supabase calls
  hooks/         data fetching, mutations, derived state
  services/      Supabase calls, Google Calendar API, push notifications
  navigation/    stack/tab navigator config
  utils/         pure functions; no side effects
  types/         shared TypeScript interfaces
  constants/
    config.ts    all env var access; the only file that reads process.env
    theme.ts     colors, spacing, font sizes, border radii
supabase/
  functions/
    voice-transcribe/   Whisper API call (stub)
    voice-parse/        Claude Haiku parsing call (stub)
  migrations/
assets/
docs/
  product/       situation, interview research log, MVP handoff
  technical/     tech decisions and constraints
.env             never committed
.env.example     committed; all required keys listed
```

---

## 4. Data Model

Two first-class object types — do not conflate:

### Task
`id`, `title`, `recurrence` (one-off or periodic), `assignee` (one circle member), `visibility` (`private` | `shared`), `progress_note` (free text), `due_date`, `created_by`, `created_at`

### Appointment
`id`, `title`, `starts_at`, `duration_minutes`, `assignee`, `visibility` (`private` | `shared`, default `shared`), `google_calendar_event_id`, `created_by`, `created_at`
Child prep tasks linked via `parent_appointment_id` on Task (Pattern 2).

### Relationship patterns
- **Pattern 1** — Task → Appointment: scheduling task converts to appointment on completion (prompt, not automatic) — **in MVP**
- **Pattern 2** — Appointment → Tasks: appointment has child prep tasks as a checklist — **in MVP**
- **Pattern 3** — Process → Appointment: deferred post-MVP (requires Process/Theme object)

---

## 5. Feature Status

| Feature | Status |
|---|---|
| Project scaffold + folder structure | Done |
| Supabase setup + schema | Done |
| Auth (magic link + care circle + invite flow) | Done |
| Task list screen | Done |
| Task detail + editing | Done |
| Appointment screen + detail | Done |
| Calendar view | Done |
| Settings screens (user + circle admin) | Done |
| Push notifications | Not started (Step 8) |
| Daily digest modal | Not started (Step 9) |
| Google Calendar sync | Not started |
| Voice input (Whisper + Haiku) | Not started (Step 11) — expo-av removed until then |

---

## 6. Dev Environment

**Full setup guide:** [docs/technical/05-android-dev-build-setup.md](technical/05-android-dev-build-setup.md)

The app runs as an Expo development build (not Expo Go — SDK 56 is incompatible with Expo Go SDK 54).

**Build command (PowerShell):**

```powershell
$env:ANDROID_SERIAL = "R58M53P4QDM"
$env:JAVA_HOME = "C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "C:\Users\ofere\AppData\Local\Android\Sdk"
npx expo run:android
```

**Key constraints:**

- Requires JDK 17 (Eclipse Temurin) AND JDK 21 (Android Studio JBR) — both must be registered in `android/gradle.properties`
- After every `npm install`: re-comment the Foojay plugin line in `node_modules/@react-native/gradle-plugin/settings.gradle.kts` (see guide)
- `newArchEnabled=false` in `android/gradle.properties` — New Architecture is disabled; causes runtime crashes with some Expo modules on this project
- `expo-av` is not installed — removed due to a `LazyKType` version incompatibility crash; add it back with `npm install expo-av` when building voice input (Step 11)

---

## 6. Active Design Docs

| Doc | Topic |
|---|---|
| [docs/product/01-situation-and-problem-space.md](product/01-situation-and-problem-space.md) | Background, user problem, Germany context, open questions |
| [docs/product/02-interview-research-log.md](product/02-interview-research-log.md) | Pain points, MVP scoring, stakeholder map |
| [docs/product/03-mvp-handoff-for-design](product/03-mvp-handoff-for-design) | Screen list, data model for wireframes, design tone |
| [docs/technical/04-technical-decisions-and-constraints.md](technical/04-technical-decisions-and-constraints.md) | All resolved tech decisions: auth, data model, Google Calendar, notifications, voice input, offline |
| [docs/technical/05-android-dev-build-setup.md](technical/05-android-dev-build-setup.md) | Android dev build setup for Windows — JDK setup, Foojay fix, device targeting, known errors |

---

## 7. Database Access

Supabase CLI is installed and authenticated. The Caregiver App project (`icmtktdbqrcgtbeiggdc`) is linked.
Run SQL against the remote DB directly — **always ask the user before running destructive queries** (DROP, DELETE, ALTER):

```powershell
cd "c:\Users\ofere\Projects\caregiver-app"
supabase db query "YOUR SQL HERE" --linked
```

Regenerate TypeScript types after schema changes:

```powershell
supabase gen types typescript --linked > src/types/database.ts
```

## 8. Known Open Items

- Google OAuth client ID not yet configured (Calendar sync)
- Apple Developer account deferred (EAS Build post-MVP)
