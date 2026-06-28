@AGENTS.md

# CLAUDE.md — Coding Principles & Conventions
**Project:** Caregiver Coordination App
**Purpose:** Standing instructions for all code generation in this project. Apply these principles to every file, every session, without exception.
**Last updated:** 2026-06-24

---

## Session Start Protocol

At the start of every session, read these two files before doing anything else:

1. `docs/project-context.md` — what the app is, tech stack, folder layout, data model, conventions
2. `docs/next_session.md` — current status, what was done last session, what's next

At the end of every session:

1. Ask the user: **"Anything to document as a lesson learned this session?"** before committing.
   - Project-specific discoveries (build quirks, dependency issues, this stack's gotchas) → `docs/technical/lessons-this-project.md`
   - General patterns applicable to future apps → `docs/general-lessons.md`
   - Both files are append-only — never delete entries, always add under the relevant theme section.

2. Overwrite `docs/next_session.md` with current status, what was done, and what's next. Do not append — replace.

---

## 1. Architecture: Separation of Concerns

### 1.1 Zero business logic in UI components
UI components render and handle user interaction only. They do not contain:
- Data fetching or mutation calls
- Validation rules
- Permission/visibility checks
- Date calculations or formatting logic
- Derived state computation

All of the above belongs in hooks, services, or utility functions.

```tsx
// ❌ Wrong — business logic in component
export function TaskItem({ task }) {
  const isOverdue = new Date(task.due_date) < new Date();
  const canEdit = task.created_by === supabase.auth.user()?.id || task.assignee === supabase.auth.user()?.id;
  const handleComplete = async () => {
    await supabase.from('tasks').update({ completed: true }).eq('id', task.id);
  };
  return <TouchableOpacity onPress={handleComplete} style={isOverdue ? styles.overdue : styles.normal} />;
}

// ✅ Correct — component receives everything it needs
export function TaskItem({ task, isOverdue, canEdit, onComplete }) {
  return <TouchableOpacity onPress={onComplete} style={isOverdue ? styles.overdue : styles.normal} />;
}
```

### 1.2 Layer structure
Every feature follows this layered structure — no skipping layers:

```
screens/          → navigation targets; compose components, wire up hooks
components/       → reusable UI; props in, events out; no direct Supabase calls
hooks/            → data fetching, mutations, derived state (useTaskList, useAppointment, etc.)
services/         → Supabase calls, Google Calendar API calls, push notification logic
utils/            → pure functions; no side effects; no imports from other layers
types/            → shared TypeScript types and interfaces
constants/        → app-wide constants (colors, spacing, config keys, etc.)
```

### 1.3 Screens are orchestrators, not implementors
Screens wire together components and hooks. They should be thin — if a screen file exceeds ~150 lines, it probably contains logic that belongs elsewhere.

---

## 2. Data & Supabase

### 2.1 All Supabase calls live in services
No component or screen imports `supabase` directly. All database interaction goes through a service function.

```tsx
// ❌ Wrong
const { data } = await supabase.from('tasks').select('*');

// ✅ Correct — in services/tasks.ts
export async function getTasksForCircle(circleId: string): Promise<Task[]> { ... }
```

### 2.2 Hooks own data state, not screens
Data fetching and subscription setup belong in custom hooks. Screens call hooks, not services directly.

```tsx
// ✅ Correct
// hooks/useTaskList.ts — fetches, subscribes to realtime, returns tasks + loading + error
// screens/TaskListScreen.tsx — calls useTaskList(), passes results to components
```

### 2.3 Realtime subscriptions are set up and torn down in hooks
Always clean up subscriptions in the hook's useEffect return. Never leave dangling subscriptions.

```tsx
useEffect(() => {
  const subscription = supabase
    .channel('tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handleChange)
    .subscribe();
  return () => supabase.removeChannel(subscription); // always clean up
}, []);
```

### 2.4 Never trust client-supplied IDs for ownership checks
Ownership and visibility checks (e.g. private tasks) are enforced via Supabase Row Level Security (RLS) policies — not in application code. Application code may check for UI purposes (show/hide edit button), but the database is the authority.

### 2.5 Single source of truth
Supabase is the only source of truth. No local state should duplicate or shadow server state except for:
- Optimistic UI updates (clearly marked, immediately reconciled on response)
- UI-only ephemeral state (e.g. modal open/closed, input focus)

---

## 3. TypeScript

### 3.1 No `any`
Never use `any`. Use `unknown` and narrow, or define a proper type. If a type is genuinely unclear, define it as `TODO_TYPE` and leave a comment — at least it's findable.

### 3.2 Database types are generated, not hand-written
Supabase generates TypeScript types from the schema. Use `supabase gen types typescript` to regenerate after schema changes. Never manually write types that mirror database tables.

### 3.3 Props are always typed
Every component has an explicit props interface. No implicit `any` props.

```tsx
// ✅
interface TaskItemProps {
  task: Task;
  isOverdue: boolean;
  onComplete: () => void;
}
export function TaskItem({ task, isOverdue, onComplete }: TaskItemProps) { ... }
```

---

## 4. State Management

### 4.1 No global state library in v0
No Redux, Zustand, MobX, or similar. Use:
- React `useState` / `useReducer` for local component state
- Custom hooks for server state and shared data
- React Context only for genuinely global, rarely-changing values (e.g. current user, care circle ID)

Revisit if complexity justifies it — but exhaust hooks + context first.

### 4.2 Context is not a cache
React Context is for identity/session data (who am I, which circle am I in). It is not for task lists, appointments, or any data that changes frequently. That belongs in hooks with Supabase realtime.

### 4.3 Optimistic updates are explicit and labeled
When an optimistic update is applied, the local state change is clearly commented as optimistic and the reconciliation path (on success / on error) is always handled.

---

## 5. Component Design

### 5.1 Composition over configuration
Prefer small, composable components over large components with many conditional props. A component with more than 5-6 props is a signal to decompose.

### 5.2 No inline styles
All styles go in `StyleSheet.create()` at the bottom of the file, or in a co-located `styles.ts` file for larger components. No `style={{ marginTop: 8 }}` inline.

### 5.3 Use design tokens, not magic numbers
Spacing, colors, font sizes, and border radii come from `constants/theme.ts`. No hardcoded values like `#3A7BD5` or `padding: 16` scattered through component files.

```tsx
// ❌ Wrong
style={{ padding: 16, color: '#666' }}

// ✅ Correct
style={{ padding: theme.spacing.md, color: theme.colors.textSecondary }}
```

### 5.4 Platform-specific code is isolated
If a component behaves differently on iOS vs Android, use `Platform.select()` or a `.ios.tsx` / `.android.tsx` file. Do not scatter `Platform.OS === 'ios'` checks throughout shared logic.

---

## 6. Navigation

### 6.1 Navigation lives in screens, not components
Components never call `navigation.navigate()` directly. They emit events (callbacks) that the screen handles. This keeps components portable and testable.

```tsx
// ❌ Wrong — component knows about navigation
export function TaskItem({ task }) {
  const navigation = useNavigation();
  return <TouchableOpacity onPress={() => navigation.navigate('TaskDetail', { id: task.id })} />;
}

// ✅ Correct — component emits, screen navigates
export function TaskItem({ task, onPress }) {
  return <TouchableOpacity onPress={onPress} />;
}
// In screen:
<TaskItem task={task} onPress={() => navigation.navigate('TaskDetail', { id: task.id })} />
```

---

## 7. Error Handling

### 7.1 Errors are handled at the hook/service boundary
Service functions return a typed result (`{ data, error }` pattern or a Result type). Hooks catch errors and expose them as state. Components never contain try/catch for async data operations.

### 7.2 Every async operation has an error state
No fire-and-forget. Every mutation (create task, update appointment, etc.) has:
- A loading state
- A success path
- An error path with user-visible feedback

### 7.3 Network errors surface gracefully
The app detects loss of connection and shows a clear, non-alarming status indicator. It does not silently fail or show a blank screen.

---

## 8. Auth & Security

### 8.1 User identity comes from Supabase Auth, never from props or local state
The current user is always read from the Supabase session, not passed down as a prop or stored in component state.

### 8.2 RLS is the authority on data access
Row Level Security policies in Supabase enforce what each user can read/write. The app may hide UI elements for UX purposes, but never assumes that hiding UI is a security boundary.

### 8.3 No secrets in client code
API keys, service role keys, and any credentials never appear in the Expo app bundle. Only the Supabase anon key (which is safe to expose) belongs in the client.

---

## 9. Config & Feature Flags

### 9.1 Three config scopes — never mix them
| Scope | Source | Who changes it |
|---|---|---|
| System config | `system_config` table in Supabase | Developer via Supabase Studio |
| Circle config | `care_circle` table fields | Circle admin via app |
| User preferences | `user_profile` table fields | Each user via Settings |

### 9.2 Feature flags gate unfinished features
Any code for a deferred/post-MVP feature is wrapped in a feature flag read from `system_config`. It is never shipped in an always-on state just because it's mostly done.

---

## 10. Testing

### 10.1 Suggest tests when they add clear value

When writing or modifying code, proactively suggest a test if the code falls into any of these categories:

- **Pure utility functions** (`utils/`) — easiest to test, highest value; suggest a unit test alongside the implementation
- **Non-trivial derived state in hooks** — e.g. overdue calculation, recurrence logic, visibility filtering
- **Service functions with conditional logic** — e.g. sync preference branching, invite expiry checks
- **Bug fixes** — always suggest a test that would have caught the bug

Do not suggest tests for: thin components, navigation wiring, or code that is essentially a direct Supabase call with no logic.

### 10.2 Test file placement

Co-locate tests with the file they cover:

```text
utils/dateUtils.ts       → utils/__tests__/dateUtils.test.ts
hooks/useTaskList.ts     → hooks/__tests__/useTaskList.test.ts
services/tasks.ts        → services/__tests__/tasks.test.ts
```

### 10.3 No test infrastructure overhead for a single test

If a test requires significant setup (test database, auth mocking, complex fixtures), note the requirement and defer unless the user asks to set it up. A suggested test that can't be run is worse than no suggestion.

---

## 11. Code Hygiene

### 10.1 No commented-out code in commits
Dead code is deleted, not commented out. Version control is the history — use it.

### 10.2 TODO comments include a reason
```tsx
// ✅
// TODO: replace with server-side validation once RLS policy is in place
// TODO: move to useTaskList hook when that hook is built

// ❌
// TODO: fix this
```

### 10.3 File naming conventions
| Type | Convention | Example |
|---|---|---|
| Screens | PascalCase + Screen suffix | `TaskListScreen.tsx` |
| Components | PascalCase | `TaskItem.tsx` |
| Hooks | camelCase + use prefix | `useTaskList.ts` |
| Services | camelCase | `tasks.ts`, `appointments.ts` |
| Utils | camelCase | `dateUtils.ts`, `formatters.ts` |
| Types | PascalCase in `types/` | `types/Task.ts` |

### 10.4 One component per file
No exporting multiple components from a single file (except tightly coupled sub-components explicitly noted as such).

### 10.5 Imports are ordered
1. React / React Native core
2. Expo libraries
3. Third-party libraries
4. Internal — services, hooks, utils
5. Internal — components
6. Types
7. Assets / styles

---

## 11. AI Voice Input Service

### 11.1 Single reusable service for all AI-powered input
All voice capture, transcription, and natural language parsing is handled exclusively through `services/voiceInput.ts`. No screen, component, or other service implements its own AI parsing directly. This service is schema-agnostic — callers pass a target schema and receive structured JSON back.

```
VoiceInputService
  ├── record()              → captures audio via expo-av
  ├── transcribe()          → audio file → text (Whisper API)
  └── parse(text, schema, context) → Claude API → structured JSON
```

### 11.2 Always use Haiku for parsing
The voice parsing service always uses `claude-haiku-4-5`. Never use a larger model for structured extraction — it is not justified by the task complexity and costs 10–20x more.

### 11.3 Cap token consumption
All Claude API calls from VoiceInputService must set `max_tokens: 300`. System prompts for parsing are kept under 300 tokens. The prompt contains only: output schema, brief instructions, today's date, and care circle member list.

### 11.4 Confirmation before save — always
The parsed result pre-fills the relevant form (Add Task or Add Appointment screen). The user always reviews and confirms before saving. Voice input never saves directly to the database without user confirmation.

### 11.5 Graceful degradation
If transcription or parsing fails, the user is dropped into the normal manual entry form with a brief non-alarming message. Voice input is an enhancement — its failure must never block task/appointment creation.

---

## 12. Environment & Configuration

### 12.1 All secrets and environment-specific values live in `.env`
No API keys, URLs, model names, token limits, or tunable values are hardcoded in source files. Every value that could change between environments (dev / staging / prod) or needs to be adjusted without a code change lives in `.env`.

```bash
# .env — example entries
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-whisper-key
ANTHROPIC_API_KEY=your-claude-key
VOICE_PARSE_MODEL=claude-haiku-4-5
VOICE_PARSE_MAX_TOKENS=300
VOICE_TRANSCRIPTION_MAX_SECONDS=120
DAILY_DIGEST_LOOKAHEAD_DAYS=3
```

### 12.2 Config is centralised in `constants/config.ts`
No file reads from `process.env` directly except `constants/config.ts`. All other files import from there. This means there is exactly one place to look when a config value needs changing, and one place to catch missing env vars at startup.

```tsx
// constants/config.ts
export const config = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  },
  ai: {
    anthropicKey: process.env.ANTHROPIC_API_KEY!,
    openaiKey: process.env.OPENAI_API_KEY!,
    voiceParseModel: process.env.VOICE_PARSE_MODEL ?? 'claude-haiku-4-5',
    voiceParseMaxTokens: Number(process.env.VOICE_PARSE_MAX_TOKENS ?? 300),
    voiceTranscriptionMaxSeconds: Number(process.env.VOICE_TRANSCRIPTION_MAX_SECONDS ?? 120),
  },
  digest: {
    lookaheadDays: Number(process.env.DAILY_DIGEST_LOOKAHEAD_DAYS ?? 3),
  },
} as const;
```

### 12.3 `.env` is never committed
`.env` is always in `.gitignore`. A `.env.example` file with all required keys (but no real values) is committed instead, so any new developer knows exactly what to populate.

```bash
# .env.example — committed to version control
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
VOICE_PARSE_MODEL=claude-haiku-4-5
VOICE_PARSE_MAX_TOKENS=300
VOICE_TRANSCRIPTION_MAX_SECONDS=120
DAILY_DIGEST_LOOKAHEAD_DAYS=3
```

### 12.4 Validate required env vars at startup
`constants/config.ts` checks that all required values are present when the app starts. A missing required key throws an explicit error with the key name — not a silent undefined crash somewhere deep in the app.

```tsx
// In constants/config.ts
function require(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
```

### 12.5 EXPO_PUBLIC_ prefix for client-safe values only
Expo exposes any env var prefixed with `EXPO_PUBLIC_` to the client bundle — meaning it's visible to anyone who inspects the app. Only the Supabase anon key and URL are safe to expose this way. API keys for OpenAI, Anthropic, and any other third-party services must never have the `EXPO_PUBLIC_` prefix and must only be used server-side (Supabase Edge Functions).

```bash
# ✅ Safe to expose to client
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# ❌ Never expose to client — server/Edge Function only
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```
