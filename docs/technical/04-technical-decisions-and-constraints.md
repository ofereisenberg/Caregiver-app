# Technical Decisions & Constraints
**Purpose:** Shared reference across chats — captures all tech decisions made during ideation so the tech design chat starts aligned, not from scratch
**Status:** Living document — update as new decisions are made
**Related docs:** `01-situation-and-problem-space.md` (product/domain context), `02-interview-research-log.md` (pain points + MVP scope)
**Last updated:** 2026-06-22 (T1–T6 all resolved)

---

## 1. Platform

| Decision | Choice | Rationale |
|---|---|---|
| App framework | **Expo (React Native) SDK 56** | Cross-platform (Android + iOS) from one codebase; existing familiarity |
| Dev environment | **Windows** | No macOS available — iOS Simulator not an option |
| Primary dev/test device | **Android emulator** (via Android Studio) | Local, no cloud needed for running the app |
| iOS testing during dev | **Expo Go** on physical iPhone | iPhone-owning sister uses Expo Go over local network or Expo tunnel — no Mac or TestFlight needed during dev |
| iOS production builds | **EAS Build** (Expo cloud build service) | Compiles iOS binary without a Mac; **deferred until post-MVP** — not needed while in active dev/testing |
| iOS distribution (when ready) | **TestFlight** | Requires Apple Developer account (€99/year) — defer cost until ready to ship |
| Android distribution (when ready) | Play Store internal testing track or direct APK | TBD |

---

## 2. Backend

| Decision | Choice | Rationale |
|---|---|---|
| Backend service | **Supabase** | Existing familiarity from another project; managed Postgres, auth, realtime, generous free tier |
| Hosting | Supabase managed cloud | No self-hosted infrastructure to maintain |
| Realtime sync | Supabase Realtime (built-in) | Needed so care circle members see each other's updates live (e.g. task assigned, appointment added) |

---

## 3. Data Model

### 3.1 Object types

Two first-class object types. Do not conflate — they have different fields, behaviors, and UI flows.

#### Task
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | |
| title | string | Yes | |
| recurrence | enum / interval | No | One-off or periodic (e.g. every N days) |
| assignee | user ref | No | One person from the care circle |
| visibility | enum | Yes | `private` ("only me") or `shared` (visible + assignable to others) |
| progress_note | string | No | Free-text, readable by all shared users; keep data model generic for later structured status |
| due_date | datetime | No | Required if recurrence is set |
| created_by | user ref | Yes | |
| created_at | timestamp | Yes | |

#### Appointment
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | |
| title | string | Yes | |
| starts_at | datetime | Yes | |
| duration_minutes | integer | No | |
| assignee | user ref | No | One person from the care circle |
| prep_tasks | Task[] | No | Child tasks (Pattern 2) — linked by parent_appointment_id on Task |
| visibility | enum | Yes | `private` ("only me") or `shared` (visible to whole care circle) — default `shared`. Private appointments still push to the creator's own Google Calendar if sync is enabled, but are not visible to other circle members in-app |
| google_calendar_event_id | string | No | Populated after successful Google Calendar push; null if sync not enabled or push failed |
| created_by | user ref | Yes | |
| created_at | timestamp | Yes | |

### 3.2 Relationship patterns

| Pattern | Description | MVP scope |
|---|---|---|
| Pattern 1: Task → Appointment | A scheduling task can be converted into an Appointment on completion — lightweight prompt ("turn this into an appointment?"), no automatic linking | **In MVP** |
| Pattern 2: Appointment → Tasks | An Appointment can have child prep tasks attached (linked via `parent_appointment_id` on Task); shown as a checklist in appointment detail | **In MVP** |
| Pattern 3: Process → Appointment | An Appointment as a milestone within a longer Process/Theme (e.g. PG3 appeal) | **Deferred — post-MVP** (requires Process object type not yet designed) |

---

## 4. Google Calendar Integration

| Decision | Choice |
|---|---|
| Sync direction | **One-way only: app → Google Calendar** |
| Sync scope | **Appointments only** — tasks are not synced to Google Calendar |
| Sync is optional | Yes — app works fully without it; appointments stay in-app if no sync configured |
| Sync granularity | **Per-user setting**, not per appointment (per-appointment override deferred to post-MVP) |
| Auth mechanism | **Google OAuth 2.0** — each user connects their own Google account independently |

### Sync preference options (per user, in Settings)
| Option | Behavior |
|---|---|
| `sync_mine` | Only appointments where I am the assignee are pushed to my Google Calendar |
| `sync_all` | All care circle appointments visible to me (mine + others' shared ones) are pushed to my Google Calendar |
| `no_sync` | No Google Calendar connection; all appointments stay in-app only |

### Sync error handling (to design for)
- Appointment detail shows a subtle sync status indicator: synced ✓ / failed (tap to retry)
- If OAuth token expires or is revoked, user is notified in Settings with a reconnect prompt
- Push failures are non-blocking — the appointment is still created and shared in-app regardless

---

## 5. Notifications & Reminders

| Decision | Choice | Rationale |
|---|---|---|
| Notification wrapper | **Expo Notifications** | Unified API over FCM (Android) and APNs (iOS) |
| Event-driven notifications | Triggered directly from app on state change | Free, no backend scheduler needed |
| Scheduled / timed reminders | **Deferred post-MVP** | Requires Supabase Pro (pg_cron) — defer until adoption justifies cost |
| Appointment reminders | **Google Calendar sync** | User's own Calendar app handles reminders natively — free |
| Email digest | **Deferred post-MVP** | Google Calendar covers the email/reminder angle for free via sync |
| Daily digest (in-app) | **In-app modal on first open each day** | Client-side, computed from Supabase at open time — no backend scheduler |
| Supabase plan | **Free tier** | No pg_cron needed in v0 |
| Push token storage | `user_profile` table (`push_token`, `push_token_updated_at`) | Captured on first app open after permission grant; updated if token rotates |

### Event-driven notification triggers
| Trigger | Who gets notified |
|---|---|
| New shared task created | All circle members |
| Task assigned to someone | That person |
| Task marked complete | Task creator |
| Task due date edited | Assignee |
| New appointment created | All circle members |
| Appointment updated (time/date changed) | All circle members |
| New member joins the circle | All existing members |

### Daily digest (in-app)
- Shown as a modal on first app open each day (tracked via `last_digest_shown_at` on `user_profile`)
- Content: today's appointments, tasks due today, upcoming items in next 3 days, open assigned tasks
- Dismissed with a tap — does not block app use
- Designed to build a daily open habit in early adoption phase

### Config scopes
Three distinct configuration scopes — do not conflate:

| Scope | Where stored | Who controls | UI in v0 |
|---|---|---|---|
| **System config** | `system_config` table (key/value) | Internal / developer | Direct Supabase Studio edit — no user-facing UI in v0 |
| **Circle-level config** | Fields on `care_circle` table | Circle admin | Admin settings screen |
| **User preferences** | Fields on `user_profile` table | Each user | Personal Settings screen |

Examples per scope:
- System: feature flags, email digest enabled globally, experimental feature toggles
- Circle: circle name, default digest time, membership management
- User: notification types on/off, Google Calendar sync preference, digest time override

---

## 6. MVP Scope Boundary

### In v0
- Magic link auth + care circle with invite link join flow
- Shared task list (recurrence, assignee, private/shared visibility flag, free-text progress note)
- Appointments as a distinct object type (datetime, duration, assignee, prep task children)
- In-app calendar view showing tasks + appointments (appointments visually distinct)
- Event-driven push notifications (task assigned, appointment created/changed, etc.)
- Daily digest modal on first open each day (client-side, no backend scheduler)
- Google Calendar one-way sync (optional, per-user setting, appointments only)
- Google OAuth connection flow (optional, skippable during onboarding)
- Settings screen — two levels: user preferences + circle admin config
- `system_config` table for internal feature flags (edited via Supabase Studio in v0)
- Realtime sync on `tasks` and `appointments` tables with reconnect re-fetch
- Pattern 1 (task → appointment conversion) and Pattern 2 (appointment → prep tasks)
- Voice input — AI-powered natural language capture via + bottom sheet; uses Whisper (transcription) + Claude Haiku (parsing); pre-fills Add Task / Add Appointment form for user confirmation

### Explicitly deferred (post-MVP)
- Scheduled / timed push reminders (requires Supabase Pro / pg_cron)
- Email digest (revisit when adoption justifies cost)
- PIN / biometric app lock
- Offline read cache and offline draft queue
- Multi-circle support per user
- Documents/attachments on tasks or appointments
- Master data layer (doctors, Pflegegrad, medications, contacts)
- Two-way Google Calendar sync
- Per-appointment sync override
- Process/Theme object type and Pattern 3 relationship
- Mother as a user / any external-role access
- Authorization beyond simple private/shared flag
- EAS Build / TestFlight production distribution
- System config admin UI (direct Supabase Studio edits in v0)

---

## 7. Auth & Care Circle (T1 — resolved)

| Decision | Choice | Rationale |
|---|---|---|
| Auth mechanism | **Magic link (email)** | No passwords to forget; Supabase handles natively; all users have stable email |
| Session persistence | **Supabase default (long-lived)** | Users rarely need to re-authenticate after first login on a device |
| PIN / biometric lock | **Deferred post-MVP** | Revisit if adoption happens and users request it |
| Care circles per user | **One per user in v0** | Sufficient for family use case; multi-circle deferred |
| Care circle data model | `care_circle` + `care_circle_member` tables | `role` field: `admin` or `member` |
| Join flow | **Invite link** | Shared via WhatsApp/messaging; token stored in `circle_invites` table with expiry |
| First-time profile | **Display name only** | No password, no other fields in v0 |

---

## 8. Realtime Sync (T4 — resolved)

| Decision | Choice | Rationale |
|---|---|---|
| Realtime tables | **`tasks` and `appointments` only** | Core shared objects; membership changes are rare enough to not need realtime |
| Realtime for membership | No — manual refresh acceptable | Member joins are infrequent |
| Reconnect strategy | **Re-fetch full table on reconnect + app foreground** | Realtime does not buffer missed events reliably |
| Sync status indicator | Subtle UI indicator (live / reconnecting) | Keeps users aware of connection state |

---

## 9. Offline Behavior (T5 — resolved)

| Decision | Choice | Rationale |
|---|---|---|
| Offline behavior | **Online required — v0** | Keeps data layer simple; Supabase is single source of truth |
| Read cache | Not implemented in v0 | Deferred |
| Offline draft queue | **Deferred post-MVP** | Revisit if adoption happens and users flag offline use as painful |
| Revisit trigger | User feedback indicating offline use is genuinely painful | e.g. airplane / hospital basement scenarios |

---

## 10. Google OAuth Token Management (T3 — resolved)

| Decision | Choice | Rationale |
|---|---|---|
| Token storage | **Supabase Vault (server-side, encrypted)** | Tokens needed server-side for Edge Function calendar push |
| Device-side token storage | None | Not needed — sync happens server-side |
| Token refresh | **Handled transparently in Edge Function on 401** | User never sees token expiry |
| Revocation detection | Unrecoverable 401 → `google_calendar_connected: false` on `user_profile` | Surfaces as reconnect prompt in Settings |

---

## 11. Google Calendar API Quotas (T6 — resolved)

Not a concern at family app scale (4–5 users, few appointments per day). Free quota is 1,000,000 requests/day. No quota management needed in v0.

---

## 12. Voice Input (resolved)

| Decision | Choice | Rationale |
|---|---|---|
| Voice input in MVP | **Yes** | High value, low friction — convenience for users who don't want to type; extensible to future use cases |
| Entry point | **+ bottom sheet** | Three options: Add Task / Speak it / Add Appointment — mic at equal visual weight, not buried in a form |
| Transcription service | **Whisper API (OpenAI)** | More accurate than device-native; handles German/English mixing; ~$0.006/min |
| Parsing service | **Claude Haiku 4.5** | Sufficient for structured extraction; ~$0.001 per call |
| Parsing approach | **AI infers task vs appointment** | User corrects type on confirmation screen if wrong — keeps bottom sheet to 3 options |
| Confirmation | **Pre-filled standard form** | No new screen — lands on existing Add Task / Add Appointment with fields populated; user reviews and saves |
| Failure handling | **Graceful drop to empty manual form** | Soft non-alarming message; voice failure never blocks manual entry |
| Secondary entry point | **Inline mic in title fields** | Device-native dictation only (not AI parsing) — for title-only dictation on manual forms |
| Architecture | **`services/voiceInput.ts` — reusable, schema-agnostic** | Same service used for task, appointment, and future use cases; callers pass target schema |
| API calls route | **Supabase Edge Functions** | Whisper and Anthropic API keys never exposed to client bundle |
| Model locked in config | **`VOICE_PARSE_MODEL=claude-haiku-4-5`** | Controlled via `.env` — never hardcoded |
| Token cap | **`max_tokens: 300`** | Controlled via `.env` — `VOICE_PARSE_MAX_TOKENS=300` |
| Estimated monthly cost | **~$0.45/month** at typical family usage | Negligible; even at 10x usage under $5/month |
