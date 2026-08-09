/**
 * Multi-Source Topic Ingestion Service
 * Ingests trending stories from Hacker News & Dev.to APIs
 */

const { withRetry } = require('./retry');

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
const DEVTO_API_URL = 'https://dev.to/api/articles?per_page=10&top=1';

/**
 * Fetches top stories from Hacker News
 */
async function fetchHackerNewsTopics(limit = 10) {
  try {
    return await withRetry(async () => {
      const topStoriesRes = await fetch(`${HN_BASE_URL}/topstories.json`);
      if (!topStoriesRes.ok) throw new Error(`HN API error: ${topStoriesRes.status}`);

      const storyIds = await topStoriesRes.json();
      const topIds = storyIds.slice(0, limit);

      const storyPromises = topIds.map(async (id) => {
        try {
          const itemRes = await fetch(`${HN_BASE_URL}/item/${id}.json`);
          if (!itemRes.ok) return null;
          const item = await itemRes.json();
          if (!item || !item.title) return null;

          return {
            id: `hn-${item.id}`,
            source: 'Hacker News',
            title: item.title,
            url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
            score: item.score || 0,
            by: item.by || 'community'
          };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(storyPromises);
      return results.filter(Boolean);
    }, { maxRetries: 2, initialDelayMs: 500 });
  } catch (err) {
    console.warn('[topicSource] Failed fetching Hacker News stories:', err.message);
    return [];
  }
}

/**
 * Fetches trending articles from Dev.to
 */
async function fetchDevToTopics(limit = 8) {
  try {
    return await withRetry(async () => {
      const res = await fetch(DEVTO_API_URL, {
        headers: { 'User-Agent': 'ABTalks-AI-Curator/1.0' }
      });
      if (!res.ok) throw new Error(`Dev.to API error: ${res.status}`);

      const articles = await res.json();
      return articles.slice(0, limit).map((article) => ({
        id: `devto-${article.id}`,
        source: 'Dev.to',
        title: article.title,
        url: article.url,
        score: article.positive_reactions_count || 0,
        by: article.user?.name || 'Dev.to author'
      }));
    }, { maxRetries: 2, initialDelayMs: 500 });
  } catch (err) {
    console.warn('[topicSource] Failed fetching Dev.to articles:', err.message);
    return [];
  }
}

/**
 * Fetches and aggregates candidate topics across multiple sources
 * @returns {Promise<Array<{id: string, source: string, title: string, url: string, score: number, by: string}>>}
 */
async function fetchTopTopics() {
  console.log('[topicSource] Fetching candidate topics from Hacker News & Dev.to...');
  const [hnTopics, devtoTopics] = await Promise.all([
    fetchHackerNewsTopics(12),
    fetchDevToTopics(8)
  ]);

  const allTopics = [...hnTopics, ...devtoTopics];
  
  // Sort by engagement score descending
  allTopics.sort((a, b) => (b.score || 0) - (a.score || 0));

  console.log(`[topicSource] Aggregated ${allTopics.length} candidate stories (HN: ${hnTopics.length}, Dev.to: ${devtoTopics.length})`);
  return allTopics;
}

module.exports = {
  fetchTopTopics,
  fetchHackerNewsTopics,
  fetchDevToTopics
};
