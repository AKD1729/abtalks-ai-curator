# PROJECT_PLAN.md — Autonomous AI Creator (Team Boomers)

> **How to use this file:** Hand this whole document to Google Antigravity (or work through it yourself). Tasks are numbered and sequential — do them in order, top to bottom. Each task ends with a **Commit** line — actually run that git commit before moving to the next task. This is what makes Stage 2 (Authenticity Review) pass: real incremental history, not one giant dump at the end.
>
> **Deadline is today (Sun 9 Aug, 8:00 PM IST).** If time runs short, stop after Domain 5 (Deployment) — a working core loop beats a polished, broken one.

---

## Stack for this build
- Backend: Node.js + Express
- Database: PostgreSQL, hosted on Supabase (free, fastest to set up)
- Automation/scheduler: n8n (Cron trigger → HTTP Request)
- AI writing: Anthropic API (Claude)
- Memory (required tooling): Breeth Pro, called via its REST API
- Deployment: Render (needs to stay "always on" for n8n to reach it — don't use a serverless/sleep-on-idle host)

---

## Domain 0 — Environment & Repo Setup

**0.1** Confirm the GitHub repo was created *after* the hackathon kickoff (Stage 2 fails repos created earlier). If it already exists from before kickoff, create a fresh one.

**0.2** Create the root folder structure:
```
project-root/
├── backend/
├── docs/
├── workflows/
├── README.md
└── PROMPTS.md
```

**0.3** Inside `backend/`, run `npm init -y`, then install: `express`, `pg`, `dotenv`, `cors`, `node-fetch`.

**0.4** Create `backend/.env.example` with these keys (no real values committed):
```
DATABASE_URL=
ANTHROPIC_API_KEY=
BREETH_API_KEY=
BREETH_PROJECT_ID=
RUN_CYCLE_SECRET=
PORT=3000
```

**0.5 Commit:** `chore: project scaffold and dependencies`

---

## Domain 1 — Database Setup

**1.1** Create a free Supabase project. Copy its Postgres connection string into `backend/.env` as `DATABASE_URL` (keep `.env` out of git — confirm `.gitignore` includes it).

**1.2** Create `docs/schema.sql`:
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  persona_description TEXT NOT NULL,
  topic_focus TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  rationale TEXT NOT NULL,
  source_url TEXT,
  topic_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**1.3** Run this SQL in the Supabase SQL editor to create both tables.

**1.4 Commit:** `feat: database schema for agents and posts`

---

## Domain 2 — Backend Core

**2.1** Create `backend/db.js` — a `pg` `Pool` using `DATABASE_URL`.

**2.2** Create `backend/server.js` — Express app with `cors()`, `express.json()`, and `GET /health` returning `{status: "ok"}`.

**2.3** Add `POST /api/agent/init`:
- Body: `{ name, persona_description, topic_focus }`
- Inserts one row into `agents`, returns `{ agentId }`
- Must be safe to notice if already called (log a warning if an agent already exists, don't silently create duplicates)

**2.4** Add `GET /api/agent/feed?agentId=...`:
- Queries all `posts` where `agent_id = agentId`, ordered newest first
- Returns each post's `title`, `content`, `rationale`, `source_url`, `created_at`

**2.5 Commit:** `feat: init and feed endpoints`

---

## Domain 3 — Agent Logic (the "brain")

**3.1** Create `backend/services/topicSource.js`:
- Fetch `https://hacker-news.firebaseio.com/v0/topstories.json`
- Pull the first ~15 IDs, fetch each item from `https://hacker-news.firebaseio.com/v0/item/{id}.json`
- Return a list of `{ title, url }`, filtered to ones with real titles/URLs

**3.2** Create `backend/services/memory.js` (Breeth REST integration):
- `hasSeenTopic(topicKey)` — checks Breeth for this agent's memory of the topic
- `saveTopic(topicKey, summary)` — writes it once a post is made
- Wrap both in try/catch — if Breeth is unreachable, treat as "not seen" and log a warning rather than crashing the cycle

**3.3** Create `backend/services/llmWriter.js`:
- Calls the Anthropic API with a persona-locked prompt (persona name, voice, topic focus passed in) and the chosen HN item
- Returns `{ title, content, rationale }` — rationale must explicitly state *why* this topic was picked and cite the source

**3.4** Create `backend/routes/runCycle.js` — `POST /internal/run-cycle`:
- Require header `x-run-secret` matching `RUN_CYCLE_SECRET` (basic protection since n8n calls this over the open internet)
- Logic: fetch topics → loop through until one is *not* seen in memory → write post via LLM → save to `posts` table → save topic to memory
- Entire body wrapped in try/catch: on any failure, log the error and return `200 OK` anyway (a failed cycle should never crash the server or block the next scheduled run)

**3.5 Commit:** `feat: autonomous cycle wired to Hacker News, Breeth memory, and Claude`

---

## Domain 4 — n8n Automation

**4.1** Create an n8n cloud account (or self-host), start a new workflow.

**4.2** Add a **Cron** trigger node — every 4 hours.

**4.3** Add an **HTTP Request** node — `POST` to your backend's `/internal/run-cycle`, header `x-run-secret: <value>` matching your `.env`.

**4.4** Manually click "execute workflow" once to test — confirm a new row appears via `GET /api/agent/feed`.

**4.5** Export the workflow JSON into `workflows/agent-cycle.json` (matches your standard project structure) and write a short `docs/AUTOMATION.md` explaining what it does.

**4.6 Commit:** `feat: n8n scheduling workflow + docs`

---

## Domain 5 — Deployment

**5.1** Push the repo to GitHub as **public**.

**5.2** Deploy `backend/` to Render as a Web Service. Add all `.env` values as environment variables in Render's dashboard. Confirm `/health` responds on the live URL.

**5.3** Call `POST /api/agent/init` once against the **live** URL (not localhost) to create your real agent. Save the returned `agentId` somewhere safe — you'll need it for your README and for evaluators.

**5.4** Update the n8n HTTP Request node to point at the live Render URL instead of localhost.

**5.5 Commit:** `chore: deployment configuration`

---

## Domain 6 — Submission Compliance

**6.1** Write `README.md`: problem statement, one-paragraph architecture summary, setup steps, your live URL, and your `agentId`.

**6.2** Keep `PROMPTS.md` updated **as you go**, not at the end — one entry per feature, roughly: what you asked the AI, what it built, which task number it corresponds to. This is what Stage 2 cross-checks against your actual commits.

**6.3** Before submitting, re-check against the Stage 1 automated list: public repo ✓, live demo functional ✓, `PROMPTS.md` present ✓, submitted before 8:00 PM IST ✓.

---

## Advanced strategy backlog (only after everything above works)

1. Add a second source (Product Hunt, a dev.to RSS feed) once Hacker News alone is proven reliable.
2. Upgrade duplicate detection to Breeth's meaning-based memory instead of exact topic-title matching.
3. Add a retry-once step before a failed API call causes a skipped cycle.
4. Add a simple `/internal/status` check showing last run time and success/failure, so you catch a silent failure before evaluators do.
5. Build a plain feed viewer page — not required, but strengthens your live demo.
