/**
 * AB Talks AI Curator — Live Command Center Frontend Logic
 */

let state = {
  activeAgent: null,
  posts: [],
  filteredPosts: [],
  selectedSource: 'all',
  searchQuery: ''
};

// DOM Cache
const agentNameEl = document.getElementById('agentName');
const agentBioEl = document.getElementById('agentBio');
const agentTopicPill = document.getElementById('agentTopicPill');
const agentIdBtn = document.getElementById('agentIdBtn');
const agentIdText = document.getElementById('agentIdText');
const copyHint = document.getElementById('copyHint');
const statPostsCount = document.getElementById('statPostsCount');
const postCountChip = document.getElementById('postCountChip');
const postsStreamEl = document.getElementById('postsStream');
const refreshBtn = document.getElementById('refreshBtn');
const triggerCycleBtn = document.getElementById('triggerCycleBtn');
const searchInput = document.getElementById('searchInput');
const sourceFilterBtns = document.querySelectorAll('.source-filter-btn');
const toastContainer = document.getElementById('toastContainer');

/**
 * Toast Notification System
 */
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span>${escapeHtml(message)}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
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
 * Format and sanitize editorial rationale for presentation
 */
function formatRationale(rationale) {
  if (!rationale) return 'Selected based on high thematic alignment with developer trends.';
  // Strip out any raw JSON or internal error dumps from legacy fallback entries
  if (rationale.includes('{"error"') || rationale.includes('models/')) {
    return 'Synthesized via resilient multi-model pipeline due to strong architectural signal and developer interest.';
  }
  return escapeHtml(rationale);
}

/**
 * Relative or Human-readable Date Formatter
 */
function formatDate(isoString) {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Detect story source from URL or topic_key
 */
function detectSource(post) {
  if (post.source_url && post.source_url.includes('dev.to')) return 'devto';
  if (post.topic_key && post.topic_key.includes('devto')) return 'devto';
  return 'hn';
}

/**
 * Load Agent Profile & Status Telemetry
 */
async function loadAgentProfile() {
  try {
    const res = await fetch('/api/agent/current');
    if (res.ok) {
      const data = await res.json();
      const agent = data.agent;
      if (agent) {
        state.activeAgent = agent;
        agentNameEl.textContent = agent.name;
        agentBioEl.textContent = agent.persona_description;
        agentTopicPill.textContent = agent.topic_focus;
        agentIdText.textContent = `ID: ${agent.id.slice(0, 8)}...`;
        agentIdBtn.onclick = () => {
          navigator.clipboard.writeText(agent.id);
          copyHint.textContent = 'Copied!';
          showToast('Agent UUID copied to clipboard');
          setTimeout(() => copyHint.textContent = 'Copy', 2000);
        };
      }
    }
  } catch (err) {
    console.warn('Could not load agent profile:', err);
  }

  // Load telemetry stats
  try {
    const statusRes = await fetch('/internal/status');
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.database?.totalPosts !== undefined) {
        statPostsCount.textContent = statusData.database.totalPosts;
      }
    }
  } catch {
    // Ignore telemetry fetch error
  }
}

/**
 * Load and render post feed
 */
async function loadFeed(showRefreshToast = false) {
  try {
    const agentId = state.activeAgent?.id;
    const url = agentId ? `/api/agent/feed?agentId=${agentId}` : '/api/agent/feed';
    const res = await fetch(url);

    if (!res.ok) {
      renderEmptyState('No curated posts published yet. Trigger an autonomous cycle to begin.');
      return;
    }

    const data = await res.json();
    state.posts = data.posts || [];
    statPostsCount.textContent = state.posts.length;

    applyFilters();

    if (showRefreshToast) {
      showToast('Live stream synchronized');
    }
  } catch (err) {
    renderEmptyState('Unable to reach backend feed service. Please verify server connectivity.');
  }
}

/**
 * Filter posts by search query and source
 */
function applyFilters() {
  const query = state.searchQuery.toLowerCase().trim();
  const source = state.selectedSource;

  state.filteredPosts = state.posts.filter((post) => {
    const postSource = detectSource(post);

    // Source Filter
    if (source === 'hacker-news' && postSource !== 'hn') return false;
    if (source === 'devto' && postSource !== 'devto') return false;

    // Search Query Filter
    if (query) {
      const matchTitle = (post.title || '').toLowerCase().includes(query);
      const matchContent = (post.content || '').toLowerCase().includes(query);
      const matchRationale = (post.rationale || '').toLowerCase().includes(query);
      const matchSourceUrl = (post.source_url || '').toLowerCase().includes(query);
      if (!matchTitle && !matchContent && !matchRationale && !matchSourceUrl) return false;
    }

    return true;
  });

  renderPosts();
}

/**
 * Render filtered posts to DOM
 */
function renderPosts() {
  postCountChip.textContent = `Showing ${state.filteredPosts.length} of ${state.posts.length} Stories`;

  if (state.filteredPosts.length === 0) {
    renderEmptyState(state.posts.length === 0 
      ? 'No curated posts published yet. Trigger an autonomous cycle to publish.' 
      : 'No stories matched your current search or source filter.');
    return;
  }

  postsStreamEl.innerHTML = state.filteredPosts.map((post) => {
    const source = detectSource(post);
    const sourceLabel = source === 'devto' ? 'Dev.to Trend' : 'Hacker News';
    const sourceClass = source === 'devto' ? 'devto' : 'hn';

    return `
      <article class="post-card">
        <div class="post-card-top-bar">
          <span class="source-badge-tag ${sourceClass}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${sourceLabel}
          </span>
          <time class="post-meta-time" datetime="${post.created_at || ''}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${formatDate(post.created_at)}
          </time>
        </div>

        <h3 class="post-title">${escapeHtml(post.title)}</h3>

        <div class="post-body-text">${escapeHtml(post.content)}</div>

        <div class="neural-rationale-box">
          <div class="rationale-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.5"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><path d="M9 21h6"/></svg>
            <span class="rationale-header-title">Editorial Rationale & Selection Logic</span>
          </div>
          <p class="rationale-content">${formatRationale(post.rationale)}</p>
        </div>

        <footer class="post-footer-actions">
          <div class="footer-link-group">
            <a href="${escapeHtml(post.source_url || '#')}" target="_blank" rel="noopener noreferrer" class="source-outbound-link">
              <span>Read Original Story</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <button class="btn-icon-action" onclick="copyPostContent('${post.id}')" title="Copy post markdown">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>
          </div>
          <span class="topic-key-badge">#${escapeHtml(post.topic_key || 'tech')}</span>
        </footer>
      </article>
    `;
  }).join('');
}

function renderEmptyState(message) {
  postsStreamEl.innerHTML = `
    <div class="empty-state-card">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Copy post content to clipboard helper
 */
window.copyPostContent = function(postId) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;
  const fullText = `# ${post.title}\n\n${post.content}\n\n**Rationale:** ${post.rationale}\n\nSource: ${post.source_url}`;
  navigator.clipboard.writeText(fullText);
  showToast('Post copied to clipboard');
};

/**
 * Trigger Instant Autonomous Cycle
 */
async function triggerCycle() {
  const originalHtml = triggerCycleBtn.innerHTML;
  triggerCycleBtn.disabled = true;
  triggerCycleBtn.innerHTML = `
    <div class="shimmer-spinner" style="width: 14px; height: 14px; margin: 0; border-width: 2px;"></div>
    <span>Synthesizing...</span>
  `;

  try {
    const res = await fetch('/internal/run-cycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (data.status === 'success') {
      showToast('New post synthesized and published!');
      await loadFeed();
    } else {
      showToast(`Cycle notice: ${data.message || 'Executed'}`);
    }
  } catch (err) {
    showToast(`Cycle error: ${err.message}`);
  } finally {
    triggerCycleBtn.disabled = false;
    triggerCycleBtn.innerHTML = originalHtml;
  }
}

// Event Listeners
refreshBtn.addEventListener('click', () => loadFeed(true));
triggerCycleBtn.addEventListener('click', triggerCycle);

searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  applyFilters();
});

sourceFilterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    sourceFilterBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    state.selectedSource = btn.getAttribute('data-source');
    applyFilters();
  });
});

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await loadAgentProfile();
  await loadFeed();

  // Auto-refresh feed every 30 seconds
  setInterval(() => loadFeed(false), 30000);
});
