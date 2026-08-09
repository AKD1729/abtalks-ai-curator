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
