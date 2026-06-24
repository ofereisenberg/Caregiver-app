# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Project scaffold complete. Supabase project not yet created. No screens built yet.

**Next up:** Supabase setup → schema + migrations → auth flow

---

## What was done this session (2026-06-24) — Scaffold + docs

- Connected local repo to GitHub remote (`ofereisenberg/Caregiver-app`), merged `main` branch
- Established folder structure: `src/` with screens, components, hooks, services, navigation, utils, types, constants; `supabase/` with Edge Function stubs and migrations placeholder
- Created `src/constants/config.ts` (env var loading + startup validation) and `src/constants/theme.ts` (colors, spacing, font sizes, border radii)
- Created `.env.example` with all required keys; fixed `.gitignore` to exclude `.env`
- Created Edge Function stubs: `supabase/functions/voice-transcribe/` and `supabase/functions/voice-parse/`
- Updated `docs/technical/04-technical-decisions-and-constraints.md`: appointments now have `visibility: private | shared` (same as tasks) — private appointments push to creator's own Google Calendar but are not visible to other circle members in-app
- Created `docs/project-context.md` — living session reference
- Created `docs/next_session.md` (this file)
- Added session startup instructions to `CLAUDE.md`

---

## Next steps

### Step 1 — Supabase project setup
- [ ] Create Supabase project at supabase.com
- [ ] Copy project URL + anon key into `.env`
- [ ] Run `npx expo install @supabase/supabase-js`
- [ ] Create `src/services/supabase.ts` — initialise client from `config.ts`

### Step 2 — Schema + migrations
Tables to create (in dependency order):
- [ ] `user_profile` — `id` (refs auth.users), `display_name`, `push_token`, `push_token_updated_at`, `last_digest_shown_at`, `google_calendar_connected`, `google_calendar_sync_preference` (`sync_mine` | `sync_all` | `no_sync`)
- [ ] `care_circle` — `id`, `name`, `created_by`
- [ ] `care_circle_member` — `circle_id`, `user_id`, `role` (`admin` | `member`), `joined_at`
- [ ] `circle_invites` — `id`, `circle_id`, `token`, `created_by`, `expires_at`, `used_at`
- [ ] `tasks` — all Task fields from doc 04; `parent_appointment_id` nullable FK
- [ ] `appointments` — all Appointment fields from doc 04
- [ ] `system_config` — `key`, `value` (key/value feature flags; no user-facing UI in v0)
- [ ] RLS policies: shared tasks/appointments visible to all authenticated users; private to creator only
- [ ] Enable Realtime on `tasks` and `appointments`

### Step 3 — Auth flow screens
Magic link auth + care circle onboarding (15 screens total — see doc 03)

---

## Open items

- Supabase project URL and anon key not yet populated in `.env`
- Google OAuth client ID not yet configured (needed for Calendar sync — can defer)
- Apple Developer account deferred (EAS Build / TestFlight post-MVP)

---

## Infrastructure

Supabase CLI: not yet installed for this project.
