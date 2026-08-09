/**
 * Run Cycle Route — Autonomous Publishing Pipeline
 * Triggered by n8n or internal scheduler to run an autonomous curation loop.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { fetchTopTopics } = require('../services/topicSource');
const { generateTopicKey, hasSeenTopic, saveTopic } = require('../services/memory');
const { generatePost } = require('../services/llmWriter');

const { recordCycleTelemetry } = require('./status');

router.post('/run-cycle', async (req, res) => {
  console.log('[runCycle] Starting autonomous curation cycle...');

  // 1. Validate secret header
  const runSecret = req.headers['x-run-secret'];
  const expectedSecret = process.env.RUN_CYCLE_SECRET;

  if (expectedSecret && runSecret !== expectedSecret) {
    console.warn('[runCycle] Unauthorized run-cycle attempt. Secret mismatch.');
    return res.status(401).json({ error: 'Unauthorized. Invalid x-run-secret header.' });
  }

  try {
    // 2. Fetch the active agent from database
    const agentResult = await pool.query(
      'SELECT id, name, persona_description, topic_focus FROM agents ORDER BY created_at DESC LIMIT 1'
    );

    if (agentResult.rows.length === 0) {
      console.warn('[runCycle] No agent found in database. Please initialize an agent first via POST /api/agent/init.');
      recordCycleTelemetry({ status: 'skipped', reason: 'no_agent' });
      return res.status(200).json({
        status: 'skipped',
        message: 'No agent found. Run POST /api/agent/init first.'
      });
    }

    const agent = agentResult.rows[0];
    console.log(`[runCycle] Running curation cycle for agent: "${agent.name}" (${agent.id})`);

    // 3. Fetch candidate topics from Hacker News & Dev.to
    const topics = await fetchTopTopics();

    if (!topics || topics.length === 0) {
      console.warn('[runCycle] No topics fetched from source.');
      recordCycleTelemetry({ status: 'skipped', reason: 'no_topics' });
      return res.status(200).json({
        status: 'skipped',
        message: 'No topics found from source'
      });
    }

    // 4. Find the first unseen topic using Breeth & DB Memory
    let selectedTopic = null;
    let selectedTopicKey = null;

    for (const topic of topics) {
      const topicKey = generateTopicKey(`${topic.title}-${topic.id}`);
      const alreadySeen = await hasSeenTopic(topicKey, agent.id);

      if (!alreadySeen) {
        selectedTopic = topic;
        selectedTopicKey = topicKey;
        break;
      }
    }

    // If all top candidate topics were previously seen, choose the highest scoring topic with a timestamped variation key
    if (!selectedTopic) {
      console.log('[runCycle] All top candidate topics already seen. Selecting freshest top story for follow-up.');
      selectedTopic = topics[0];
      selectedTopicKey = generateTopicKey(`${selectedTopic.title}-${Date.now()}`);
    }

    console.log(`[runCycle] Selected topic: "${selectedTopic.title}" (Source: ${selectedTopic.source || 'HN'}, Key: ${selectedTopicKey})`);

    // 5. Generate thoughtful post & rationale using Claude LLM
    const generated = await generatePost({ agent, topic: selectedTopic });

    // 6. Save to posts table in PostgreSQL
    const insertPostQuery = `
      INSERT INTO posts (agent_id, title, content, rationale, source_url, topic_key)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, agent_id, title, content, rationale, source_url, topic_key, created_at
    `;
    const postResult = await pool.query(insertPostQuery, [
      agent.id,
      generated.title,
      generated.content,
      generated.rationale,
      selectedTopic.url,
      selectedTopicKey
    ]);

    const createdPost = postResult.rows[0];
    console.log(`[runCycle] Successfully published post "${createdPost.title}" (Post ID: ${createdPost.id})`);

    // 7. Save topic memory to Breeth
    await saveTopic(selectedTopicKey, generated.content, agent.id);

    // Record success telemetry
    recordCycleTelemetry({
      status: 'success',
      agentId: agent.id,
      postTitle: createdPost.title,
      postId: createdPost.id,
      source: selectedTopic.source || 'Hacker News'
    });

    return res.status(200).json({
      status: 'success',
      agent: {
        id: agent.id,
        name: agent.name
      },
      post: createdPost
    });
  } catch (cycleError) {
    console.error('[runCycle] Unhandled error during autonomous cycle:', cycleError);
    recordCycleTelemetry({ status: 'error', error: cycleError.message });
    return res.status(200).json({
      status: 'error',
      message: 'Cycle encountered an error but recovered safely.',
      details: cycleError.message
    });
  }
});

module.exports = router;
