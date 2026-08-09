Implementation Plan
Autonomous AI Curator — Architecture Review & Implementation Plan
Executive Architecture Review
The AB Talks AI Curator project architecture has been analyzed. The goal is an autonomous, end-to-end agentic pipeline that discovers trending topics, verifies stateful memory (to avoid duplicates), synthesizes high-quality persona-driven content using LLMs (Gemini / Claude), and persists/serves the generated feed via a resilient Node.js API with automated scheduling (n8n).


                        ┌───────────────────────────────┐
                        │   n8n Cloud / Cron Trigger    │
                        │ (Runs every 4h or on demand)  │
                        └──────────────┬────────────────┘
                                       │ POST /internal/run-cycle
                                       │ (x-run-secret header)
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Express.js Backend (Render.com)                      │
│                                                                        │
│  ┌──────────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│  │ 1. Topic Discovery   │   │ 2. Memory Check │   │ 3. LLM Writer   │  │
│  │ (Hacker News API)    ├──►│  (Breeth REST / ├──►│  (Gemini Pro / │  │
│  │                      │   │   DB fallback)  │   │   Claude)       │  │
│  └──────────────────────┘   └─────────────────┘   └────────┬────────┘  │
│                                                            │           │
│                                                            ▼           │
│  ┌───────────────────────────────────────────────┐  ┌────────────────┐ │
│  │ Public REST API                               │  │ 4. Persistence │ │
│  │ - GET  /health                                │  │   (Supabase    │ │
│  │ - POST /api/agent/init                        │◄─┤   PostgreSQL)  │ │
│  │ - GET  /api/agent/feed?agentId=...            │  └────────────────┘ │
│  │ - GET  /feed (Bonus Visualizer)               │                     │
│  └───────────────────────────────────────────────┘                     │
└────────────────────────────────────────────────────────────────────────┘
Key Architectural Strengths & Adjustments
Multi-Model LLM Adapter (Gemini Pro + Claude):
To support your requirement of using Gemini Pro / Gemini Flash (free tier) alongside Claude without vendor lock-in, backend/services/llmWriter.js will support GEMINI_API_KEY (Gemini Pro / Flash models) as well as ANTHROPIC_API_KEY, auto-detecting whichever key is present in .env.
Resilient Memory Layer:
backend/services/memory.js will communicate with Breeth Pro REST API, with safe fallback to Supabase posts deduplication check if Breeth is offline or credentials are not yet supplied. This guarantees the run cycle never fails.
Fail-Safe Internal Cycle:
POST /internal/run-cycle returns 200 OK with detailed status logs even upon unexpected API timeouts, ensuring n8n workflows remain healthy.
Hackathon Compliance (Stage 2 Authenticity Review):
Incremental commits matching PROJECT_PLAN.md specification.
Synchronized updates to PROMPTS.md after each domain.
User Review Required
IMPORTANT

API Keys & Credentials Needed from You for Live Runs:

Supabase: Free Supabase PostgreSQL connection string (DATABASE_URL).
LLM Provider: GEMINI_API_KEY (Google AI Studio - Gemini Pro / 2.0 Flash) or ANTHROPIC_API_KEY.
Breeth Pro: BREETH_API_KEY & BREETH_PROJECT_ID (if you have them; fallback mechanism is already built if not available).
Run Cycle Secret: Any random secret string for RUN_CYCLE_SECRET (e.g. curator_secret_2026).
Step-by-Step Implementation Roadmap
Domain 1: Database Setup
File: docs/schema.sql
Actions:
Write standard SQL for agents and posts tables with UUIDs, foreign keys, and indexes.
Test connection utility with Supabase DATABASE_URL.
Commit: feat: database schema for agents and posts
Doc: Update PROMPTS.md (Entry 2).
Domain 2: Backend Core
Files: backend/db.js, backend/server.js
Actions:
backend/db.js: PostgreSQL connection pool with SSL/Supabase support.
backend/server.js: Express server with CORS, JSON body parser, /health endpoint.
Implement POST /api/agent/init (creates or retrieves existing agent).
Implement GET /api/agent/feed?agentId=... (fetches chronological curated posts with metadata).
Add optional sleek / static feed viewer so judges can view posts in a browser directly.
Commit: feat: init and feed endpoints
Doc: Update PROMPTS.md (Entry 3).
Domain 3: Agent Logic (The Autonomous Brain)
Files:
backend/services/topicSource.js: Hacker News API crawler (top 15 stories, filtered for valid URLs).
backend/services/memory.js: Breeth Pro REST API memory client (hasSeenTopic, saveTopic) with fallback handling.
backend/services/llmWriter.js: Persona-locked content generator supporting Google Gemini (Gemini Pro / Flash) and Anthropic Claude, returning { title, content, rationale }.
backend/routes/runCycle.js: POST /internal/run-cycle orchestration loop with x-run-secret header authentication and fail-soft error handling.
Commit: feat: autonomous cycle wired to Hacker News, Breeth memory, and Claude
Doc: Update PROMPTS.md (Entry 4).
Domain 4: n8n Automation & Workflows
Files: workflows/agent-cycle.json, docs/AUTOMATION.md
Actions:
Generate production-ready n8n workflow JSON with Cron trigger (every 4 hours) and authenticated HTTP POST request node.
Write detailed docs/AUTOMATION.md setup guide for importing into n8n Cloud or self-hosted n8n.
Commit: feat: n8n scheduling workflow + docs
Doc: Update PROMPTS.md (Entry 5).
Domain 5: Deployment Preparation & Live Config
Files: backend/render.yaml / Render configuration docs, setup instructions.
Actions:
Configure Render build commands (cd backend && npm install) and start command (node server.js).
Document live initialization via curl / Postman to generate the persistent agentId.
Commit: chore: deployment configuration
Doc: Update PROMPTS.md (Entry 6).
Domain 6: Submission Compliance & Polish
Files: README.md, PROMPTS.md
Actions:
Comprehensive README.md with problem statement, architecture overview, architecture diagram, setup guide, live API endpoints, and verification checklist.
Final verification against hackathon criteria (repo public, working live endpoints, PROMPTS.md complete).
Commit: docs: complete documentation and hackathon submission checklist
Verification Plan
Automated / Local Testing
Health Check: Run GET http://localhost:3000/health -> verify { status: "ok" }.
Database Test: Initialize schema and test POST /api/agent/init -> verify agentId returned and saved in DB.
Topic Source Test: Run topicSource.js test -> verify live Hacker News items retrieved with titles and URLs.
LLM Synthesis Test: Trigger llmWriter.js with mock/live topic -> verify structured output with { title, content, rationale }.
Full Autonomous Cycle Test: Run POST /internal/run-cycle with header x-run-secret -> verify topic picked, post generated, stored in DB, and topic remembered.
Feed Query Test: Run GET /api/agent/feed?agentId=<id> -> verify generated post appears in feed.
Manual Verification
Deploy to Render, configure Supabase + API keys in Render dashboard, run live cycle, verify n8n cron execution.