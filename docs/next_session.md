# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Supabase project created and connected. Client installed. Schema + migrations not yet written.

**Next up:** Schema migrations → Auth flow screens

---

## What was done this session (2026-06-24) — Scaffold + Supabase setup

- Connected local repo to GitHub remote (`ofereisenberg/Caregiver-app`), merged `main` branch
- Established folder structure: `src/` (screens, components, hooks, services, navigation, utils, types, constants) + `supabase/` (Edge Function stubs + migrations placeholder)
- Created `src/constants/config.ts` and `src/constants/theme.ts`
- Created `.env.example`, `.env` (gitignored, populated), `.env.local` (gitignored, for Supabase CLI token)
- Created Edge Function stubs: `voice-transcribe` and `voice-parse`
- Updated appointments data model: `visibility: private | shared` (same as tasks)
- Created `docs/project-context.md` and `docs/next_session.md`
- Added session startup protocol to `CLAUDE.md`; removed redundancy between CLAUDE.md and project-context.md
- Installed `@supabase/supabase-js` via `npx expo install`
- Created `src/services/supabase.ts` — single shared Supabase client

### Supabase project details
- Project URL: `https://icmtktdbqrcgtbeiggdc.supabase.co`
- Anon key: in `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- CLI token: in `.env.local` as `SUPABASE_ACCESS_TOKEN` (same token as family-hub)

---

## Next steps

### Step 1 — Schema + migrations
Tables to create (in dependency order):
- [ ] `user_profile` — `id` (refs auth.users), `display_name`, `push_token`, `push_token_updated_at`, `last_digest_shown_at`, `google_calendar_connected`, `google_calendar_sync_preference` (`sync_mine` | `sync_all` | `no_sync`)
- [ ] `care_circle` — `id`, `name`, `created_by`
- [ ] `care_circle_member` — `circle_id`, `user_id`, `role` (`admin` | `member`), `joined_at`
- [ ] `circle_invites` — `id`, `circle_id`, `token`, `created_by`, `expires_at`, `used_at`
- [ ] `tasks` — all Task fields from doc 04; `parent_appointment_id` nullable FK to appointments
- [ ] `appointments` — all Appointment fields from doc 04
- [ ] `system_config` — `key`, `value` (key/value feature flags; no user-facing UI in v0)
- [ ] RLS policies: shared tasks/appointments visible to all authenticated users; private to creator only
- [ ] Enable Realtime on `tasks` and `appointments`

### Step 2 — Auth flow screens
Magic link auth + care circle onboarding (15 screens total — see `docs/product/03-mvp-handoff-for-design`)

---

## Open items

- Supabase CLI not yet installed/linked for this project
- Google OAuth client ID not yet configured (needed for Calendar sync — can defer)
- Apple Developer account deferred (EAS Build / TestFlight post-MVP)

---

## Infrastructure

Supabase project ID: `icmtktdbqrcgtbeiggdc`
CLI access token: in `.env.local` (same as family-hub)
