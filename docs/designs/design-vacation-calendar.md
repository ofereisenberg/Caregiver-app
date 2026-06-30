# Design: Vacation Entries & Collapsible Calendar

**Status:** Agreed — ready for implementation
**Date:** 2026-06-30
**Features:** F16 (On-vacation range), collapsible calendar (prerequisite)

---

## Overview

Two intertwined features:
1. A **collapsible calendar** that toggles between a compact dot view and an expanded item-text view
2. A new **vacation entry type** that appears as a red range across the calendar so circle members can see at a glance who is unavailable

---

## 1. Collapsible Calendar

### States
Exactly two states, toggled by swipe gesture:

| State | Trigger | Layout |
|---|---|---|
| Collapsed | Swipe up | Mini-month grid + day-event panel below |
| Expanded | Swipe down | Larger grid with item text in cells |

### Swipe Gestures
- **Swipe up** → collapse; **swipe down** → expand
- **Swipe left/right** → move to previous/next month (works in both states)
- In **collapsed state only**: swiping left/right on the bottom day-event panel moves day by day (prev/next day)

### Collapsed State Layout
```
  M  T  W  T  F  S  S
1  .  .  .  .  .  .  .
2  .  .  .  .  .  .  .
3  .  .  .  .  .  .  .
4  .  .  .  .  .  .  .
```
- Header row: M T W T F S S (day initials)
- Left column: calendar week number
- Each cell: date number (1–31) + colored dots for any items that day
- Bottom panel: scrollable event list for the selected day; swipe left/right to move day

### Expanded State Layout
```
  M    T    W    T    F    S    S
1 [1]  [2]  [3]  [4]  [5]  [6]  [7]
   Task   Appt        Vac
   Task              +1
2 [8]  [9]  ...
```
- Same column/row structure as collapsed
- Cells are taller to accommodate text
- Each cell shows up to **3 items** at **1–2 words** each (truncated)
- If more than 3 items: show **+X** badge below the third line
- Tapping any day cell opens the Day Detail modal

### Color Coding
| Item type | Color |
|---|---|
| Vacation | Red |
| Appointment | Blue |
| Task | Green |

---

## 2. Vacation Entry Object

### Fields
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| circle_id | uuid | FK → care_circle |
| user_id | uuid | Owner — the person on vacation |
| title | string | Free text, e.g. "Sam is in Denmark" |
| start_date | date | Inclusive |
| end_date | date | Inclusive |
| with_member_ids | uuid[] | Other circle members joining this vacation |
| created_at | timestamp | |

No location, no repeat, no project assignment.

### Permissions
- **Create**: self-only — you log your own vacation
- **Read**: all circle members can see all vacations in their circle
- **Edit / Delete**: only the owner (user_id)

### "With" Members
When you tag other circle members in the "with" field, the vacation range appears on their calendar view too (read-only). Implemented via the `with_member_ids` array — the calendar query fetches vacations where `user_id = me` OR `me ∈ with_member_ids`, in addition to all other circle vacations visible to everyone.

### Vacation Assignment Warning
When a user assigns a task or appointment to someone who is on vacation during the selected date range, show a non-blocking warning:
> "⚠️ [Name] is on vacation during this period"

Does not block saving.

---

## 3. Vacation Visual in Calendar

### Collapsed state
Red dot in each day cell that falls within the vacation range. Same dot style as tasks/appointments but red.

### Expanded state
**Option B (chosen):** Full-width red background fill across the entire day cell for every day within the range. The vacation title is shown as text only in the **first cell** of the range. Subsequent cells show the red fill only (no repeated title text). Handles week-row wrapping naturally since each cell is independent.

```
[Mon]        [Tue]         [Wed]
█ Sam is in  █████████████  █████████████
  Denmark
```

---

## 4. Day Detail Modal Screen (new)

Triggered by tapping any day cell in either calendar state.

- Full-screen modal or bottom sheet
- Header: day name + date (e.g. "Monday, 30 June")
- Lists all items for that day:
  - Vacations (red label)
  - Appointments (blue label)
  - Tasks (green label)
- **View-only** for now — no editing from this screen
- Dismiss by tapping close or swiping down

---

## Deferred / Out of Scope

- Other members adding a vacation on someone else's behalf (post-MVP)
- Spanning banner that stretches across day-cell borders (Google Calendar style) — deferred, revisit after B is shipped
- External (non-circle) people in the "with" field
- Push notification when a vacation is logged
