require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const runCycleRouter = require('./routes/runCycle');
const { router: statusRouter } = require('./routes/status');

app.use(cors());
app.use(express.json());

// Serve static frontend assets for Live Feed Dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Mount internal routes (autonomous agent execution cycles & telemetry)
app.use('/internal', runCycleRouter);
app.use('/internal', statusRouter);

// 2.2 Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Helper endpoint to fetch active agent info for the dashboard
app.get('/api/agent/current', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, persona_description, topic_focus, created_at FROM agents ORDER BY created_at DESC LIMIT 1'
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active agent found' });
    }
    return res.status(200).json({ agent: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 2.3 Initialize agent endpoint (idempotent / duplicate-safe)
app.post('/api/agent/init', async (req, res) => {
  const { name, persona_description, topic_focus } = req.body;

  if (!name || !persona_description || !topic_focus) {
    return res.status(400).json({
      error: 'Missing required fields: name, persona_description, and topic_focus are required.'
    });
  }

  try {
    // Check if an agent with this name already exists
    const existingAgentQuery = 'SELECT id, name, persona_description, topic_focus, created_at FROM agents WHERE name = $1 LIMIT 1';
    const existingAgentResult = await pool.query(existingAgentQuery, [name.trim()]);

    if (existingAgentResult.rows.length > 0) {
      const existingAgent = existingAgentResult.rows[0];
      console.warn(`[WARNING] Agent "${name}" already exists with ID: ${existingAgent.id}. Returning existing agent.`);
      return res.status(200).json({
        agentId: existingAgent.id,
        message: 'Agent already exists',
        agent: existingAgent
      });
    }

    // Insert new agent
    const insertQuery = `
      INSERT INTO agents (name, persona_description, topic_focus)
      VALUES ($1, $2, $3)
      RETURNING id, name, persona_description, topic_focus, created_at
    `;
    const insertResult = await pool.query(insertQuery, [
      name.trim(),
      persona_description.trim(),
      topic_focus.trim()
    ]);

    const newAgent = insertResult.rows[0];
    console.log(`[INFO] Created new agent "${newAgent.name}" with ID: ${newAgent.id}`);

    return res.status(201).json({
      agentId: newAgent.id,
      agent: newAgent
    });
  } catch (error) {
    console.error('[ERROR] Failed to initialize agent:', error);
    return res.status(500).json({
      error: 'Failed to initialize agent',
      details: error.message
    });
  }
});

// 2.4 Agent feed endpoint
app.get('/api/agent/feed', async (req, res) => {
  let { agentId } = req.query;

  // Fallback: If agentId is not specified in query, select the latest active agent
  if (!agentId) {
    try {
      const defaultAgent = await pool.query('SELECT id FROM agents ORDER BY created_at DESC LIMIT 1');
      if (defaultAgent.rows.length > 0) {
        agentId = defaultAgent.rows[0].id;
      }
    } catch {
      // ignore
    }
  }

  if (!agentId) {
    return res.status(400).json({
      error: 'Query parameter "agentId" is required.'
    });
  }

  try {
    const feedQuery = `
      SELECT id, title, content, rationale, source_url, topic_key, created_at
      FROM posts
      WHERE agent_id = $1
      ORDER BY created_at DESC
    `;
    const feedResult = await pool.query(feedQuery, [agentId]);

    return res.status(200).json({
      agentId,
      count: feedResult.rows.length,
      posts: feedResult.rows
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch agent feed:', error);
    return res.status(500).json({
      error: 'Failed to fetch agent feed',
      details: error.message
    });
  }
});

// Fallback route for SPA / Feed Viewer
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[SERVER] AB Talks AI Curator backend listening on port ${PORT}`);
  });
}

module.exports = app;
