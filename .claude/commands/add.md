You are helping the user log a new issue or feature to `docs/issues-and-features.md`.

Follow these steps in order. Do not skip ahead.

---

## Step 1 — Determine type

Use AskUserQuestion to ask a single question:
- "Is this an issue (something broken) or a feature (planned work)?" — single-select: Issue / Feature

---

## Step 2 — Gather fields

Based on the answer from Step 1, use AskUserQuestion to collect fields. Ask all questions for the chosen type in a single AskUserQuestion call.

### If Issue — ask all at once:
1. **Where does it occur?** — screen name, component, or area of the app
2. **What is the current (broken) behavior?** — what actually happens today
3. **What should happen instead?** — the expected behavior
4. **Priority** — single-select: High (blocks upcoming work) / Medium (annoying, not blocking) / Low (cleanup or cosmetic)

### If Feature — ask all at once:
1. **Theme** — single-select: Notifications / Calendar / Tasks / Appointments / Auth / Notes / Settings / Other
2. **What should this feature do?** — description of the expected behavior and user value
3. **Where in the app?** — which screen(s) or flow it affects
4. **Priority** — single-select: High / Medium / Low
5. **Scope** — single-select: MVP (must ship before launch) / Post-MVP (deferred)
6. **Design notes** — any known constraint, UI idea, or open question (optional — user may skip)

---

## Step 3 — Check for gaps before writing

Review the answers and flag any of these problems before proceeding:
- Issue: no location was given
- Issue: priority seems inconsistent with severity (e.g. "High" for a cosmetic bug, "Low" for something that blocks a core flow) — ask if they want to adjust
- Feature: description is vague and doesn't explain what success looks like — ask for a clearer outcome
- Feature: scope is Post-MVP but priority is High — flag the inconsistency and ask if they want to revisit
- Feature: theme is "Other" but the description clearly fits an existing theme — suggest the right theme

Ask the user to clarify anything flagged before continuing. If nothing is flagged, proceed directly to Step 4.

---

## Step 4 — Write to the file

Read `docs/issues-and-features.md`.

### Issues table

The issues table header must be: `| # | Description | Location | Priority | Status |`

If the current header does not have a Priority column:
- Update the header line to add the Priority column between Location and Status
- For every existing data row in the issues table, insert a `—` cell between the Location and Status values
- Leave the separator row (`| --- | ...`) consistent with the new column count

Assign the next issue number by counting the current data rows and adding 1.

Format the new row:
- **Description**: a short title capturing the expected behavior. Append `. Current: [current behavior]. Expected: [expected behavior].` so the row is self-contained.
- **Location**: as given
- **Priority**: High / Medium / Low
- **Status**: `Open`

Append the new row to the issues table.

### Features table

The features table header must be: `| # | Theme | Description | Priority | Scope | Status |`

If the current header does not have a Scope column:
- Update the header line to add the Scope column between Priority and Status
- For every existing data row in the features table, insert a `—` cell between the Priority and Status values
- Leave the separator row consistent with the new column count

Assign the next feature number by counting the current data rows and adding 1.

Format the new row:
- **Theme**: as given
- **Description**: the expected behavior / description. If design notes were provided, append ` — Note: [design notes]`
- **Priority**: High / Medium / Low
- **Scope**: MVP / Post-MVP
- **Status**: `Not started`

Append the new row to the features table.

---

## Step 5 — Confirm

After writing, output a single confirmation line:
`Added [Issue/Feature] #N to docs/issues-and-features.md.`
