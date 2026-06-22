# Interview & Research Log
**Status:** Living document — append-only during interviews, cleaned up after
**Purpose:** Capture raw findings from family interviews, scored against MVP criteria as we go
**Related:** see `01-situation-and-problem-space.md` for background/definitions

---

## 0. How to use this doc

Goal of the interview process isn't just understanding pain — it's identifying **what to build first**. Every pain point captured below should be evaluated on two axes:

- **Severity/frequency** — how much does this hurt, how often? (High / Medium / Low)
- **Build feasibility** — how fast could a first version realistically address this? (Fast / Medium / Slow)

**MVP candidates = High severity + Fast/Medium feasibility.** Things that are high pain but slow to build become "v2" backlog. Things that are low pain regardless of feasibility get parked. This scoring is a first-pass gut call during the interview — refine after multiple interviews once patterns repeat across family members.

```
                High feasibility (fast)        Low feasibility (slow)
High severity   → MVP candidate                → Backlog (v2+), revisit if scope shrinks
Low severity    → Maybe, if trivial             → Park / ignore for now
```

---

## 1. Open Questions Checklist (from problem space doc)

Carry into interview, check off as answered, link to the entry number below where captured.

- [ ] Q1. Who is the Hausarzt and neurologist (names/contact)? Centralized anywhere already?
- [ ] Q2. What stage is the PG3 appeal at right now? Known timeline?
- [ ] Q3. Who currently "holds" the most context — concentrated or distributed?
- [ ] Q4. What does a typical week of coordination look like right now?
- [ ] Q5. What's been tried already (apps, notes, group chats) and why did it stop?
- [ ] Q6. How does mom want to be involved — autonomy/privacy boundaries?
- [ ] Q7. Geographic distribution of the three sisters?
- [ ] Q8. Other ongoing themes beyond the PG appeal already active?
- [ ] Q9. What master data already exists somewhere that needs migrating in?

---

## 2. Pain Point Capture Template

Copy this block per distinct pain point raised:

```
### [P#] Short title

- **Date / Source:** (e.g. 2026-06-22, wife)
- **Quote (verbatim or close paraphrase):**
- **Category:** capture / triage / delegation / visibility / medical-admin / emotional load / other
- **Current workaround:**
- **Failure mode (what breaks, what happened last time):**
- **Frequency/Severity:** High / Medium / Low — why
- **Build feasibility:** Fast / Medium / Slow — why
- **MVP candidate?** Yes / No / Maybe — reasoning
- **Related open question(s):** (Q#)
```

---

## 3. Stakeholder Map

Fill in as you learn more about who needs what visibility:

| Stakeholder | Needs to see | Needs to act on | Should NOT see/control |
|---|---|---|---|
| Wife | TBD | TBD | TBD |
| Sister 1 | TBD | TBD | TBD |
| Sister 2 | TBD | TBD | TBD |
| You | TBD | TBD | TBD |
| Mom | TBD | TBD | TBD |

---

## 4. Interview Entries

### Session 1 — 2026-06-22 (approx, first informal discussion)
**Participants:** Wife
**Context:** Informal conversation, not yet a structured interview — first-pass signal

### [P1] Mental load of tracking tasks/topics across sisters

- **Date / Source:** 2026-06-22, wife
- **Quote (paraphrase):** "The main pain is the mental load of all the tasks and topics she and her sisters need to take care of."
- **Category:** capture, triage, delegation (overlaps all three — this is the umbrella pain point)
- **Current workaround:** Holding it in her head / informal channels (calls, texts) — per original problem space doc
- **Failure mode:** Not yet detailed — TBD in follow-up (what specifically gets dropped or duplicated?)
- **Frequency/Severity:** High — explicitly named as the #1 priority pain point
- **Build feasibility:** Medium — a shared task list with priority is buildable fast as a v0; the "connect extra data to it" part needs more definition before estimating
- **MVP candidate?** Yes — this is the core MVP driver
- **Related open question(s):** Q3, Q4, Q5

### [P2] Friction of data entry — must be near-zero effort

- **Date / Source:** 2026-06-22, wife
- **Quote (paraphrase):** She doesn't want an app that costs her more time inserting data than it saves.
- **Category:** capture
- **Current workaround:** N/A — this is a constraint on the solution, not a separate pain point
- **Failure mode:** This is likely *why* prior attempts (apps, shared notes — see Q5) didn't stick, if any were tried. Worth confirming directly.
- **Frequency/Severity:** High — explicitly stated as a non-negotiable, not a nice-to-have
- **Build feasibility:** N/A (constraint, not a feature)
- **MVP candidate?** N/A — this is a *design constraint on every MVP feature*, not a feature itself. Treat as a gate: any MVP feature that requires meaningful manual data entry should be reconsidered or simplified before building.
- **Related open question(s):** Q5

### [P3] Task model needs: recurrence, assignment, visibility scope

- **Date / Source:** 2026-06-22, wife (follow-up)
- **Quote/paraphrase examples given:** "arrange care coverage while we're on vacation," "make sure her nails get cut every few days," "prepare a Patientenverfügung"
- **Category:** capture, delegation, visibility
- **Requirements surfaced:**
  - Tasks need a **recurrence definition** (one-off vs. periodic, e.g. "every few days")
  - Tasks need **assignment** to a specific person from the care circle
  - Tasks need a **visibility scope**: *personal* (private, not shared) vs. *public* (shared, assignable to others) — this is a first-class distinction, not an afterthought
  - **Progress tracking** is needed, not just done/not-done — implies status beyond binary completion, and others should be able to *read* that progress/log
- **Failure mode:** N/A — these are forward-looking requirements, not yet-observed failures
- **Frequency/Severity:** High — these three examples span very different task types (logistics, recurring physical care, legal/admin), suggesting the model needs to be general-purpose from the start
- **Build feasibility:** Medium — recurrence + assignment + visibility flag are standard patterns, not exotic; progress-as-log (vs. binary done) adds some scope
- **MVP candidate?** Yes — this *is* the MVP task model
- **Related open question(s):** Q3, Q6, Q8

### [P4] Calendar view / Google Calendar connection

- **Date / Source:** 2026-06-22, wife (follow-up)
- **Quote/paraphrase:** Wants a calendar view, ideally connected to (or generating) a Google Calendar
- **Category:** visibility, capture
- **Current workaround:** Presumably each person's own calendar/memory, disconnected from shared tasks
- **Failure mode:** TBD — worth asking if a shared calendar was tried before and why it didn't stick (Q5)
- **Frequency/Severity:** High — named explicitly as "very important"
- **Build feasibility:** Medium — a calendar *view* of tasks-with-dates inside the app is straightforward; two-way sync to Google Calendar is a meaningfully bigger lift (auth, sync conflicts, write-back). Worth scoping these as two separate options (see open question below).
- **MVP candidate?** Yes for an in-app calendar view of dated tasks. Two-way Google Calendar sync should be evaluated separately — may be v1.5 rather than v0 depending on effort.
- **Related open question(s):** Q13 (new, see below)

### [P5] Reminders/notifications (surfaced via Q13 tradeoff)

- **Date / Source:** 2026-06-22, wife (follow-up, in response to calendar scoping question)
- **Context:** Choosing in-app calendar view over Google Calendar sync for v0 means losing notification/reminder behavior that Google Calendar would provide for free
- **Category:** capture, visibility
- **Requirement:** App needs its own reminder/notification mechanism for dated and recurring tasks, since this won't be inherited from Google Calendar in v0
- **Frequency/Severity:** High — without this, the in-app calendar view alone may not actually reduce mental load (the whole point is not having to remember to check)
- **Build feasibility:** Medium — push/local notifications are standard, but worth scoping early since it's now load-bearing for the MVP's core value, not a nice-to-have
- **MVP candidate?** Yes — effectively promoted from "implicit, came free with Google Calendar" to "explicit must-build"
- **Related open question(s):** Q13

### [P6] Appointments as a distinct object type from tasks

- **Date / Source:** 2026-06-22, wife (follow-up after low-fi design session)
- **Quote/paraphrase:** Identified two main types: to-do tasks AND appointments with specific date/time — the latter need to appear in her Google Calendar alongside personal appointments (son's school, her own events)
- **Category:** visibility, capture
- **Requirement:** Appointments are a first-class object type, not just a task with a date. Key distinction: appointments have a specific datetime + duration, belong on a calendar, and need to appear where the user already plans her day (Google Calendar) — not just inside the app
- **Failure mode:** If appointments only live in the app, user still has to mentally merge two calendars — the core "full picture" problem isn't solved
- **Frequency/Severity:** High — this directly addresses the mental load problem for time-bound commitments
- **Build feasibility:** Medium — Appointment object itself is simple; Google Calendar one-way push (see P7) is the load-bearing piece
- **MVP candidate?** Yes — fundamentally changes the data model and the calendar integration decision
- **Related open question(s):** Q13 (revised below)

### [P7] Google Calendar one-way sync (app → Google) for appointments

- **Date / Source:** 2026-06-22, derived from P6
- **Category:** visibility
- **Requirement:** When an appointment is created in the app, push it as a Google Calendar event automatically. No two-way sync needed in v0 — edits from Google Calendar side don't need to reflect back.
- **Frequency/Severity:** High — without this, appointments are siloed from her primary planning tool
- **Build feasibility:** Medium — Google Calendar API is well-documented; requires OAuth setup (one-time per user) and a write call per appointment. No sync conflict logic needed for one-way push.
- **MVP candidate?** Yes — reverses the earlier Q13 decision for appointments specifically (tasks still have in-app calendar view only; appointments get the Google push)
- **Related open question(s):** Q13 (revised)

### Task ↔ Appointment relationship patterns (2026-06-22)

Three relationship patterns identified. Patterns 1 and 2 are in MVP scope; Pattern 3 is deferred.

**Pattern 1 — Task → Appointment (task that spawns an appointment) [MVP]**
A scheduling task (e.g. "schedule neurologist appointment") whose completion produces an appointment. When the task is marked done, the app prompts: "do you want to add this as an appointment?" — lightweight conversion flow, no automatic linking required in v0.

**Pattern 2 — Appointment → Tasks (prep tasks hanging off an appointment) [MVP]**
An appointment can have child tasks attached (e.g. "doctor visit Thursday" → "bring medication list," "prepare questions," "arrange transport"). Seeing the appointment surfaces its open prep tasks. Data model: Appointment as parent, Tasks[] as children.

**Pattern 3 — Process → Appointment (appointment as a milestone in a longer process) [DEFERRED — post-MVP]**
e.g. PG3 appeal process has an MDK reassessment appointment embedded in it. Requires the Process/Theme object from doc 01 §2.4 — deferred until that layer is built.

### Q13 Revised (2026-06-22)

Earlier decision (in-app calendar only, no Google Calendar sync) is **partially reversed**:
- **Tasks** — still in-app calendar view only, no Google Calendar sync
- **Appointments** — one-way push to Google Calendar (app → Google) is now **in MVP scope**, since appointments need to appear alongside personal events for the feature to have its core value

### Q13–Q15 Resolution (2026-06-22)

- **Q13 (calendar):** In-app calendar view is sufficient for v0 — **no Google Calendar sync in MVP**. Tradeoff: this means reminders/notifications must be built explicitly (see P5), since they don't come free from Google Calendar.
- **Q14 (progress log):** Start with a simple **free-text status note per task** for v0. Data model should stay generic underneath so structured progress (stages, percentage) can be layered in later without a rework.
- **Q15 (visibility/personal tasks):** Mom is **not part of the app** in v0 — no dignity/authorization complexity to solve there yet. Personal/private tasks need only a simple **"only me" flag**, no broader permissions or authorization system in v0. Keep it minimal.


- **Documents** — confirmed by wife as not needed for MVP, can come later. (Relevant later for processes like the PG appeal, which doc 01 §2.4 already flagged as accumulating documents — consistent with deferring this.)
1. Doctor appointments (scheduling/tracking)
2. Reminders to check if mom drank (water) enough
3. Checking mom's accounts for redundant/unusual expenses
*(These read as a mix of: discrete tasks (appointments), recurring check-ins (hydration), and a periodic review process (expenses) — worth re-examining against the Task vs. Process model in doc 01 §2.4 once more use cases surface.)*

---

## 5. MVP Scope Summary (fill in after first pass of interviews)

| Pain point | Severity | Feasibility | MVP? | Notes |
|---|---|---|---|---|
| P1: Mental load / coordinated, prioritized task list | High | Medium | Yes | Core driver |
| P2: Low-friction data entry | High | N/A (constraint) | N/A | Gates all other MVP features |
| P3: Task model — recurrence, assignment, visibility, progress | High | Medium | Yes | Progress = free-text v0, generic model. Visibility = simple "only me" flag |
| P4: In-app calendar view | High | Medium | Yes | For tasks only — appointments handled via Google Calendar |
| P5: Reminders/notifications | High | Medium | Yes | Must be built explicitly — not inherited from Google Calendar |
| P6: Appointments as distinct object type | High | Medium | Yes | Separate from tasks — has datetime, duration, Google Calendar push |
| P7: Google Calendar one-way sync (appointments only) | High | Medium | Yes | App → Google only, no two-way sync. Requires OAuth per user |
| Task→Appointment relationship (Pattern 1) | Medium | Fast | Yes | Completion prompt to convert scheduling task into appointment |
| Appointment→Tasks relationship (Pattern 2) | High | Medium | Yes | Appointment as parent with child prep tasks |
| Process→Appointment relationship (Pattern 3) | Medium | Slow | No | Deferred — requires Process/Theme object layer |

**Working MVP hypothesis (v4):**
A shared coordination system for the care circle (3 sisters + partners; mom not included in v0) with two first-class object types — **Tasks** and **Appointments** — and the following capabilities:

*Tasks:* title, optional recurrence, assignee, "only me" visibility flag, free-text progress note. Shown in an in-app list and calendar view. Trigger in-app reminders/notifications. A scheduling task can be converted into an appointment on completion (Pattern 1).

*Appointments:* title, specific datetime + duration, assignee, optional prep tasks as children (Pattern 2). Automatically pushed as events to the user's Google Calendar (one-way, app → Google) so they appear alongside personal events. Prep tasks surface when viewing the appointment.

*Out of scope for v0:* documents, master data layer, two-way Google Calendar sync, Process/Theme object (Pattern 3), mom as a user.

Success for v0 = a sister can add either a task or an appointment in seconds, assign it, see it in the right place (task list / in-app calendar for tasks; Google Calendar for appointments), get reminded, and others can see progress — all without friction that makes the app feel like more work than it saves.
