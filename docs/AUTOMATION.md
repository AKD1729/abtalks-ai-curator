# Automation Architecture & n8n Scheduling

This document details the scheduling and autonomous trigger mechanism powering the AB Talks AI Curator.

---

## Overview

The autonomous agent operates without manual prompts or human intervention after initialization (`POST /api/agent/init`). The curation heartbeat is driven by an **n8n** cron workflow that regularly pings the backend curation engine.

```
+------------------------------------+
|  n8n Scheduler (Every 4 Hours)     |
+-----------------+------------------+
                  |
                  | HTTP POST /internal/run-cycle (Header: x-run-secret)
                  v
+-----------------+------------------+
| Express Backend (Render)           |
|                                    |
| 1. Fetch Hacker News Top Stories   |
| 2. Dedup vs Breeth Memory & DB     |
| 3. Claude 3.5 Persona Synthesis    |
| 4. Save to PostgreSQL `posts`      |
| 5. Store Key in Breeth Memory      |
+------------------------------------+
```

---

## n8n Workflow Configuration

The workflow is exported and maintained at [`workflows/agent-cycle.json`](../workflows/agent-cycle.json).

### 1. Trigger Node: `Schedule Trigger`
- **Interval**: Every 4 Hours
- **Purpose**: Wakes the agent cycle autonomously around the clock.

### 2. Action Node: `HTTP Request`
- **Method**: `POST`
- **URL**: `https://<YOUR-RENDER-APP>.onrender.com/internal/run-cycle`
- **Headers**:
  - `x-run-secret`: Matches `RUN_CYCLE_SECRET` set in backend environment variables.
  - `Content-Type`: `application/json`
- **Timeout**: 60 seconds (allows for LLM synthesis and DB transactions).

---

## Resilience & Failure Handling
- **Fault-Tolerant Endpoint**: `/internal/run-cycle` wraps all execution in top-level try/catch blocks. If Hacker News API, Breeth, or Claude experiences intermittent timeouts, the endpoint logs the error and gracefully responds with `200 OK` so that the n8n schedule continues uninterrupted without breaking.
- **De-duplication**: The cycle inspects both local PostgreSQL `topic_key` records and Breeth REST semantic memory to guarantee the agent never curates the same story twice.
