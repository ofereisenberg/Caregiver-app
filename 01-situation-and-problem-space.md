Caregiver Coordination App — Situation & Problem Space
Status: Draft v0.1 — living document, updated as we interview family members
Scope: Germany (statutory health/care insurance system, Pflegegrad framework)
Last updated: 2026-06-20
1. Situation Description
1.1 Background
A family is navigating a diagnosis of younger-onset Alzheimer's (frontal variant) in a parent (70+, younger than typical onset age). Care responsibility is distributed across three adult daughters and their partners, none of whom are professional caregivers. The diagnosis is recent, so the family is in an early, high-uncertainty phase: roles, routines, and tools have not yet stabilized.
1.2 Care network
Role
Who
Notes
Primary care recipient
Mother (70+)
Diagnosed with frontal-variant Alzheimer's/FTD; gradually losing independence
Care partners (primary)
3 daughters
Geographically distributed (TBD — confirm in interviews)
Care partners (secondary)
Partners/spouses of daughters (incl. you)
Supporting role, want to reduce mental load on primary care partners
External
GP (Hausarzt), neurologist, Pflegekasse, possibly Pflegestützpunkt, home care services
TBD which are already engaged
1.3 Why now
The family is self-organizing without a shared system. Coordination currently happens through informal channels (calls, texts, memory), which is failing to scale as care needs increase and as the diagnosis moves from "newly aware" to "actively managing."
2. User Problem Space
2.1 Core problem (hypothesis — to validate in interviews)
The primary bottleneck is not a lack of tools for any single task (calendars, reminder apps, medication trackers all exist) — it's the cognitive overhead of being the one who holds the whole picture in their head: what's been done, what's pending, what's coming up, and who is supposed to do what. This is sometimes called the "mental load" or "invisible labor" of caregiving, and it tends to concentrate on one person even when others are willing to help.
2.2 Problem dimensions to investigate
Capture — How do new to-dos/concerns enter the system today? (a doctor mentions something in passing, mom forgets to take a pill, a sister notices something on a visit)
Triage — How is urgency/importance decided? Who decides?
Delegation — How are tasks assigned across the three sisters + partners without it feeling like nagging or surveillance?
Visibility — What does each person need to see vs. not need to see? (Mom's dignity/autonomy is a real design constraint — this isn't pure logistics software)
Medical/administrative complexity — Germany-specific layer (see §3)
Emotional load — Distinct from logistical load; a coordination tool can reduce the latter without addressing the former, and conflating them risks building the wrong thing
2.3 Master data layer
A recurring need across almost every other feature (reminders, suggestions, delegation, even tips) is a stable, structured record of the situation itself — not tasks, but the facts that tasks and suggestions are generated from. Examples:
Pflegegrad (current + history, see §4)
Treating doctors (Hausarzt, neurologist, etc.) — name, contact, specialty
Active medications
Key contacts (Pflegekasse caseworker, Pflegestützpunkt advisor, etc.)
Legal status (Vorsorgevollmacht in place? Patientenverfügung? — see §3)
This is infrastructure, not a feature in itself — but it's foundational: appointment reminders, eligibility-based suggestions ("you may now qualify for X"), and even tone of tips depend on knowing this data is current. Worth treating as its own data model early rather than bolting it on later.
2.4 Ongoing themes/processes vs. one-off tasks
A second structural design point: not everything in caregiving is a discrete task with a due date. Some things are ongoing processes with their own lifecycle, context, and history — e.g. a Pflegegrad appeal (Widerspruch), which has stages (filed → MD reassessment scheduled → decision), a timeline, related documents, and its own thread of notes, distinct from a single appointment or to-do.
Concrete example from the family: mother was assessed at Pflegegrad 2; the family has filed an appeal (Widerspruch) for Pflegegrad 3. This isn't a task — it's a process with state, and likely sub-tasks (deadlines, document collection, possibly a follow-up MD assessment visit) hanging off it.
Implication for the data model: the app likely needs (at least) two first-class object types:
Task — discrete, has a due date, gets completed
Process/Theme — has a status/stage, a timeline, accumulates related tasks/notes/documents, stays open until resolved
This distinction is probably central to the whole information architecture, not a minor feature — worth validating early whether other ongoing themes exist (e.g. "finding a day care/Tagespflege slot," "transitioning driving privileges") that would also fit this model.
2.5 Non-goals (for now)
Not a medical record system
Not a replacement for professional care services
Not (yet) solving in-home monitoring/safety (wandering, fall detection) — may become relevant as disease progresses, but not the current pain point
3. Germany-Specific Context
These are structural facts about the German system that will shape both the problem space and any design — to be confirmed/refined with the family's actual situation:
Pflegegrad (care level 1–5): Determined by MDK/MD (Medizinischer Dienst) assessment; unlocks Pflegekasse benefits. Worth confirming whether an assessment has happened yet — this is often an early, confusing bureaucratic hurdle for newly diagnosed families.
Pflegekasse benefits that may be relevant to coordination: Pflegegeld (cash benefit if family provides care), Entlastungsbetrag (€125/month relief budget for support services), Verhinderungspflege (respite care), Tagespflege (day care).
Pflegestützpunkt: Local, free care-advice counseling points — often the first stop for navigating the system. Worth knowing if the family has used one.
Legal/admin instruments: Vorsorgevollmacht (power of attorney), Betreuungsverfügung, Patientenverfügung — typically need to be arranged early, while the person can still legally consent. Time-sensitive given the diagnosis.
Hausarzt-centered referral system: Specialist appointments (neurologist, psychiatrist) typically flow through the GP — relevant to how "appointment coordination" actually works in practice.
(Note: this section is general background, not legal/medical advice — to be validated against the family's actual situation and ideally a local advisor, e.g. via the Pflegestützpunkt.)
4. Known Facts (confirmed)
Fact
Value
Source
Current Pflegegrad
PG2
Family, 2026-06-20
Pflegegrad appeal status
Filed, appealing for PG3
Family, 2026-06-20
5. Open Questions for Interviews
Q1. Who is the Hausarzt and neurologist (names/contact), and is this already centralized anywhere?
Q2. What stage is the PG3 appeal at right now (filed / awaiting MD reassessment / decision pending), and is there a known timeline?
Q3. Who currently "holds" the most context — is it actually concentrated in one sister, or genuinely distributed?
Q4. What does a typical week of coordination look like right now (channels used, what breaks down)?
Q5. What has been tried already (apps, shared notes, group chats) and why did it stop working, if it did?
Q6. How does mom herself want to be involved — what level of autonomy/privacy matters to her?
Q7. What's the geographic distribution of the three sisters (affects how much is remote coordination vs. in-person)?
Q8. Are there other "ongoing themes" beyond the PG appeal already active (e.g. legal docs, day care search, driving)?
Q9. What master data already exists somewhere (paper, notes app, memory) that would need to be migrated in?
6. Next Steps
[ ] Conduct first interview with wife using the research capture framework (separate doc)
[ ] Validate/correct this draft based on interview findings
[ ] Move to feature/dimension mapping once problem space is grounded in real quotes, not assumptions