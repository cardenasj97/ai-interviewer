## What We're Building

A lightweight AI Interviewer web app: users pick a sample job, enter a voice-only Interview Room, talk to the screen, and get a role-grounded dynamic interview (≥6 questions, ≥2 follow-ups) followed by a structured JSON evaluation (strengths, concerns, overall score, per-competency breakdown). Single repo, single process, deployed to a public URL.

## Stack

- **Runtime:** Node.js 20 + TypeScript 5 (strict mode)
- **Backend framework:** Express 4
- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3 + React Router 6 + TanStack Query v5
- **Database:** Neon Postgres 16 (serverless) via `@neondatabase/serverless` Pool + Drizzle ORM — same `DATABASE_URL` shape in dev and prod; Neon branching distinguishes environments
- **Validation:** Zod 3 (schemas first, infer types from them — never write types manually)
- **LLM:** OpenAI `gpt-4o-mini` via official SDK with structured JSON output
- **STT:** Browser Web Speech API primary; OpenAI Whisper fallback via `POST /api/v1/stt`
- **TTS:** Browser `SpeechSynthesis` (client-side)
- **Testing:** Vitest + supertest + @testing-library/react
- **Package manager:** yarn (Classic v1)
- **Deploy:** Render (single web service; API + built client from one URL)

## Source of Truth Files

- **API contract:** `contracts/21-api-contract.md` (Obsidian) — mirrored in code by `src/types/domain.ts` request/response schemas
- **Domain types:** `src/types/domain.ts` (Zod schemas + inferred TS types)
- **Error taxonomy:** `src/types/errors.ts` + `contracts/22-error-taxonomy.md`
- **DB schema:** `src/db/schema.ts` (Drizzle) — matches `contracts/23-db-schema.md`
- **Plan:** `plan/10-overview.md`, `plan/12-file-tree.md`, `plan/13-data-flow.md`, `plan/14-definition-of-done.md`

## Coding Conventions

- Functional only — no classes (except `AppError`, test setup, and library-forced classes)
- Zod-first: define `z.object({...})` schema, then `z.infer<typeof Schema>` for types
- Error handling: always throw `AppError` from services/repos/adapters — never raw `Error`
- No `any` — use `unknown` and narrow with Zod or type guards
- No `console.log` in production paths — use the shared `pino` logger or remove before commit
- Imports: `@/` alias for backend `src/`, `@ui/` alias for `client/src/` (configured in tsconfig)
- File naming: kebab-case for files, PascalCase for React components, camelCase for functions/variables
- One route file per domain (`jobs.ts`, `sessions.ts`, `stt.ts`, `health.ts`)
- Services are thin composition layers; adapters wrap external calls; repos wrap SQL

## API Conventions

- All routes under `/api/v1/`
- Success response: `{ data: T }`
- Error response: `{ error: { code: ErrorCode, message: string, details?: unknown } }`
- Validation: Zod middleware on every endpoint that accepts body/params/query
- Auth: **none in v1** — sessions are anonymous, identified by UUID in URL + httpOnly `interview_session_id` cookie
- Timestamps: ISO 8601 UTC
- IDs: UUID v4
- Rate limiting: 30 req/min per IP on mutating routes (in-memory)

## LLM Conventions

- Always call with `response_format: { type: 'json_schema', json_schema: { schema: ...toJsonSchema(ZodSchema), strict: true } }`
- Output is validated against the corresponding Zod schema (`NextQuestionOutputSchema`, `EvaluationOutputSchema`)
- On first schema failure: retry once with corrective user message ("Your last output failed this schema, resend only valid JSON")
- On second failure: throw `AppError('LLM_OUTPUT_INVALID', ..., 502)`
- Interviewer prompt always includes: persona ("senior hiring manager, warm but rigorous, one question at a time, no multi-part questions"), job title, job `longDescription`, competencies list, full conversation so far
- **Deterministic guards** (applied AFTER LLM response in `InterviewerService.decide`):
  1. If `questionsAsked < 6` → force `shouldEndInterview = false`
  2. If `questionsAsked >= maxQuestions` → force `shouldEndInterview = true`
  3. If `followUpsAsked < 2 && questionsAsked >= 5 && prior candidate turn exists` → coerce `kind = 'follow_up'`
  4. If no prior candidate turn exists → coerce `kind = 'opener'`

## Git Commits

Use **Conventional Commits** for every commit. Format: `type(scope): description`

| Type | When to use |
|---|---|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `refactor` | Code change that isn't a fix or feature |
| `test` | Adding or updating tests |
| `chore` | Setup, config, dependencies |
| `docs` | README, comments, documentation |
| `style` | Formatting only (no logic change) |

**Examples:**
```
feat(sessions): POST /sessions/:id/turns with evaluation on final turn
feat(interviewer): add follow-up enforcement guard at turn 5
fix(stt): reject zero-byte audio with 422 AUDIO_EMPTY
test(sessions): cover TURN_OUT_OF_ORDER path
chore: init project with yarn, drizzle, vite, tailwind
refactor(prompt-builder): pure function signature for snapshot test
docs: add deploy instructions for Render
```

**Rules:**
- Scope = the domain being changed (`sessions`, `jobs`, `stt`, `interviewer`, `db`, `ui`, etc.)
- Description is lowercase, imperative tense ("add" not "added")
- Commit after each logical unit of work — not one giant commit at the end
- Never commit broken builds or failing tests

## Do NOT

- Improvise the folder structure — it's in `plan/12-file-tree.md`
- Add libraries not listed in `plan/11-tech-decisions.md` (banned list included) without noting it in `execution/51-decisions-log.md`
- Write TypeScript types that duplicate Zod schemas
- Skip error handling — every service/adapter function that can fail must throw `AppError`
- Use `any`
- Use `console.log` in production paths (use `pino`)
- Call the OpenAI SDK outside `src/adapters/openai-client.ts` and `whisper-client.ts`
- Touch files outside your agent's owned directories (see `agents/3x-*-prompt.md`)
- Change `contracts/*` without escalating to Architect — those are frozen after Phase 0

## Agent Task Assignment

When starting a session, read your assigned task file:
- Architect → `agents/31-architect-prompt.md` (runs on `main`, first and alone)
- Backend  → `agents/32-backend-prompt.md` (runs on `worktrees/backend`, after Architect merge)
- Frontend → `agents/33-frontend-prompt.md` (runs on `worktrees/frontend`, after Architect merge; parallel with Backend)
- QA      → `agents/34-qa-prompt.md` (runs on `main` after Backend + Frontend merges)

## Gate-by-Gate Execution Model

**We ship in sequential gates, not a single big-bang.** Each gate is independently deployable — never submit a half-finished gate.

| Gate | Scope | Stretches included | Decision point |
|---|---|---|---|
| **Gate 0** | Must-haves + Decision Panel | Stretch 1 | Ship if time tight; baseline submission floor |
| **Gate 2** | Job-specific question packs | Stretch 2 | Requires Gate 0 green |
| **Gate 3** | Video mode | Stretch 3 | Requires Gate 2 green |
| **Gate 4** | History + metrics + replay | Stretch 4 | Requires Gate 3 green |

**Execution rules:**
1. Within a gate, Backend + Frontend agents run in parallel on separate worktrees (`worktrees/backend-gate-N` / `worktrees/frontend-gate-N`). Contract changes between gates happen on `main` serially.
2. **No gate is complete until its acceptance criteria in `tasks/40-task-board.md` is green** — that includes tests passing AND a manual Chrome smoke of the new capability.
3. At **02:30** (Stretch Gate Decision Point), if Gate 0 is not merged green, STOP — skip all stretches and go to deploy. If Gate 0 is green, proceed to Gate 2.
4. At **03:20** (integration cutoff), if an in-flight gate is not green, revert to the last green gate and go to deploy.
5. At **03:45** (deploy cutoff), no new code. Only env-var / deploy config tweaks.
6. At **04:00** (submission cutoff), submit whatever is live — update `delivery/62-submission-email.md` to reflect exactly which gates shipped.

**Commit boundary per gate:** after each gate's acceptance is green, commit `feat(gate-N): <short scope>` on `main`. Never mix gates in one commit.

## Handoff Contract

- Architect output is considered "green" when `yarn install && yarn build` exits 0 and `yarn dev` serves `/api/v1/health` → 200.
- Backend output is considered "green" when `yarn test --run` exits 0 for all files in `tests/routes/**` and `tests/services/**`.
- Frontend output is considered "green" when `yarn test --run` passes for `tests/components/**` and `yarn build` (Vite) exits 0.
- QA pass is considered done when combined `yarn test --run` exits 0, `yarn tsc --noEmit` is clean, and a manual smoke against the deployed URL walks the full lifecycle.
