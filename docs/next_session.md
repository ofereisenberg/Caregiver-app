# Next Session Handoff

> Overwrite this file at the end of each session. Do not append — replace.

---

## Current Status

Schema live in Supabase. Navigation skeleton complete. Ready to build screens.

**Next up:** Enter Email screen (first real screen) → full auth flow

---

## What was done this session (2026-06-24) — Dependencies, Schema, Design tokens, Navigation

- Installed all MVP dependencies: `@react-navigation/native`, `native-stack`, `bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`, `expo-secure-store`, `expo-av`, `expo-notifications`, `@react-native-community/netinfo`
- Updated `src/services/supabase.ts` to use `expo-secure-store` for session persistence (`autoRefreshToken`, `persistSession`, `detectSessionInUrl: false`)
- Wrote `supabase/migrations/20260624120000_initial_schema.sql` — full schema: 3 enums, 7 tables, 8 indexes, 4 helper functions (`is_circle_member`, `is_circle_admin`, `shares_circle_with`, `create_care_circle`), trigger (`handle_new_user`), 18 RLS policies, Realtime on tasks + appointments
- Applied migration to Supabase via CLI (`supabase db push`)
- Generated TypeScript types → `src/types/database.ts` (from live schema, not hand-written)
- Extracted design tokens from `Care for Mutti - Design System.dc.html` and replaced placeholder `src/constants/theme.ts` with full token set: colors (canvas, surface, sage palette, overdue, waiting, neutrals, text), spacing, font sizes, font weights, border radii, shadows
- Added Section 10 (Testing) to `CLAUDE.md` — when to suggest tests, where to put test files, when to defer
- Created navigation skeleton:
  - `src/navigation/types.ts` — typed param lists for AuthStack, AppStack, BottomTabParamList
  - `src/hooks/useAuthState.ts` — Supabase session listener; drives auth gate
  - `src/navigation/AuthNavigator.tsx` — EnterEmail → CheckEmail → SetupProfile → SetupCircle → InviteManagement
  - `src/navigation/AppNavigator.tsx` — bottom tabs (Tasks/Calendar) + modal stack (AddTask, AddAppointment, DailyDigest) + push screens (TaskDetail, AppointmentDetail, UserSettings, CircleAdmin, InviteManagement)
  - `src/navigation/RootNavigator.tsx` — auth gate: spinner → Auth or App based on Supabase session
  - `App.tsx` — SafeAreaProvider + NavigationContainer + RootNavigator
  - 14 screen stubs (auth/app/settings) — all placeholder, ready to fill in

### Design files location

`C:\Users\ofere\Projects\MVP handoff for design-handoff\mvp-handoff-for-design\project\`

- `Care for Mutti - Design System.dc.html` — full design system (already extracted into theme.ts)
- `Caregiver Coordination Wireframes.dc.html` — interactive wireframes for all 15 screens (use as visual spec per screen)
- `screenshots/` — PNG screenshots of each wireframe screen

---

## Next steps

### Step 2 — Auth flow screens (build in order)

1. **EnterEmailScreen** — single email field, "Send me a sign-in link" button; magic link via `supabase.auth.signInWithOtp`
2. **CheckEmailScreen** — confirmation + resend; receives `email` param from EnterEmail
3. **SetupProfileScreen** — display name field; updates `user_profile.display_name`; shown only when `display_name === ''`
4. **SetupCircleScreen** — two options: Create circle (calls `create_care_circle` RPC) or Join via invite link (validates token from `circle_invites`)
5. **InviteManagementScreen** — admin generates/copies invite link; shows current members

For each screen: build service function first → hook if needed → screen component.

### Font setup (do before first screen)

Install Hanken Grotesk: `npx expo install @expo-google-fonts/hanken-grotesk expo-font`
Wire up font loading in App.tsx with `useFonts` hook before rendering navigator.

---

## Open items

- Hanken Grotesk font not yet installed/loaded (theme.ts has the token names ready)
- Google OAuth client ID not yet configured (needed for Calendar sync — can defer)
- Apple Developer account deferred (EAS Build / TestFlight post-MVP)

---

## Infrastructure

Supabase project ID: `icmtktdbqrcgtbeiggdc`
Supabase project URL: `https://icmtktdbqrcgtbeiggdc.supabase.co`
CLI access token: in `.env.local` (same as family-hub)
GitHub: `ofereisenberg/Caregiver-app`
