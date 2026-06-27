# Issues & Features

> Running list. Add things as they come up.
> Issues = something broken or wrong. Features = planned work not yet started.

---

## Issues

| # | Description | Location | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | "Start using the app" button showed when already logged in | Manage Invites screen | — | Fixed |
| 2 | Add appointment button hidden in header instead of bottom FAB | Calendar screen | — | Fixed |
| 3 | Appointment object is missing a `details` field (free-text notes) and a `location` field | Appointment data model | — | Open |
| 4 | Appointment only has a start time + duration — should be a proper time range (start → end), with a full-day toggle. Full appointment form should follow Google Calendar structure: title, full-day toggle, date from/to, time from/to, location, repeat, invitees from the circle | Add Appointment screen + data model | — | Open |
| 5 | Android date picker in TaskDetail used `onValueChange` instead of `onChange` — selected date was silently discarded on Android | `TaskDetailScreen.tsx` | — | Fixed |
| 6 | Task title was not editable after creation — typos required deleting and recreating the task | `TaskDetailScreen.tsx` | — | Fixed |
| 7 | No way to remove a task's due date once set — date picker only allowed changing the date | `TaskDetailScreen.tsx` | — | Fixed |
| 8 | Calendar FAB passed no date to AddAppointment — selected day was ignored, form always defaulted to today | `CalendarScreen.tsx`, `AddAppointmentScreen.tsx` | — | Fixed |
| 9 | Date/time formatting hardcoded to `en-US` locale in CalendarScreen, AppointmentDetailScreen, and AddAppointmentScreen — day/month names showed in English on German devices | Multiple screens | — | Fixed |
| 10 | Repeating tasks do not appear in calendar view for future instances — only the original occurrence shows; subsequent recurrences are missing from the calendar | `CalendarScreen.tsx`, task recurrence logic | Medium | Open |

---

## Features

| # | Theme | Description | Priority | Scope | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Notifications | Push notifications — register token on login, notify on task assignment | High | — | Not started |
| 2 | Notifications | Daily digest modal — show on first app open of the day | High | — | Not started |
| 3 | Notes | Notes screen — full implementation behind the tab icon | Medium | — | Stub only |
| 4 | Appointments | Appointment editing — change date / time / assignee after creation | Medium | — | Not started |
| 5 | Calendar | Google Calendar sync — one-way push from app to Google | Low | — | Not started |
| 6 | Tasks / Appointments | Voice input — Whisper transcription + Claude Haiku parsing | Low | — | Not started |
| 7 | Appointments | Location picker — location is a plain text field now; future: detect Maps link and make it tappable to open Maps app | Low | — | Text field built in appointment form; Maps behaviour not started |
| 8 | Appointments | Multiple invitees per appointment — currently single assignee only; requires appointment_invitees join table | Low | — | Not started |
| 9 | Internationalisation | Multi-language support (German / English) — all UI strings are currently hardcoded in English; implement i18n with a library (e.g. i18next + react-i18next), extract all strings into locale files, and add a language toggle in User Settings. German is the primary target language; English is the fallback. | Medium | — | Not started |
| 10 | Support | In-app issue reporting and feature requests — users can submit issues and feature requests from within the app and track their progress. Admins have a dedicated view listing all submissions. Planned follow-up: admin notifications when new items are submitted. | High | MVP | Not started |
| 11 | Tasks / Appointments | Search — full-text search across tasks and appointments by title, assignee, or notes. Accessible from a search icon in the header or a dedicated search screen. | Medium | — | Not started |
