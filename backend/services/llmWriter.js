/**
 * LLM Writer Service — Multi-Provider AI Persona Writer (Google Gemini & Anthropic Claude)
 * Writes high-signal curated posts with explicit selection rationale and retry resilience.
 */

const { withRetry } = require('./retry');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-2.5-flash', 'gemini-pro'];

/**
 * Generates an editorial post and selection rationale using Gemini or Claude
 * @param {Object} params
 * @param {Object} params.agent Agent metadata { name, persona_description, topic_focus }
 * @param {Object} params.topic Topic item { id, title, url, score, by, source }
 * @returns {Promise<{title: string, content: string, rationale: string}>}
 */
async function generatePost({ agent, topic }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    return generateWithGemini({ agent, topic, apiKey: geminiKey });
  }

  if (anthropicKey) {
    return generateWithAnthropic({ agent, topic, apiKey: anthropicKey });
  }

  console.warn('[llmWriter] Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY set. Generating fallback structured post.');
  return generateFallbackPost({ agent, topic });
}

/**
 * Generates post using Google Gemini API
 */
async function generateWithGemini({ agent, topic, apiKey }) {
  console.log(`[llmWriter] Generating post via Google Gemini for "${topic.title}"...`);

  const prompt = `You are ${agent.name}, an autonomous AI curator and technology thought leader.

Your Persona:
${agent.persona_description}

Your Primary Topic Focus:
${agent.topic_focus}

Trending Story to Curate:
Source: ${topic.source || 'Hacker News'}
Title: ${topic.title}
Source URL: ${topic.url}
Engagement: ${topic.score || 'N/A'} points by ${topic.by || 'community'}

CRITICAL INSTRUCTIONS:
1. Stay strictly in character and voice.
2. Provide original analysis and sharp takeaways, not just a summary.
3. Include an explicit "rationale" explaining why you selected this story, how it fits your topic focus, and explicitly cite ${topic.url}.
4. Output MUST be a valid JSON object with exact keys: "title", "content", "rationale".

JSON Structure:
{
  "title": "Your catchy, thought-provoking post title",
  "content": "Your in-depth analysis and perspective in your persona's voice (2-4 punchy paragraphs)",
  "rationale": "Explicit explanation of why this topic was selected, its relevance to ${agent.topic_focus}, and citing ${topic.url}"
}`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[llmWriter] Gemini model ${model} failed (${response.status}): ${errorText}. Trying next model...`);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const parsed = JSON.parse(rawText);

      if (!parsed.title || !parsed.content || !parsed.rationale) {
        continue;
      }

      console.log(`[llmWriter] Successfully generated post via Gemini (${model})!`);
      return {
        title: parsed.title.trim(),
        content: parsed.content.trim(),
        rationale: parsed.rationale.trim()
      };
    } catch (err) {
      console.warn(`[llmWriter] Error with Gemini model ${model}:`, err.message);
    }
  }

  return generateFallbackPost({ agent, topic, errorReason: 'Gemini model iteration fallback' });
}

/**
 * Generates post using Anthropic Claude API
 */
async function generateWithAnthropic({ agent, topic, apiKey }) {
  console.log(`[llmWriter] Generating post via Anthropic Claude for "${topic.title}"...`);

  const systemPrompt = `You are ${agent.name}, an autonomous AI curator and technology thought leader.

Your Persona:
${agent.persona_description}

Your Primary Topic Focus:
${agent.topic_focus}

CRITICAL REQUIREMENTS:
1. Stay strictly in character and voice.
2. Provide original analysis and sharp takeaways, not just a summary.
3. Include an explicit "rationale" explaining why you selected this story, how it fits your topic focus, and explicitly cite the source URL (${topic.url}).
4. Output MUST be valid JSON with exact keys: "title", "content", "rationale".`;

  const userPrompt = `Trending Story to Curate:
Source: ${topic.source || 'Hacker News'}
Title: ${topic.title}
Source URL: ${topic.url}
Engagement: ${topic.score || 'N/A'} points by ${topic.by || 'community'}

Please generate your post in valid JSON:
{
  "title": "Your catchy, thought-provoking post title",
  "content": "Your in-depth analysis and perspective in your persona's voice (2-4 punchy paragraphs)",
  "rationale": "Explicit explanation of why this topic was selected, its relevance to ${agent.topic_focus}, and citing ${topic.url}"
}`;

  try {
    return await withRetry(async () => {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: DEFAULT_ANTHROPIC_MODEL,
          max_tokens: 1200,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.content?.[0]?.text || '';

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Claude response did not contain valid JSON block');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.title || !parsed.content || !parsed.rationale) {
        throw new Error('Parsed JSON is missing required fields (title, content, or rationale)');
      }

      return {
        title: parsed.title.trim(),
        content: parsed.content.trim(),
        rationale: parsed.rationale.trim()
      };
    }, { maxRetries: 2, initialDelayMs: 1000 });
  } catch (error) {
    console.error('[llmWriter] Error calling Claude API after retries:', error.message);
    return generateFallbackPost({ agent, topic, errorReason: error.message });
  }
}

/**
 * Structured fallback post when API is unavailable or rate-limited
 */
function generateFallbackPost({ agent, topic, errorReason = '' }) {
  return {
    title: `${topic.title}: Perspective from ${agent.name}`,
    content: `Today in tech trends, we are analyzing "${topic.title}" from ${topic.source || 'tech communities'}. \n\nFrom the perspective of ${agent.topic_focus}, this development represents a significant signal in modern software engineering and architecture. Builders should evaluate how this pattern affects long-term scalability and design tradeoffs.`,
    rationale: `Selected from ${topic.source || 'trending stories'} (${topic.url}) due to high alignment with ${agent.topic_focus}. ${errorReason ? `[Synthesized via resilient fallback: ${errorReason}]` : ''}`.trim()
  };
}

module.exports = {
  generatePost
};
