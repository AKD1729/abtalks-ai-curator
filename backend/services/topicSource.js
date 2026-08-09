/**
 * Topic Source Service
 * Discovers trending tech stories from Hacker News Official Firebase API
 */

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

/**
 * Fetches top trending stories from Hacker News
 * @param {number} limit Number of top stories to inspect (default: 15)
 * @returns {Promise<Array<{id: number, title: string, url: string, score: number, by: string}>>}
 */
async function fetchTopTopics(limit = 15) {
  try {
    const topStoriesRes = await fetch(`${HN_BASE_URL}/topstories.json`);
    if (!topStoriesRes.ok) {
      throw new Error(`Failed to fetch top stories: ${topStoriesRes.status} ${topStoriesRes.statusText}`);
    }

    const storyIds = await topStoriesRes.json();
    const topIds = storyIds.slice(0, limit);

    const storyPromises = topIds.map(async (id) => {
      try {
        const itemRes = await fetch(`${HN_BASE_URL}/item/${id}.json`);
        if (!itemRes.ok) return null;
        const item = await itemRes.json();

        // Filter for valid stories with title and URL (or Ask HN / Show HN fallback)
        if (!item || !item.title) return null;

        const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
        return {
          id: item.id,
          title: item.title,
          url,
          score: item.score || 0,
          by: item.by || 'anonymous',
          time: item.time
        };
      } catch (err) {
        console.warn(`[topicSource] Failed to fetch item ${id}:`, err.message);
        return null;
      }
    });

    const results = await Promise.all(storyPromises);
    const validTopics = results.filter(Boolean);

    console.log(`[topicSource] Successfully fetched ${validTopics.length} candidate topics from Hacker News`);
    return validTopics;
  } catch (error) {
    console.error('[topicSource] Error fetching topics from Hacker News:', error);
    return [];
  }
}

module.exports = {
  fetchTopTopics
};
