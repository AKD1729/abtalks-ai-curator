# Prompts and Development Log

This document tracks the prompt interactions, tasks performed, and architecture decisions built during the hackathon development cycle.

---

### Entry 1: Domain 0 — Environment & Repo Setup
- **Task Number**: Domain 0 (0.1 - 0.5)
- **Prompt / Request**:
  > "I have saved our blueprint as PROJECT_PLAN.md in the root directory. Please read it and execute Domain 0 — Environment & Repo Setup.
  > Create the root folder structure including backend/, docs/, and workflows/.
  > Inside backend/, run npm init -y.
  > Install the exact dependencies: express, pg, dotenv, cors, and node-fetch.
  > Create backend/.env.example with the exact keys listed in the plan.
  > Stop immediately after finishing Domain 0."
- **Actions & Artifacts Built**:
  - Confirmed Git repository initialization and remote origin configuration.
  - Created `.gitignore` for node_modules and sensitive files.
  - Created root project structure (`backend/`, `docs/`, `workflows/`, `README.md`, `PROMPTS.md`).
  - Initialized `backend/package.json` with npm.
  - Installed dependencies: `express`, `pg`, `dotenv`, `cors`, `node-fetch`.
  - Created `backend/.env.example` with required environment variable template keys.
- **Commit**: `chore: project scaffold and dependencies`

---

### Entry 2: Domain 1 — Database Setup
- **Task Number**: Domain 1 (1.1 - 1.4)
- **Prompt / Request**:
  > Execution of Domain 1 — Database Setup: created database schema with `agents` and `posts` tables.
- **Actions & Artifacts Built**:
  - Created `docs/schema.sql` defining PostgreSQL schemas for `agents` and `posts` tables with UUID primary keys and timestamps.
  - Verified `.gitignore` covers `.env` to prevent sensitive credentials from leaking.
- **Commit**: `feat: database schema for agents and posts`

---

### Entry 3: Domain 2 — Backend Core
- **Task Number**: Domain 2 (2.1 - 2.5)
- **Prompt / Request**:
  > Execution of Domain 2 — Backend Core: implemented database client, Express server, health check, agent initialization, and feed endpoints.
- **Actions & Artifacts Built**:
  - Created `backend/db.js` providing a PostgreSQL `Pool` client configured for cloud SSL connections.
  - Created `backend/server.js` with CORS and JSON middleware.
  - Implemented `GET /health` responding with `{ status: "ok" }`.
  - Implemented `POST /api/agent/init` ensuring idempotent agent creation (duplicate-safe with existing agent reuse).
  - Implemented `GET /api/agent/feed?agentId=...` returning posts sorted newest first.
  - Updated `backend/package.json` with start and dev scripts.
- **Commit**: `feat: init and feed endpoints`

---

### Entry 4: Domain 3 — Agent Logic (the "brain")
- **Task Number**: Domain 3 (3.1 - 3.5)
- **Prompt / Request**:
  > Execution of Domain 3 — Agent Logic: integrated Hacker News discovery, Breeth memory & deduping, Claude persona writer, and autonomous run-cycle endpoint.
- **Actions & Artifacts Built**:
  - Created `backend/services/topicSource.js` to discover and parse trending stories from Hacker News Firebase API.
  - Created `backend/services/memory.js` implementing `hasSeenTopic` and `saveTopic` with Breeth REST API integration and Postgres fallback.
  - Created `backend/services/llmWriter.js` generating structured posts (`{ title, content, rationale }`) locked to the agent's persona and citing source URLs using Anthropic Claude.
  - Created `backend/routes/runCycle.js` exposing `POST /internal/run-cycle` with `x-run-secret` authentication, self-healing try/catch protection, and full pipeline orchestration.
  - Mounted `/internal` routes in `backend/server.js`.
- **Commit**: `feat: autonomous cycle wired to Hacker News, Breeth memory, and Claude`
