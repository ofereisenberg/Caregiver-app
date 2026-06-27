# Design: Projects Feature

> Status: Design complete — ready for implementation.
> Designed: 2026-06-27

---

## Problem

Some caregiving work spans days or weeks, involves multiple people, and requires a mix of tasks and appointments to complete. A single task can't represent this — it has no children, no status progression, and no way to surface the relationship between its parts in the UI. The Pflegegrad application process is the canonical example: it includes document gathering tasks, appointments with doctors and authorities, and prep work for those appointments.

---

## Decision: New first-class `Project` object

A project is a container for tasks and appointments that together constitute a larger goal. It is not an extension of the Task type — it is a distinct object with its own table, its own screen, and its own status lifecycle.

Tasks and appointments remain independent objects; they gain an optional `project_id` FK that links them to a project.

---

## Data Model

### New `projects` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | Required |
| `description` | text | Optional, free text |
| `owner` | uuid | FK → user_profile; single responsible person |
| `due_date` | date | Optional |
| `status` | enum | `not_started` \| `in_progress` \| `done` |
| `visibility` | enum | `private` \| `shared` |
| `circle_id` | uuid | FK → care_circle |
| `created_by` | uuid | FK → user_profile |
| `created_at` | timestamptz | |

### Changes to existing tables

- `tasks`: add `project_id uuid REFERENCES projects(id) ON DELETE SET NULL` (nullable)
- `appointments`: add `project_id uuid REFERENCES projects(id) ON DELETE SET NULL` (nullable)

A task or appointment belongs to **at most one project**.

---

## Status Lifecycle

```
not_started ──→ in_progress ──→ done
               (automatic)      (manual)
```

| Transition | Trigger |
|---|---|
| `not_started` → `in_progress` | First child task is marked complete, OR first child appointment's date passes |
| `in_progress` → `done` | User manually marks done; app prompts when all children are completed or in the past |

The `done` state is never set automatically — the user always confirms.

---

## Project Detail Screen

Two tabs to keep active and past work visually separated:

### Active tab
- Open (incomplete) tasks with due dates not yet passed
- Future appointments
- "+" actions: Add task, Add appointment (creates a new child directly within the project)

### Past tab
- Completed tasks
- Appointments whose date has passed
- Read-only; no add actions

Items in both tabs show their due date / appointment time and assignee.

---

## Adding Items to a Project

Two paths:

1. **From the Project screen** — "+" button creates a new task or appointment already linked to that project.
2. **From the task / appointment create form** — a "Link to project" field (optional picker) lets the user attach a new or existing task/appointment to a project at creation time.

Editing an existing task or appointment to link/unlink a project is also supported via the detail screens.

---

## Overview Screen Changes

### Project reference tag
Tasks and appointments that belong to a project display a small project name tag below the title row. Tapping the tag navigates directly to the Project detail screen.

### Row actions ("...")
The checkbox for quick-complete is preserved — it remains a single-tap action. A "..." button is added to the right side of each row, opening an action sheet with:
- **Add to project** (or **Change project** / **Remove from project** if already linked)
- **Delete**

"Mark as done" is NOT in the action sheet — that stays on the checkbox.

---

## Calendar Screen Changes

Appointment and task rows in the calendar agenda view show the same project reference tag as the Overview when the item belongs to a project.

---

## Navigation Changes

### Bottom tab bar (new structure)

| Tab | Icon | Notes |
|---|---|---|
| Overview | home / list | Unchanged |
| Projects | folder / layers | New |
| Calendar | calendar | Unchanged |

Settings is **removed** from the bottom tab bar.

### Settings access

Settings is accessed via the user avatar icon in the top-right header of every main tab screen (Overview, Projects, Calendar). The avatar is already present on the Overview screen; it needs to be added to Calendar and Projects.

---

## Projects List Screen

The Projects tab shows all projects for the circle, grouped or sorted by status:
- Active projects (`not_started` + `in_progress`) listed first
- Completed projects below, visually muted
- Each row: project title, status badge, due date (if set), item count

Tapping a project opens the Project detail screen.

---

## Future Milestone: Task → Project Promotion

A task can be promoted to a project. When triggered:
- A new project is created with the task's title, description (from progress_note), assignee (owner), due_date, and visibility
- The original task is deleted (or optionally becomes the first child task of the new project)
- The user is taken to the new project's detail screen to add children

This is **not in Milestone 1**. Record it here so it informs data model decisions (no irreversible choices that would block this later).

---

## Out of Scope for Milestone 1

- Task → Project promotion
- Multi-level nesting (tasks within tasks without a project container)
- Project templates / recurring projects
- Project-level notifications
