/**
 * LLM Writer Service — Anthropic Claude Persona Writer
 * Writes high-signal curated posts with explicit selection rationale.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';

/**
 * Generates an editorial post and selection rationale using Anthropic Claude
 * @param {Object} params
 * @param {Object} params.agent Agent metadata { name, persona_description, topic_focus }
 * @param {Object} params.topic Topic item { id, title, url, score, by }
 * @returns {Promise<{title: string, content: string, rationale: string}>}
 */
async function generatePost({ agent, topic }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('[llmWriter] ANTHROPIC_API_KEY is not set. Generating fallback structured post.');
    return generateFallbackPost({ agent, topic });
  }

  const systemPrompt = `You are ${agent.name}, an autonomous AI curator and technology thought leader.

Your Persona:
${agent.persona_description}

Your Primary Topic Focus:
${agent.topic_focus}

Your task is to analyze a trending Hacker News story, assess its significance through your unique editorial lens, and write an insightful, engaging commentary post for your audience.

CRITICAL REQUIREMENTS:
1. Stay strictly in character and voice.
2. Provide original analysis and sharp takeaways, not just a summary.
3. Include an explicit "rationale" explaining why you selected this story, how it fits your topic focus, and explicitly cite the source URL.
4. Output MUST be valid JSON with exact keys: "title", "content", "rationale". Do not include any text outside the JSON object.`;

  const userPrompt = `Trending Story to Curate:
Title: ${topic.title}
Source URL: ${topic.url}
Hacker News Score: ${topic.score || 'N/A'} points by ${topic.by || 'community'}

Please generate your post in valid JSON with this exact structure:
{
  "title": "Your catchy, thought-provoking post title",
  "content": "Your in-depth analysis and perspective in your persona's voice (2-4 punchy paragraphs)",
  "rationale": "Explicit explanation of why this topic was selected, its relevance to ${agent.topic_focus}, and citing ${topic.url}"
}`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
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

    // Extract JSON (stripping optional ```json code blocks)
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
  } catch (error) {
    console.error('[llmWriter] Error calling Claude API:', error.message);
    return generateFallbackPost({ agent, topic, errorReason: error.message });
  }
}

/**
 * Generates a structured fallback post when API is unavailable or rate-limited
 */
function generateFallbackPost({ agent, topic, errorReason = '' }) {
  return {
    title: `${topic.title}: Perspectives from ${agent.name}`,
    content: `Today in tech trends, we are examining "${topic.title}". \n\nFrom the perspective of ${agent.topic_focus}, this development signals meaningful momentum in modern software and systems architecture. As builders, understanding how these shifts impact ecosystem dynamics is essential for forward-looking engineering teams.`,
    rationale: `Selected from trending Hacker News stories (${topic.url}) due to high relevance to ${agent.topic_focus}. ${errorReason ? `[Synthesized via fallback mechanism: ${errorReason}]` : ''}`.trim()
  };
}

module.exports = {
  generatePost
};
