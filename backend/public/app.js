/**
 * AB Talks AI Curator — Live Feed Dashboard Logic
 */

let activeAgentId = null;

// DOM Elements
const agentNameEl = document.getElementById('agentName');
const agentBioEl = document.getElementById('agentBio');
const agentFocusEl = document.getElementById('agentFocus');
const agentIdPill = document.getElementById('agentIdPill');
const postCountBadge = document.getElementById('postCountBadge');
const postsStreamEl = document.getElementById('postsStream');
const refreshBtn = document.getElementById('refreshBtn');
const triggerCycleBtn = document.getElementById('triggerCycleBtn');
const statusLabel = document.getElementById('statusLabel');

/**
 * Format date to relative or human-readable format
 */
function formatDate(isoString) {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Fetch and render agent profile
 */
async function loadAgentProfile() {
  try {
    const res = await fetch('/api/agent/current');
    if (res.ok) {
      const data = await res.json();
      const agent = data.agent;
      if (agent) {
        activeAgentId = agent.id;
        agentNameEl.textContent = agent.name;
        agentBioEl.textContent = agent.persona_description;
        agentFocusEl.textContent = agent.topic_focus;
        agentIdPill.textContent = `ID: ${agent.id.slice(0, 8)}...`;
        agentIdPill.title = `Full ID: ${agent.id} (Click to copy)`;
        agentIdPill.onclick = () => {
          navigator.clipboard.writeText(agent.id);
          const original = agentIdPill.textContent;
          agentIdPill.textContent = 'Copied!';
          setTimeout(() => agentIdPill.textContent = original, 2000);
        };
      }
    }
  } catch (err) {
    console.warn('Could not load current agent profile:', err);
  }
}

/**
 * Fetch and render feed posts
 */
async function loadFeed() {
  try {
    const url = activeAgentId ? `/api/agent/feed?agentId=${activeAgentId}` : '/api/agent/feed';
    const res = await fetch(url);

    if (!res.ok) {
      const err = await res.json();
      renderEmptyState(err.error || 'No posts available yet. Trigger a cycle to publish.');
      return;
    }

    const data = await res.json();
    const posts = data.posts || [];

    postCountBadge.textContent = `${posts.length} Post${posts.length === 1 ? '' : 's'} Published`;

    if (posts.length === 0) {
      renderEmptyState('No curated posts published yet. Initialize your agent or trigger an autonomous cycle!');
      return;
    }

    postsStreamEl.innerHTML = posts.map((post) => `
      <article class="post-card">
        <header class="post-header">
          <h4 class="post-title">${escapeHtml(post.title)}</h4>
          <time class="post-time">${formatDate(post.created_at)}</time>
        </header>

        <div class="post-body">${escapeHtml(post.content)}</div>

        <div class="post-rationale-box">
          <div class="rationale-title">🧠 Editorial Rationale & Relevance</div>
          <div class="rationale-text">${escapeHtml(post.rationale)}</div>
        </div>

        <footer class="post-footer">
          <a href="${escapeHtml(post.source_url || '#')}" target="_blank" rel="noopener noreferrer" class="source-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Original Source Story
          </a>
          <span class="topic-badge">#${escapeHtml(post.topic_key || 'tech')}</span>
        </footer>
      </article>
    `).join('');
  } catch (err) {
    renderEmptyState('Unable to reach backend feed service. Please check connection.');
  }
}

function renderEmptyState(message) {
  postsStreamEl.innerHTML = `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Trigger autonomous cycle
 */
async function triggerCycle() {
  const originalText = triggerCycleBtn.innerHTML;
  triggerCycleBtn.disabled = true;
  triggerCycleBtn.innerHTML = `
    <div class="spinner" style="width: 14px; height: 14px; margin: 0; border-width: 2px;"></div>
    Synthesizing...
  `;

  try {
    const res = await fetch('/internal/run-cycle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    if (data.status === 'success') {
      await loadFeed();
    } else {
      alert(`Cycle notice: ${data.message || 'Cycle executed.'}`);
    }
  } catch (err) {
    alert(`Cycle error: ${err.message}`);
  } finally {
    triggerCycleBtn.disabled = false;
    triggerCycleBtn.innerHTML = originalText;
  }
}

// Event Listeners
refreshBtn.addEventListener('click', () => {
  loadFeed();
});

triggerCycleBtn.addEventListener('click', () => {
  triggerCycle();
});

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await loadAgentProfile();
  await loadFeed();

  // Auto-refresh feed every 30 seconds
  setInterval(loadFeed, 30000);
});
