# AI Interviewer

Lightweight single-process web app: pick a sample job, enter a voice-only Interview Room, and get a role-grounded dynamic interview with a final structured evaluation.

## Stack

Node 20 · TypeScript 5 · Express 4 · React 18 + Vite 5 · Tailwind 3 · Neon Postgres 16 + Drizzle ORM · Zod · OpenAI `gpt-4o-mini` · Vitest

## Quickstart

```bash
cp .env.example .env            # fill in DATABASE_URL, OPENAI_API_KEY, SESSION_COOKIE_SECRET
yarn install
yarn db:generate                # first time only; commits drizzle/ migration
yarn dev                        # API on :3000, Vite on :5173
```

- API health: `GET http://localhost:3000/api/v1/health`
- Client: `http://localhost:5173`

## Scripts

| Script | What it does |
|---|---|
| `yarn dev` | API (tsx watch) + Vite dev server in parallel |
| `yarn build` | Compile server + build client bundle |
| `yarn start` | Run compiled server (serves built client in prod) |
| `yarn test` | Vitest (supertest + RTL) |
| `yarn tsc` | Type-check without emit |
| `yarn db:generate` | Generate Drizzle migration from `src/db/schema.ts` |
| `yarn db:migrate` | Apply pending migrations |
| `yarn db:seed` | Upsert seed jobs (idempotent) |

## Interview Rules

These are enforced server-side in `InterviewerService.decide` — the LLM's `shouldEndInterview` is overridden if it tries to end early or exceed the cap.

| Rule | Value | Source |
|---|---|---|
| Minimum questions before the interview can end | **6** | `src/services/interviewer-service.ts` (Guard 1) |
| Maximum questions (hard cap per session) | `session.maxQuestions` — default **6** | `src/db/schema.ts` (`interview_sessions.max_questions`) |
| Minimum follow-ups required | **2** | `src/services/interviewer-service.ts` (Guard 3) |
| First turn must be | `opener` (if no prior candidate turn) | `src/services/interviewer-service.ts` (Guard 4) |

A session is marked `completed` (and the final evaluation is generated) only when `shouldEndInterview = true` after these guards are applied.

## Deploy

Single Render web service — see `render.yaml`. Build runs migrations + seed; start boots the server that serves both API and built client.

See `CLAUDE.md` for the full project context.
