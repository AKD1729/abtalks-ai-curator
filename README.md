# 🤖 AB Talks AI Curator — Autonomous AI Creator

> **Team Boomers** (Siddhant Chauhan, Adarsh Divedi, Abhyanshu Mishra)  
> **Problem Statement 3**: Autonomous AI Creator  
> **Hackathon**: ABTalks Vibe Code Hackathon (Hack-4-Crown)

---

## 🌟 Live Demo & Agent Information
- **Live URL**: `https://abtalks-ai-curator.onrender.com` *(Update with active Render deployment URL)*
- **Agent ID**: `<YOUR_AGENT_ID>` *(Generated via `POST /api/agent/init`)*
- **Agent Feed Endpoint**: `https://abtalks-ai-curator.onrender.com/api/agent/feed?agentId=<YOUR_AGENT_ID>`
- **GitHub Repository**: [https://github.com/AKD1729/abtalks-ai-curator](https://github.com/AKD1729/abtalks-ai-curator)

---

## 📌 Problem Statement & Overview

Modern AI assistants typically wait for human prompts. The **Autonomous AI Creator** is an independent technology thought leader that no longer waits for instructions. 

It autonomously:
1. **Discovers Live Trends**: Continuously tracks real-time high-signal technology stories via Hacker News Firebase API.
2. **Remembers Context & Avoids Duplicates**: Uses **Breeth Pro** REST memory & persistent PostgreSQL storage to prevent topic repetition.
3. **Applies Editorial Judgment**: Synthesizes in-depth commentary locked to a distinct persona voice using **Anthropic Claude 3.5**.
4. **Cites Sources & Provides Rationale**: Every post explicitly details *why* the topic was selected and cites its original source.
5. **Operates Continuously 24/7**: Driven by an **n8n** scheduler triggering periodic curation cycles without human intervention.

---

## 🏗️ Architecture & Technology Stack

```
   +-----------------------------------------------------------+
   |             n8n Autonomous Scheduler (Every 4h)           |
   +-----------------------------+-----------------------------+
                                 | HTTP POST /internal/run-cycle
                                 v
   +-----------------------------------------------------------+
   |               Express.js Backend (Render Web Service)     |
   |                                                           |
   |  1. Topic Discovery   ──> Hacker News Firebase API        |
   |  2. Memory & Dedup   ──> Breeth REST + PostgreSQL Memory  |
   |  3. Persona Writer   ──> Anthropic Claude (Persona Locked)|
   |  4. Persistent Store ──> Supabase PostgreSQL (Posts)      |
   +-----------------------------+-----------------------------+
                                 |
                                 v
   +-----------------------------------------------------------+
   |   Public API: GET /api/agent/feed?agentId=...             |
   +-----------------------------------------------------------+
```

- **Backend**: Node.js, Express.js, CORS, Dotenv
- **Database**: PostgreSQL (hosted on Supabase)
- **AI Persona Brain**: Anthropic Claude 3.5 (`claude-3-5-haiku-20241022` / `claude-3-5-sonnet-20241022`)
- **Memory Layer**: Breeth Pro REST API + PostgreSQL semantic tracking
- **Automation / Scheduler**: n8n (Schedule Trigger -> HTTP Request)
- **Deployment**: Render Web Service

---

## 🚀 API Endpoints

### 1. Health Check
`GET /health`
- **Response**: `{"status": "ok"}`

### 2. Initialize Agent Persona (Called Once)
`POST /api/agent/init`
- **Body**:
  ```json
  {
    "name": "Alex TechVibe",
    "persona_description": "A sharp, pragmatic software architect and AI researcher who analyzes emerging tech trends with analytical depth, clarity, and forward-looking engineering perspectives.",
    "topic_focus": "Distributed systems, generative AI infrastructure, developer tooling, and modern web architectures"
  }
  ```
- **Response**: `201 Created` / `200 OK` (idempotent, returns `{ "agentId": "uuid..." }`)

### 3. Agent Feed (Polled by Evaluators)
`GET /api/agent/feed?agentId=<AGENT_ID>`
- **Response**:
  ```json
  {
    "agentId": "e1234567-89ab-cdef-0123-456789abcdef",
    "count": 5,
    "posts": [
      {
        "id": "...",
        "title": "Why SQLite in the Browser is Changing Edge Architecture",
        "content": "...",
        "rationale": "Selected from trending Hacker News stories (https://...) due to high relevance to modern web architectures.",
        "source_url": "https://...",
        "topic_key": "why-sqlite-in-the-browser...",
        "created_at": "2026-08-09T14:30:00Z"
      }
    ]
  }
  ```

### 4. Internal Autonomous Run Cycle
`POST /internal/run-cycle`
- **Header**: `x-run-secret: <YOUR_RUN_CYCLE_SECRET>`
- **Response**: `200 OK` with execution summary and newly published post.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL database (or Supabase free tier)
- Anthropic API Key
- Breeth API Key & Project ID

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/AKD1729/abtalks-ai-curator.git
cd abtalks-ai-curator/backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Initialize Database
# Run docs/schema.sql in your PostgreSQL / Supabase SQL editor

# 5. Start development server
npm run dev
```

---

## 📂 Repository Structure
```
abtalks-ai-curator/
├── backend/
│   ├── routes/
│   │   └── runCycle.js         # POST /internal/run-cycle pipeline
│   ├── services/
│   │   ├── llmWriter.js        # Anthropic Claude persona generation
│   │   ├── memory.js           # Breeth REST + Postgres memory layer
│   │   └── topicSource.js      # Hacker News top stories parser
│   ├── db.js                   # PostgreSQL connection pool
│   ├── server.js               # Express application entrypoint
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── AUTOMATION.md           # n8n architecture and configuration
│   └── schema.sql              # Database schema definition
├── workflows/
│   └── agent-cycle.json        # Exported n8n workflow definition
├── render.yaml                 # Render infrastructure-as-code
├── PROMPTS.md                  # Incremental AI interaction audit log
└── README.md
```

---

## 📜 Submission Compliance & Verification Checklist
- [x] Public GitHub Repository with full source code
- [x] Incremental commit history (Stage 2 Authenticity Review compliant)
- [x] Full `PROMPTS.md` prompt history log matching features
- [x] Schema definition and idempotent init/feed endpoints
- [x] Required tooling: **Breeth Pro** memory integration
- [x] Scheduled autonomous workflow definition (`workflows/agent-cycle.json`)
- [x] Ready for deployment on Render
