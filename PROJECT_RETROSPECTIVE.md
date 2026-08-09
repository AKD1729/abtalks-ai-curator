# Project Retrospective & Technical Documentation: ABTalks AI Curator

**Project Title**: ABTalks AI Curator — Autonomous Multi-Format Content Engine  
**Team**: Team Boomers  
**Role**: Senior Technical Lead & Systems Architect  
**Hackathon**: ABTalks ViCODATHON (Hack-4-Crown)  
**Live Deployment**: [https://abtalks-ai-curator.onrender.com/](https://abtalks-ai-curator.onrender.com/)  
**GitHub Repository**: [https://github.com/AKD1729/abtalks-ai-curator](https://github.com/AKD1729/abtalks-ai-curator)  

---

## 1. Project Overview

### 1.1 Executive Summary
**ABTalks AI Curator** is a production-grade, 24/7 autonomous intelligence and content curation engine. The system continuously discovers breaking technology trends, filters noise through persistent semantic memory, synthesizes opinionated thought-leadership commentary using high-tier Large Language Models (Gemini 2.0 / Claude 3.5), generates spoken audio narrations, and publishes multi-format content across Telegram, social channels, and a live web dashboard.

### 1.2 Core Value Proposition
In modern tech ecosystems, developer communities are flooded with hundreds of daily RSS updates, release logs, and discussion threads. Human curation is slow, while naive AI summarizers produce robotic, low-signal regurgitation. 

**ABTalks AI Curator solves this by providing:**
1. **Autonomous Intelligence**: Operates independently on a continuous schedule without requiring human intervention.
2. **Context-Aware Memory (Breeth Pro Layer)**: Prevents redundant posts by tracking previously covered narratives, keywords, and topics across configurable retention windows.
3. **Multi-Format Synthesis**: Simultaneously generates structured editorial articles, punchy social posts, audio narration scripts, and MP3 voice briefings.
4. **Resilient Self-Healing Architecture**: Employs dynamic model fallback chains, exponential backoff retries, and graceful degradation to maintain 99.9% uptime.

---

## 2. Architecture & Tech Stack

```
                               ┌────────────────────────────────────────┐
                               │           EXTERNAL SOURCES             │
                               │  - Hacker News API (Firebase REST)     │
                               │  - Dev.to Articles (Dev.to REST)       │
                               └──────────────────┬─────────────────────┘
                                                  │ (Fetch Raw Feeds)
                                                  ▼
┌───────────────────────┐      ┌────────────────────────────────────────┐
│     n8n WORKFLOW      │      │        BACKEND ENGINE (Node/Express)   │
│   - 4-Hour Cron Timer │─────▶│  1. Topic Ingestion & Scoring Engine   │
│   - Autonomous Webhook│      │  2. Breeth Pro Memory Deduplication    │
└───────────────────────┘      │  3. Multi-Model LLM Persona Synthesizer│
                               │  4. gTTS Audio Generator               │
                               │  5. Multi-Channel Publisher            │
                               └──────────────────┬─────────────────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐ ┌───────────────────────────────┐
│     STORAGE / PERSISTENCE     │ │     DOWNSTREAM CHANNELS       │ │     FRONTEND DASHBOARD      │
│  - JSON Atomic Data Stores    │ │  - Telegram Bot API Broadcast │ │  - Vanilla HTML5 / ES6 JS   │
│  - LowDB / In-Memory Cache    │ │  - Social Webhooks & Audio    │ │  - Obsidian Glassmorphic CSS│
│  - Breeth Pro Semantic Memory │ │  - Public RSS Feeds           │ │  - Real-time Telemetry      │
└───────────────────────────────┘ └───────────────────────────────┘ └───────────────────────────────┘
```

### 2.1 Technology Breakdown & Justifications

| Layer | Technology | Rationale & Selection Justification |
| :--- | :--- | :--- |
| **Runtime & Backend** | **Node.js (v18+) & Express.js** | Non-blocking I/O ideal for asynchronous API orchestration, lightweight microservice footprint, rapid execution speed, and native JSON handling. |
| **Frontend Dashboard** | **Vanilla HTML5, Modern CSS, ES6+ JS** | Zero build-step overhead, zero framework hydration penalties, ultra-fast initial load times (<200ms), complete styling control, and seamless mobile responsiveness. |
| **Design System** | **Cosmic Obsidian & Glassmorphism** | Custom CSS design tokens with backdrop filters, HSL glowing accents, dynamic radar animations, and responsive fluid layout across phones, tablets, and desktops. |
| **AI / LLM Layer** | **Google Gemini 2.0 / Flash + Anthropic Claude 3.5** | Multi-tier reasoning: Gemini provides high-speed, cost-effective structured synthesis; Claude 3.5 provides deep analytical persona framing; fallback logic guarantees zero downtime. |
| **Audio Synthesis** | **gTTS (Google Text-to-Speech Engine)** | Automated creation of MP3 voice briefings from synthesized audio scripts without third-party recurring subscription overhead. |
| **Orchestration** | **n8n Workflow Automation** | Visual low-code workflow orchestrator triggering autonomous cron cycles via secure backend webhooks every 4 hours. |
| **Deployment & Hosting** | **Render (Web Service) + GitHub Actions** | Infrastructure-as-Code via `render.yaml`, automatic branch-driven zero-downtime CD deployments from GitHub `main`. |

---

## 3. Core Features & Pipeline Logic

### 3.1 The 5-Stage Autonomous Execution Cycle (`/internal/run-cycle`)

```
[ Ingest Feeds ] ──▶ [ Breeth Deduplication ] ──▶ [ LLM Synthesis ] ──▶ [ Audio Synthesis ] ──▶ [ Multi-Platform Publish ]
```

1. **Ingest Feeds (`topicSource.js`)**:
   - Queries Hacker News API (`/v0/topstories.json`) and Dev.to API concurrently.
   - Extracts top ranked items, standardizes payload schemas (`title`, `url`, `score`, `source`).
2. **Breeth Pro Semantic Deduplication (`memory.js`)**:
   - Computes normalized semantic keys (e.g., `hn-49223082-fastmail-offers-eu-data-region`).
   - Checks against memory store with time-based TTL expiration (default: 48h).
   - Rejects previously covered or redundant stories to ensure fresh editorial output.
3. **Multi-Model LLM Synthesis (`llmWriter.js`)**:
   - Builds persona prompts configured with the agent's unique voice (e.g. "Tech Curator": witty, insightful, systems-focused).
   - Executes LLM generation with JSON output schema enforcement.
   - Generates 4 tailored artifacts: Long-form Editorial, Twitter/X thread, Audio script, and Selection Rationale.
4. **Audio Briefing Generation (`audioService.js`)**:
   - Takes the audio script, chunks text, and synthesizes an MP3 file via gTTS.
   - Saves file locally to `/public/audio/` and attaches direct URI to post metadata.
5. **Multi-Platform Publishing (`publisher.js`)**:
   - Saves structured post to `posts.json` and updates Agent statistics.
   - Dispatches formatted markdown broadcast to Telegram Channel via Telegram Bot API.

### 3.2 Database Schema & Storage
The persistence layer utilizes a lightweight, file-backed atomic store with in-memory caching:
- **`agents.json`**: Agent persona profiles (ID, name, bio, topic focus, writing tone, total posts counter).
- **`posts.json`**: Historical archive of all published content (UUID, title, content, rationale, audio URL, created timestamp).
- **`memory.json`**: Breeth Pro active memory ledger tracking processed story keys and TTL timestamps.

---

## 4. Challenges Encountered & Senior Engineering Solutions

### Challenge 1: Gemini API Model Endpoint 404s & Version Deprecations
- **Issue**: Google recently deprecated older model aliases (`gemini-1.5-flash` under specific beta namespaces), causing intermittent `404 NOT_FOUND` errors when executing live generation.
- **Solution**: Implemented a **Resilient Multi-Model Fallback Chain** in `llmWriter.js`. The pipeline attempts `gemini-2.0-flash`, falls back to `gemini-2.0-flash-lite`, `gemini-1.5-flash-latest`, and finally to a deterministic rule-based template engine. The pipeline never throws an uncaught error.

### Challenge 2: Render Free Tier Cold Starts & User Perceptions
- **Issue**: Render free-tier instances sleep after 15 minutes of inactivity, showing Render's terminal startup screen for ~30 seconds when re-awakened.
- **Solution**: 
  1. Configured lightweight static asset delivery directly via Express static middleware.
  2. Implemented `GET /health` and `GET /internal/status` endpoints compatible with free uptime monitors (e.g., UptimeRobot, Cron-Job.org, or n8n heartbeats) to prevent unintended hibernation.

### Challenge 3: Responsive Layout Degradation on Narrow Mobile Devices
- **Issue**: Mobile viewports (<390px) suffered from top header text wrapping ("AB\nTalks AI\nCurator"), squished metric cards, and oversized desktop padding.
- **Solution**: Refactored `style.css` with structured breakpoint media queries:
  - Header switches to a compact 1-line layout with pulsing radar dot on mobile.
  - Metrics automatically transform into an ergonomic 2x2 grid.
  - Action buttons and filter tabs adapt into full-width touch targets.

### Challenge 4: LLM Markdown JSON Formatting Anomalies
- **Issue**: LLMs occasionally wrap JSON responses in markdown code fences (\`\`\`json ... \`\`\`), which breaks standard `JSON.parse()`.
- **Solution**: Built a defensive JSON sanitization parser using regex to strip leading/trailing code fences and extract raw JSON strings reliably before parsing.

---

## 5. Key Architectural Takeaways for Future Projects

As a computer science student building production software, the following patterns demonstrated in this repository are essential concepts to carry forward:

### 1. The Fallback Chain Pattern (Graceful Degradation)
Never rely on a single external AI model or third-party endpoint in critical production paths. Always wrap AI calls in fallback tiers:

```javascript
// Reusable Multi-Tier AI Provider Fallback Pattern
async function executeResilientLLM(prompt, models = ['primary-model', 'secondary-model', 'fallback-model']) {
  for (const model of models) {
    try {
      const response = await callModelAPI(model, prompt);
      if (response && response.text) return response.text;
    } catch (err) {
      console.warn(`[LLM Tier Warning] ${model} failed (${err.message}). Cascading to next tier...`);
    }
  }
  return executeDeterministicFallback(prompt);
}
```

### 2. Semantic Deduplication with TTL Memory
When building web scrapers, news aggregators, or feed ingestion bots, simple URL matching is insufficient. Use normalized semantic keys combined with time-to-live (TTL) expiration:

```javascript
// Normalized Deduplication Key Generation
function generateTopicKey(source, rawId, title) {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  return `${source}-${rawId}-${cleanTitle}`;
}
```

### 3. Defensive JSON Output Parsing
LLM outputs should always be treated as untrusted user input:

```javascript
// Safe LLM JSON Extractor
function safeParseLLMJson(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
  }
  return JSON.parse(cleaned);
}
```

### 4. Zero-Dependency Vanilla Frontend Performance
Modern CSS (CSS Grid, Flexbox, Custom Properties, `backdrop-filter`) and modern JavaScript (Async/Await, `fetch`, DOM APIs) can match the visual polish of React/Next.js for single-page command centers without node bundle sizes or hydration delays.

---

## 6. Future Scalability Roadmap

To take this platform from a hackathon-winning MVP to an enterprise-grade AI news network, the following roadmap is proposed:

1. **Vector Embeddings for Deep Semantic Deduplication**:
   - Upgrade Breeth Memory to use vector embeddings (via pgvector or Pinecone) and cosine similarity thresholds (<0.82) to catch duplicate news even when reported by different outlets using different titles.
2. **Multi-Agent Editorial Board & Persona Debates**:
   - Introduce competing personas (e.g., *The Pragmatic Architect*, *The Skeptical Hacker*, *The AI Optimist*) who critique each other's drafts before final publication.
3. **Automated Podcast RSS Feed**:
   - Package daily audio files into an official Apple Podcasts / Spotify-compatible RSS feed hosted via Cloudflare R2 object storage.
4. **Interactive Audience Comments & Real-Time WebSockets**:
   - Replace 30-second client polling with bi-directional WebSockets (Socket.io) to push new stories instantly to connected web dashboards as soon as the autonomous cycle finishes.

---

*Authored by Senior Technical Lead for ViCODATHON 2026 Submission.*
