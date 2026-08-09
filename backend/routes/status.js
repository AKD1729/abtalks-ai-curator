/**
 * Status & Monitoring Route
 * Provides real-time health telemetry on agent execution, DB stats, and memory status.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

const startTime = Date.now();
let lastCycleExecution = null;

/**
 * Helper to record cycle execution results for telemetry
 */
function recordCycleTelemetry(result) {
  lastCycleExecution = {
    timestamp: new Date().toISOString(),
    ...result
  };
}

router.get('/status', async (req, res) => {
  try {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    // Check DB health and retrieve stats
    let dbStatus = 'connected';
    let agentCount = 0;
    let postCount = 0;
    let activeAgent = null;
    let latestPost = null;

    try {
      const agentRes = await pool.query('SELECT id, name, topic_focus, created_at FROM agents ORDER BY created_at DESC LIMIT 1');
      const countRes = await pool.query('SELECT COUNT(*) FROM posts');
      const latestPostRes = await pool.query('SELECT id, title, created_at FROM posts ORDER BY created_at DESC LIMIT 1');

      if (agentRes.rows.length > 0) activeAgent = agentRes.rows[0];
      postCount = parseInt(countRes.rows[0]?.count || '0', 10);
      if (latestPostRes.rows.length > 0) latestPost = latestPostRes.rows[0];
    } catch (dbErr) {
      dbStatus = `degraded: ${dbErr.message}`;
    }

    const breethConfigured = Boolean(process.env.BREETH_API_KEY && process.env.BREETH_PROJECT_ID);
    const claudeConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

    return res.status(200).json({
      status: 'operational',
      uptime: `${uptimeSeconds}s`,
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        totalPosts: postCount,
        latestPost: latestPost ? { title: latestPost.title, publishedAt: latestPost.created_at } : null
      },
      agent: activeAgent ? {
        id: activeAgent.id,
        name: activeAgent.name,
        topic_focus: activeAgent.topic_focus
      } : { status: 'uninitialized' },
      integrations: {
        breethMemory: breethConfigured ? 'configured' : 'fallback_mode',
        anthropicClaude: claudeConfigured ? 'configured' : 'fallback_mode'
      },
      lastCycle: lastCycleExecution || { status: 'waiting_for_first_cycle' }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = {
  router,
  recordCycleTelemetry
};
