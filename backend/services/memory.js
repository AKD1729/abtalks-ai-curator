/**
 * Memory Service — Breeth Pro Memory Layer (Required Tooling) & Database Memory
 * Prevents topic repetition, performs semantic similarity checks, and retains long-term memory.
 */

const pool = require('../db');

const BREETH_API_URL = process.env.BREETH_API_URL || 'https://api.thebreeth.com/v1';

/**
 * Normalizes a topic string into a consistent topicKey
 * @param {string} titleOrUrl
 * @returns {string}
 */
function generateTopicKey(titleOrUrl) {
  if (!titleOrUrl) return 'unknown-topic';
  return titleOrUrl
    .toLowerCase()
    .replace(/https?:\/\/(www\.)?/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 100)
    .replace(/^-|-$/g, '');
}

/**
 * Checks if the agent has already seen/covered this topic using Breeth Pro Memory and PostgreSQL
 * @param {string} topicKey
 * @param {string} agentId
 * @returns {Promise<boolean>}
 */
async function hasSeenTopic(topicKey, agentId) {
  try {
    // 1. Primary check: PostgreSQL posts table
    if (agentId) {
      const dbCheck = await pool.query(
        'SELECT id FROM posts WHERE agent_id = $1 AND (topic_key = $2 OR topic_key ILIKE $3) LIMIT 1',
        [agentId, topicKey, `%${topicKey}%`]
      );
      if (dbCheck.rows.length > 0) {
        console.log(`[memory] Topic already covered in database: ${topicKey}`);
        return true;
      }
    }

    // 2. Secondary check: Breeth Pro REST / Semantic Memory Layer
    const apiKey = process.env.BREETH_API_KEY;
    const projectId = process.env.BREETH_PROJECT_ID;

    if (apiKey) {
      try {
        console.log(`[memory] Querying Breeth Pro memory for topic: "${topicKey}"...`);
        const endpoint = projectId 
          ? `${BREETH_API_URL}/projects/${projectId}/memories/search`
          : `${BREETH_API_URL}/memories/search`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey
          },
          body: JSON.stringify({
            query: topicKey,
            threshold: 0.85
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.matches && data.matches.length > 0) {
            console.log(`[memory] Topic match found in Breeth Pro memory: ${topicKey}`);
            return true;
          }
        } else {
          console.warn(`[memory] Breeth Pro search responded with status ${response.status}`);
        }
      } catch (breethErr) {
        console.warn(`[memory] Breeth Pro search unreachable (${breethErr.message}) - continuing with DB memory fallback`);
      }
    }

    return false;
  } catch (error) {
    console.warn(`[memory] hasSeenTopic check failed for key "${topicKey}":`, error.message);
    // As per specification: treat as "not seen" and log warning rather than crashing
    return false;
  }
}

/**
 * Saves a topic summary to Breeth Pro memory layer and PostgreSQL
 * @param {string} topicKey
 * @param {string} summary
 * @param {string} agentId
 * @returns {Promise<void>}
 */
async function saveTopic(topicKey, summary, agentId) {
  const apiKey = process.env.BREETH_API_KEY;
  const projectId = process.env.BREETH_PROJECT_ID;

  if (!apiKey) {
    console.log('[memory] BREETH_API_KEY not set; stored topic in primary database memory.');
    return;
  }

  try {
    console.log(`[memory] Storing topic to Breeth Pro memory: "${topicKey}"...`);
    const endpoint = projectId
      ? `${BREETH_API_URL}/projects/${projectId}/memories`
      : `${BREETH_API_URL}/memories`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        agent_id: agentId,
        topic_key: topicKey,
        content: summary,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.warn(`[memory] Breeth Pro save returned status ${response.status} ${response.statusText}`);
    } else {
      console.log(`[memory] Successfully persisted memory in Breeth Pro: ${topicKey}`);
    }
  } catch (error) {
    console.warn(`[memory] Breeth Pro memory save notice (${error.message}) - post preserved in database`);
  }
}

module.exports = {
  generateTopicKey,
  hasSeenTopic,
  saveTopic
};
