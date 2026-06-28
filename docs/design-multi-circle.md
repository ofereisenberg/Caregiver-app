# Design: Multi-Circle Support

**Status:** Agreed — ready to implement
**Date:** 2026-06-28

---

## Problem

The app currently assumes one care circle per user. A user who belongs to multiple circles (e.g. a care circle for a parent AND a family task circle) has no way to create, switch, or distinguish between them.

---

## Use Case

Same user, multiple circles with different purposes and potentially different members. Example: "Mutti care" (family caregiving) and "Family tasks" (household coordination with spouse). Each circle has its own tasks, appointments, projects, and members.

---

## Data

### `user_profile.active_circle_id`

Add a nullable FK column `active_circle_id uuid REFERENCES care_circle(id)` to `user_profile`.

- Loaded once at login into `AuthContext` and held in memory for the session
- Written to DB only when the user explicitly switches circles
- All hooks read `circleId` from context — no extra DB queries per navigation

### Null handling

| User state | Behaviour |
|---|---|
| Member of exactly 1 circle | Auto-select it silently, write `active_circle_id`, no UX change |
| Member of 2+ circles, `active_circle_id` is null | Show a one-time "Choose a circle" picker before entering the app |
| Member of 0 circles | Existing `needs_circle` onboarding path, unchanged |

---

## Creating a Circle

- Entry point: "+" button next to the "Circles" heading in Settings
- User enters a circle name → circle created, user added as admin
- Returned to the Settings Circles list — new circle appears in the list
- The current active circle does **not** change on creation; user switches explicitly

---

## Switching Circles

### Settings > Circles section

Each row shows:
- Circle name
- Member count
- Checkmark (✓) on the currently active circle

Tapping a **non-active** circle row:
- Immediately sets it as active (writes `active_circle_id` to DB, updates context)
- Checkmark moves to the new circle
- All app data (tasks, appointments, projects) refreshes to the new circle's data

Tapping **any** circle row also drills into that circle's detail screen (members list, invite management) — reusing the existing circle settings flow.

### "+" button

Placed next to the "Circles" section heading in Settings. Opens a simple create-circle form (name input + confirm).

---

## Active Circle Visibility

The active circle name is always visible in the header of all main screens:
- Overview / Task list
- Appointments / Calendar
- Projects

This ensures the user always knows which circle's data they are viewing, especially important when switching between circles with similar content.

---

## What Does Not Change

- The invite flow (generate code → share → recipient enters it) is unchanged and accessed from the circle detail screen in Settings, same as today
- Onboarding for new users (Create Circle / Join Circle) is unchanged
- RLS policies already scope data by `circle_id` — no security changes needed
- All existing data hooks already accept `circleId` as input — no hook signature changes needed

---

## Implementation Scope

### New
- DB migration: add `active_circle_id` to `user_profile`
- Service: `getUserCircles(userId)` — returns all circles for a user
- Service: `setActiveCircle(userId, circleId)` — writes `active_circle_id`
- AuthContext: expose `activeCircleId` + `setActiveCircleId` from loaded profile
- Null-default logic in AuthContext (auto-select if 1 circle, show picker if 2+)
- Settings: Circles section becomes a list (name, member count, checkmark), with "+" button
- Create Circle entry point from Settings (can reuse or adapt existing CreateCircleScreen)

### Changed
- `useCircle()` — reads active circle from context instead of calling `getUserCircle()` (first-found)
- All main screen headers — show active circle name consistently

### Unchanged
- Circle detail / invite flow
- Onboarding screens
- RLS policies
- Hook signatures
