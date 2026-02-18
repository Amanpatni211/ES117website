/* ES117 World of Engineering — Core Application Logic */

const PHASE_NAMES = ['Ideation', 'Conceptualization', 'Building & Iteration', 'Showcase'];
const PHASE_ICONS = ['💡', '🔬', '🔧', '🎤'];
const DEMO_DAY = new Date('2026-04-15T10:00:00+05:30');

// --- API Configuration ---
// Static ngrok domain for backend. Override via localStorage if needed.
const API_BASE = localStorage.getItem('es117-api') || 'https://superindifferent-renae-unjoyfully.ngrok-free.dev';

// --- Auth Token Management ---
function getToken() { return localStorage.getItem('es117-token'); }
function setToken(t) { localStorage.setItem('es117-token', t); }
function clearToken() { localStorage.removeItem('es117-token'); }

// Check URL for token from OAuth callback
(function captureToken() {
  const params = new URLSearchParams(window.location.search);
  const t = params.get('token');
  if (t) {
    setToken(t);
    // Clean URL
    params.delete('token');
    const clean = params.toString();
    const newUrl = window.location.pathname + (clean ? '?' + clean : '');
    window.history.replaceState({}, '', newUrl);
  }
})();

// --- API Fetch Helper (with fallback) ---
async function apiFetch(endpoint, options = {}) {
  if (!API_BASE) return null;
  try {
    const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1', ...options.headers };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const controller = new AbortController();
    const ms = options._timeout || 2000;
    const timeout = setTimeout(() => controller.abort(), ms);
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options, headers, signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      if (res.status === 401) return '__401__';
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

// --- Data Loading ---
async function loadTeams() {
  try {
    const res = await fetch('data/teams.json');
    if (!res.ok) throw new Error('Failed to load team data');
    return await res.json();
  } catch (err) {
    console.error('Error loading teams:', err);
    return [];
  }
}

async function loadUpdates(week) {
  try {
    const res = await fetch(`data/updates/week${String(week).padStart(2, '0')}.json`);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function loadAllUpdates() {
  const updates = [];
  for (let w = 1; w <= 20; w++) {
    const data = await loadUpdates(w);
    if (data.length === 0) break;
    updates.push(...data);
  }
  return updates;
}

async function loadQuotes() {
  try {
    const res = await fetch('data/quotes.json');
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function loadShoutouts() {
  // Try API first, fall back to static JSON
  const apiData = await apiFetch('/api/shoutouts');
  if (apiData) return apiData;
  try {
    const res = await fetch('data/shoutouts.json');
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

// --- Utility ---
function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// --- Rendering: Team Card ---
function renderTeamCard(team, index, upvoteCounts = {}) {
  const num = String(index + 1).padStart(2, '0');
  const phase = PHASE_NAMES[team.currentPhase - 1] || 'Ideation';
  const initials = getInitials(team.captain);
  const fireCount = upvoteCounts[team.id]?.count || 0;
  const fireHtml = fireCount > 0 ? `<span class="team-card__fire">🔥 ${fireCount}</span>` : '';

  return `
    <article class="team-card animate-in" onclick="navigateToTeam('${team.id}')">
      <div class="team-card__accent"></div>
      <div class="team-card__body">
        <div class="team-card__header">
          <div class="team-card__number">${num}</div>
          <h3 class="team-card__title">${escapeHtml(team.name)} ${fireHtml}</h3>
        </div>
        <p class="team-card__description">${escapeHtml(team.description)}</p>
      </div>
      <div class="team-card__footer">
        <div class="team-card__captain">
          <div class="team-card__captain-avatar">${initials}</div>
          <span>${escapeHtml(team.captain)}</span>
        </div>
        <div class="team-card__badges">
          <span class="badge badge--${team.type}">${team.type}</span>
          <span class="badge badge--phase-${team.currentPhase}">${phase}</span>
        </div>
      </div>
    </article>
  `;
}

// --- Rendering: Stats ---
function renderStats(teams) {
  const hw = teams.filter(t => t.type === 'hardware').length;
  const sw = teams.filter(t => t.type === 'software').length;
  const students = teams.reduce((s, t) => s + (t.memberCount || 0), 0);

  return `
    <div class="stat animate-in">
      <div class="stat__value">${teams.length}</div>
      <div class="stat__label">Active Teams</div>
    </div>
    <div class="stat animate-in">
      <div class="stat__value">~${students}</div>
      <div class="stat__label">Students Involved</div>
    </div>
    <div class="stat animate-in">
      <div class="stat__value">${hw}</div>
      <div class="stat__label">Hardware Projects</div>
    </div>
    <div class="stat animate-in">
      <div class="stat__value">${sw || '0'}</div>
      <div class="stat__label">Software Projects</div>
    </div>
  `;
}

// --- Rendering: Phase Timeline ---
function renderPhaseTimeline(current = 1) {
  return PHASE_NAMES.map((name, i) => {
    const n = i + 1;
    let cls = 'phase';
    if (n < current) cls += ' phase--completed';
    if (n === current) cls += ' phase--active';

    return `
      <div class="${cls}">
        <div class="phase__circle">${PHASE_ICONS[i]}</div>
        <div class="phase__name">Phase ${n}</div>
        <div class="phase__desc">${name}</div>
      </div>
    `;
  }).join('');
}

// --- Rendering: Team Detail ---
function renderTeamDetail(team, updates = []) {
  const teamUpdates = updates.filter(u => u.teamId === team.id).sort((a, b) => b.week - a.week);
  const phase = PHASE_NAMES[team.currentPhase - 1] || 'Ideation';
  const skipNotes = ['no', 'nothing', 'n/a', 'thank you', 'thank you '];
  const showNote = team.comments && !skipNotes.includes(team.comments.trim().toLowerCase());

  let timelineHtml;
  if (teamUpdates.length > 0) {
    timelineHtml = `
      <h3 style="font-family:'Playfair Display',serif;margin-top:40px;margin-bottom:20px;">Weekly Updates</h3>
      <div class="timeline">
        ${teamUpdates.map(u => `
          <div class="timeline__item">
            <div class="timeline__date">Week ${u.week} — ${u.date || ''}</div>
            <div class="timeline__content">
              <h4>${escapeHtml(u.summary || 'Update')}</h4>
              ${u.highlights ? `<ul style="color:var(--text-secondary);font-size:0.9rem;margin-top:6px;padding-left:18px;">
                ${u.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
              </ul>` : ''}
              ${u.blockers ? `<p style="margin-top:6px;color:var(--dusty-rose);font-size:0.85rem;">⚠ ${escapeHtml(u.blockers)}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>`;
  } else {
    timelineHtml = `
      <div class="empty-state" style="margin-top:40px;">
        <div class="empty-state__icon">📝</div>
        <p>No weekly updates yet. Check back after the first update!</p>
      </div>`;
  }

  return `
    <div class="container team-detail">
      <a href="index.html" class="team-detail__back">← All Teams</a>
      
      <div class="team-detail__hero animate-in">
        <div style="display:flex;gap:6px;margin-bottom:14px;">
          <span class="badge badge--${team.type}">${team.type}</span>
          <span class="badge badge--phase-${team.currentPhase}">Phase ${team.currentPhase}: ${phase}</span>
        </div>
        <h1 class="team-detail__name">${escapeHtml(team.name)}</h1>
        <div class="team-detail__meta">
          <div class="team-detail__meta-item">👤 ${escapeHtml(team.captain)}</div>
          <div class="team-detail__meta-item">👥 ~${team.memberCount} members</div>
          <div class="team-detail__meta-item">${team.ideaLocked ? '🔒 Locked' : '🔓 Open'}</div>
        </div>
        <div class="team-detail__description">${escapeHtml(team.description)}</div>
        ${showNote ? `
          <div class="captain-note">
            <div class="captain-note__label">💬 Captain's Note</div>
            <p class="captain-note__text">${escapeHtml(team.comments)}</p>
          </div>` : ''}
      </div>

      <div class="phase-section animate-in">
        <h3 style="font-family:'Playfair Display',serif;margin-bottom:20px;">Project Phase</h3>
        <div class="phases">${renderPhaseTimeline(team.currentPhase)}</div>
      </div>

      ${timelineHtml}

      <div id="upvote-container" data-team="${team.id}"></div>
      <div id="photo-upload-container" data-team="${team.id}"></div>
      <div id="photo-grid-container" data-team="${team.id}"></div>
      <div id="comments-container" data-team="${team.id}"></div>
    </div>`;
}

// --- Navigation ---
function navigateToTeam(id) { window.location.href = `team.html?id=${id}`; }
function toggleMobileNav() { document.querySelector('.nav__links').classList.toggle('nav__links--open'); }

// --- Filters ---
function filterTeams(teams, f) {
  if (f === 'all') return teams;
  if (f === 'hardware' || f === 'software') return teams.filter(t => t.type === f);
  return teams;
}

// ============================================================
// FEATURE: Random Quote
// ============================================================
async function renderRandomQuote() {
  const quoteEl = document.getElementById('daily-quote');
  if (!quoteEl) return;
  const quotes = await loadQuotes();
  if (quotes.length === 0) return;
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  quoteEl.innerHTML = `
      <div class="quote animate-in">
        <div class="quote__icon">💬</div>
        <blockquote class="quote__text">"${escapeHtml(q.text)}"</blockquote>
        <cite class="quote__author">— ${escapeHtml(q.author)}</cite>
      </div>`;
}

// ============================================================
// FEATURE: Demo Day Countdown
// ============================================================
function renderCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  function update() {
    const now = new Date();
    const diff = DEMO_DAY - now;
    if (diff <= 0) {
      el.innerHTML = `
              <div class="countdown animate-in">
                <div class="countdown__label">🎤 Demo Day is HERE!</div>
              </div>`;
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    el.innerHTML = `
          <div class="countdown animate-in">
            <div class="countdown__label">⏳ Countdown to Demo Day</div>
            <div class="countdown__grid">
              <div class="countdown__unit">
                <span class="countdown__number">${days}</span>
                <span class="countdown__name">days</span>
              </div>
              <div class="countdown__sep">:</div>
              <div class="countdown__unit">
                <span class="countdown__number">${String(hours).padStart(2, '0')}</span>
                <span class="countdown__name">hours</span>
              </div>
              <div class="countdown__sep">:</div>
              <div class="countdown__unit">
                <span class="countdown__number">${String(mins).padStart(2, '0')}</span>
                <span class="countdown__name">mins</span>
              </div>
            </div>
          </div>`;
  }
  update();
  setInterval(update, 60000);
}

// ============================================================
// FEATURE: Dark Mode Toggle
// ============================================================
function initDarkMode() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const saved = localStorage.getItem('es117-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.textContent = '☀️';
  }

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('es117-theme', 'light');
      toggle.textContent = '🌙';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('es117-theme', 'dark');
      toggle.textContent = '☀️';
    }
  });
}

// ============================================================
// FEATURE: Easter Eggs
// ============================================================
function initEasterEggs() {
  // --- Konami Code ---
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIdx = 0;
  document.addEventListener('keydown', e => {
    if (e.key === konami[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === konami.length) {
        konamiIdx = 0;
        launchConfetti();
      }
    } else {
      konamiIdx = 0;
    }
  });

  // --- Gear Logo Click (5x) ---
  let gearClicks = 0;
  let gearTimeout;
  const gearEl = document.querySelector('.nav__brand-icon');
  if (gearEl) {
    gearEl.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      gearClicks++;
      clearTimeout(gearTimeout);
      gearTimeout = setTimeout(() => gearClicks = 0, 2000);
      if (gearClicks >= 5) {
        gearClicks = 0;
        gearEl.classList.add('gear-spin');
        showToast('⚙️ You found an easter egg! 🎉');
        setTimeout(() => gearEl.classList.remove('gear-spin'), 3000);
      }
    });
  }

  // --- Type "es117" anywhere ---
  let typedBuffer = '';
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    typedBuffer += e.key.toLowerCase();
    if (typedBuffer.length > 10) typedBuffer = typedBuffer.slice(-10);
    if (typedBuffer.includes('es117')) {
      typedBuffer = '';
      discoMode();
    }
  });
}

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#d4613b', '#c9a54e', '#5a8a72', '#7c5cbf', '#3575c4', '#c07070'];
  const particles = [];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: Math.random() * 3 + 2,
      vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 10,
    });
  }
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.vy;
      p.x += p.vx;
      p.rot += p.rv;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 200) requestAnimationFrame(draw);
    else canvas.remove();
  }
  draw();
  showToast('🎊 Konami Code activated! 🎊');
}

function discoMode() {
  document.body.classList.add('disco-mode');
  showToast('🕺 Disco mode! 💃');
  setTimeout(() => document.body.classList.remove('disco-mode'), 3000);
}

function showToast(msg) {
  const existing = document.getElementById('es117-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'es117-toast';
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================================
// FEATURE: Login Prompt Popup
// ============================================================
function showLoginPrompt(action = 'participate') {
  const existing = document.getElementById('login-prompt');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'login-prompt';
  overlay.className = 'login-prompt';
  overlay.innerHTML = `
    <div class="login-prompt__card">
      <div class="login-prompt__icon">🔐</div>
      <h3 class="login-prompt__title">Sign in to ${action}</h3>
      <p class="login-prompt__desc">Use your <strong>@iitgn.ac.in</strong> Google account</p>
      <div class="login-prompt__actions">
        <a href="${API_BASE}/api/auth/login?redirect=${encodeURIComponent(window.location.href)}"
           class="login-prompt__btn login-prompt__btn--primary">Sign in with Google</a>
        <button class="login-prompt__btn login-prompt__btn--cancel" onclick="document.getElementById('login-prompt').remove()">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
}

// ============================================================
// FEATURE: Fire Upvotes
// ============================================================
async function renderUpvoteButton(teamId) {
  const container = document.getElementById('upvote-container');
  if (!container) return;

  const data = await apiFetch(`/api/teams/${teamId}/upvotes`);
  const count = data?.count || 0;
  const voted = data?.user_has_upvoted || false;
  const cls = voted ? 'upvote-btn upvote-btn--active' : 'upvote-btn';

  container.innerHTML = `
    <div class="upvote-section animate-in">
      <button class="${cls}" id="upvote-btn" title="Show some love!">
        <span class="upvote-btn__icon">🔥</span>
        <span class="upvote-btn__count">${count}</span>
        <span class="upvote-btn__label">${voted ? 'You fired this!' : 'Fire this team!'}</span>
      </button>
    </div>`;

  document.getElementById('upvote-btn')?.addEventListener('click', async () => {
    if (!getToken()) {
      showLoginPrompt('upvote this team');
      return;
    }
    const result = await apiFetch(`/api/teams/${teamId}/upvotes`, { method: 'POST' });
    if (result) {
      renderUpvoteButton(teamId); // Re-render with new state
      if (result.user_has_upvoted) {
        showToast('🔥 Fired!');
      }
    }
  });
}

// ============================================================
// FEATURE: Team Comments
// ============================================================
function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr + 'Z');
  const secs = Math.floor((now - d) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

async function renderComments(teamId) {
  const container = document.getElementById('comments-container');
  if (!container) return;

  const comments = await apiFetch(`/api/teams/${teamId}/comments`) || [];
  const token = getToken();

  const formHtml = token ? `
    <form id="comment-form" class="comment-form">
      <textarea id="comment-input" class="comment-form__input" placeholder="Leave a comment..." maxlength="1000" rows="2"></textarea>
      <button type="submit" class="comment-form__btn">Post</button>
    </form>` : `
    <button class="comment-login-btn" id="comment-login-btn">Sign in to comment 💬</button>`;

  const commentsHtml = comments.length > 0
    ? comments.map(c => `
        <div class="comment-card animate-in">
          <div class="comment-card__header">
            <span class="comment-card__author">${escapeHtml(c.author_name.split(' ')[0])}</span>
            <span class="comment-card__time">${timeAgo(c.created_at)}</span>
          </div>
          <p class="comment-card__text">${escapeHtml(c.text)}</p>
        </div>`).join('')
    : '<p class="comments-empty">No comments yet. Be the first!</p>';

  container.innerHTML = `
    <div class="comments-section animate-in">
      <h3 class="comments-section__title">💬 Comments <span class="comments-section__count">${comments.length}</span></h3>
      ${formHtml}
      <div class="comments-list" id="comments-list">${commentsHtml}</div>
    </div>`;

  // Form submit
  const form = document.getElementById('comment-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = document.getElementById('comment-input');
      const text = input.value.trim();
      if (!text) return;
      const result = await apiFetch(`/api/teams/${teamId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      if (result) {
        showToast('Comment posted! 💬');
        renderComments(teamId); // Refresh
      } else {
        showToast('Failed to post — try again');
      }
    });
  }

  // Login button
  document.getElementById('comment-login-btn')?.addEventListener('click', () => {
    showLoginPrompt('leave a comment');
  });
}

// ============================================================
// FEATURE: Photo Upload + Grid
// ============================================================
async function renderPhotoUpload(teamId) {
  const container = document.getElementById('photo-upload-container');
  if (!container) return;

  const token = getToken();
  if (!token) {
    container.innerHTML = `
      <div class="photo-upload-section animate-in">
        <button class="comment-login-btn" onclick="showLoginPrompt('upload photos')">Sign in to upload photos 📸</button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="photo-upload-section animate-in">
      <h3 class="photo-upload__title">📸 Upload Team Photo</h3>
      <form id="photo-upload-form" class="photo-upload-form">
        <div class="photo-dropzone" id="photo-dropzone">
          <span class="photo-dropzone__icon">📷</span>
          <span class="photo-dropzone__text">Drag & drop or click to select</span>
          <span class="photo-dropzone__hint">JPEG, PNG, WebP — max 1 MB</span>
          <input type="file" id="photo-file-input" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
        </div>
        <input type="text" id="photo-caption" class="comment-form__input" placeholder="Caption (optional)" maxlength="200" style="margin-top:10px;">
        <button type="submit" class="comment-form__btn" style="margin-top:10px;" id="photo-submit-btn" disabled>Upload</button>
      </form>
    </div>`;

  const dropzone = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('photo-file-input');
  const submitBtn = document.getElementById('photo-submit-btn');
  let selectedFile = null;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('photo-dropzone--active'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('photo-dropzone--active'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('photo-dropzone--active');
    if (e.dataTransfer.files.length) { selectedFile = e.dataTransfer.files[0]; showSelectedFile(); }
  });
  fileInput.addEventListener('change', () => { if (fileInput.files.length) { selectedFile = fileInput.files[0]; showSelectedFile(); } });

  function showSelectedFile() {
    if (!selectedFile) return;
    if (selectedFile.size > 1024 * 1024) { showToast('File too large — max 1 MB'); selectedFile = null; return; }
    dropzone.querySelector('.photo-dropzone__text').textContent = selectedFile.name;
    dropzone.querySelector('.photo-dropzone__icon').textContent = '✅';
    submitBtn.disabled = false;
  }

  document.getElementById('photo-upload-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!selectedFile) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('caption', document.getElementById('photo-caption').value);

    try {
      const token = getToken();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s for upload
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        showToast('Photo uploaded! 📸');
        renderPhotoUpload(teamId);
        renderTeamPhotos(teamId);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Upload failed');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload';
      }
    } catch {
      showToast('Upload failed — check connection');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload';
    }
  });
}

async function renderTeamPhotos(teamId) {
  const container = document.getElementById('photo-grid-container');
  if (!container) return;

  const photos = await apiFetch(`/api/teams/${teamId}/photos`) || [];
  if (photos.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="team-photos-section animate-in">
      <h3 class="team-photos__title">📷 Team Photos <span class="comments-section__count">${photos.length}</span></h3>
      <div class="photo-masonry">
        ${photos.map(p => `
          <div class="photo-card" onclick="showLightbox('${API_BASE}${p.full_url}', '${escapeHtml(p.caption || '')}')">
            <img src="${API_BASE}${p.thumb_url}" alt="${escapeHtml(p.caption || 'Team photo')}" loading="lazy" class="photo-card__img">
            ${p.caption ? `<div class="photo-card__caption">${escapeHtml(p.caption)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

function showLightbox(src, caption) {
  const existing = document.getElementById('lightbox');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lightbox';
  overlay.className = 'lightbox';
  overlay.innerHTML = `
    <div class="lightbox__content">
      <img src="${src}" alt="${caption}" class="lightbox__img">
      ${caption ? `<p class="lightbox__caption">${caption}</p>` : ''}
      <button class="lightbox__close" onclick="document.getElementById('lightbox').remove()">✕</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
}

// ============================================================
// FEATURE: Gallery Page
// ============================================================
async function initGalleryPage() {
  const contentEl = document.getElementById('gallery-content');
  if (!contentEl) return;

  const photos = await apiFetch('/api/photos/all') || [];
  if (photos.length === 0) {
    contentEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📷</div>
        <h2 style="margin-bottom:8px;font-family:'Playfair Display',serif;">No photos yet</h2>
        <p style="max-width:420px;margin:0 auto;color:var(--text-secondary);">Team photos will appear here as teams upload their weekly updates.</p>
      </div>`;
    return;
  }

  // Get unique team IDs for filter
  const teamIds = [...new Set(photos.map(p => p.team_id))].sort();

  contentEl.innerHTML = `
    <div class="gallery-filters">
      <button class="filter-btn filter-btn--active" data-filter="all">All</button>
      ${teamIds.map(id => `<button class="filter-btn" data-filter="${id}">${id}</button>`).join('')}
    </div>
    <div class="photo-masonry photo-masonry--gallery" id="gallery-grid">
      ${renderGalleryCards(photos)}
    </div>`;

  // Filter buttons
  contentEl.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      contentEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      const filter = btn.dataset.filter;
      const filtered = filter === 'all' ? photos : photos.filter(p => p.team_id === filter);
      document.getElementById('gallery-grid').innerHTML = renderGalleryCards(filtered);
    });
  });
}

function renderGalleryCards(photos) {
  return photos.map(p => `
    <div class="photo-card photo-card--gallery animate-in" onclick="showLightbox('${API_BASE}${p.full_url}', '${escapeHtml(p.caption || '')}')">
      <img src="${API_BASE}${p.thumb_url}" alt="${escapeHtml(p.caption || 'Team photo')}" loading="lazy" class="photo-card__img">
      <div class="photo-card__overlay">
        <span class="photo-card__team">${p.team_id}</span>
        ${p.caption ? `<span class="photo-card__caption">${escapeHtml(p.caption)}</span>` : ''}
      </div>
    </div>`).join('');
}


// FEATURE: Shoutout Wall
// ============================================================
function renderShoutoutCard(shout, index) {
  const warmColors = ['#d4613b', '#c9a54e', '#5a8a72', '#7c5cbf', '#3575c4', '#c07070'];
  const color = warmColors[index % warmColors.length];
  const date = shout.created_at || shout.timestamp || '';
  const author = shout.author_name ? `— ${escapeHtml(shout.author_name)}` : '';
  return `
      <div class="shoutout-card animate-in" style="--accent: ${color}">
        <div class="shoutout-card__body">
          <p class="shoutout-card__text">${escapeHtml(shout.message)}</p>
        </div>
        <div class="shoutout-card__date">${date} ${author}</div>
      </div>`;
}

function renderShoutoutForm() {
  const token = getToken();
  if (token && API_BASE) {
    return `
      <form id="shoutout-form" class="shoutout-form">
        <input type="text" id="shoutout-input" class="shoutout-form__input"
               placeholder="Write an encouraging shoutout..." maxlength="500" required />
        <button type="submit" class="shoutout-form__btn">Post 💬</button>
      </form>`;
  }
  if (API_BASE) {
    return `<button class="comment-login-btn" onclick="showLoginPrompt('post a shoutout')">Sign in to post a shoutout 💬</button>`;
  }
  return '';
}

async function initWallPage() {
  const gridEl = document.getElementById('shoutout-grid');
  if (!gridEl) return;

  // Render form if logged in
  const formContainer = document.getElementById('shoutout-form-container');
  if (formContainer) formContainer.innerHTML = renderShoutoutForm();

  // Load shoutouts
  const shoutouts = await loadShoutouts();
  const shuffled = shoutouts.sort(() => Math.random() - 0.5);
  gridEl.innerHTML = shuffled.map((s, i) => renderShoutoutCard(s, i)).join('');

  // Handle form submission
  const form = document.getElementById('shoutout-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = document.getElementById('shoutout-input');
      const msg = input.value.trim();
      if (!msg) return;
      const result = await apiFetch('/api/shoutouts', {
        method: 'POST',
        body: JSON.stringify({ message: msg })
      });
      if (result) {
        input.value = '';
        showToast('Shoutout posted! 🎉');
        // Reload
        const fresh = await loadShoutouts();
        gridEl.innerHTML = fresh.map((s, i) => renderShoutoutCard(s, i)).join('');
      } else {
        showToast('Failed to post — try again');
      }
    });
  }
}

// ============================================================
// FEATURE: Polls
// ============================================================
async function renderPolls() {
  const container = document.getElementById('polls-container');
  if (!container || !API_BASE) return;

  const polls = await apiFetch('/api/polls');
  if (!polls || polls.length === 0) {
    container.style.display = 'none';
    return;
  }

  const token = getToken();
  container.innerHTML = polls.map(poll => {
    const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
    const optionsHtml = poll.options.map(opt => {
      const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
      const voted = poll.user_voted_option === opt.id;
      const cls = voted ? 'poll-option poll-option--voted' : 'poll-option';
      return `
              <button class="${cls}" data-poll="${poll.id}" data-option="${opt.id}"
                      ${!token ? 'disabled title="Login to vote"' : ''}>
                <span class="poll-option__text">${escapeHtml(opt.text)}</span>
                <span class="poll-option__bar" style="width:${pct}%"></span>
                <span class="poll-option__pct">${pct}%</span>
              </button>`;
    }).join('');
    return `
          <div class="poll-card animate-in">
            <h3 class="poll-card__question">${escapeHtml(poll.question)}</h3>
            <div class="poll-card__options">${optionsHtml}</div>
            <div class="poll-card__meta">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</div>
          </div>`;
  }).join('');

  // Vote click handlers
  container.querySelectorAll('.poll-option:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pollId = btn.dataset.poll;
      const optionId = btn.dataset.option;
      const result = await apiFetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ option_id: parseInt(optionId) })
      });
      if (result) {
        showToast('Vote recorded! ✅');
        renderPolls(); // Refresh
      }
    });
  });
}

// ============================================================
// FEATURE: Auth UI
// ============================================================
async function initAuthUI() {
  if (!API_BASE) return;
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  const token = getToken();
  if (token) {
    // Longer timeout for auth check — this is important for UX
    const user = await apiFetch('/api/auth/me', { _timeout: 5000 });
    if (user && user !== '__401__') {
      const li = document.createElement('li');
      li.innerHTML = `
              <span class="nav__user">
                <span class="nav__user-name">${escapeHtml(user.name.split(' ')[0])}</span>
                <button class="nav__logout-btn" id="logout-btn">Logout</button>
              </span>`;
      navLinks.appendChild(li);
      document.getElementById('logout-btn').addEventListener('click', () => {
        clearToken();
        window.location.reload();
      });
    } else if (user === '__401__') {
      clearToken(); // Only clear on actual 401, not timeout
    }
    // If null (timeout), keep token — don't log user out
  } else {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${API_BASE}/api/auth/login?redirect=${encodeURIComponent(window.location.href)}" class="nav__link nav__login-btn">Login 🔐</a>`;
    navLinks.appendChild(li);
  }
}

// ============================================================
// Init Pages
// ============================================================
async function initHomePage() {
  const teams = await loadTeams();

  const statsEl = document.getElementById('stats');
  if (statsEl) statsEl.innerHTML = renderStats(teams);

  const phaseEl = document.getElementById('phase-timeline');
  if (phaseEl) phaseEl.innerHTML = renderPhaseTimeline(1);

  const gridEl = document.getElementById('teams-grid');
  // Render immediately with no upvote counts (fast!)
  if (gridEl) gridEl.innerHTML = teams.map((t, i) => renderTeamCard(t, i, {})).join('');

  const countEl = document.getElementById('team-count');
  if (countEl) countEl.textContent = teams.length;

  // Engagement features (non-blocking)
  renderRandomQuote();
  renderCountdown();

  // Load upvote counts in background, then patch cards
  apiFetch('/api/upvotes/all').then(upvoteCounts => {
    if (!upvoteCounts || !gridEl) return;
    // Patch fire badges onto existing cards
    for (const [teamId, data] of Object.entries(upvoteCounts)) {
      if (data.count > 0) {
        const cards = gridEl.querySelectorAll('.team-card__title');
        cards.forEach(title => {
          const card = title.closest('.team-card');
          if (card && card.getAttribute('onclick')?.includes(teamId)) {
            if (!title.querySelector('.team-card__fire')) {
              title.insertAdjacentHTML('beforeend',
                `<span class="team-card__fire">🔥 ${data.count}</span>`);
            }
          }
        });
      }
    }
  });

  // Load polls in background
  renderPolls();

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      gridEl.innerHTML = filterTeams(teams, btn.dataset.filter).map((t, i) => renderTeamCard(t, i, {})).join('');
    });
  });
}

async function initTeamPage() {
  const id = getQueryParam('id');
  if (!id) { window.location.href = 'index.html'; return; }

  const teams = await loadTeams();
  const team = teams.find(t => t.id === id);
  const content = document.getElementById('team-content');

  if (!team) {
    content.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state__icon">🔍</div><h2>Team not found</h2><p><a href="index.html">← Back to all teams</a></p></div></div>`;
    return;
  }

  const updates = await loadAllUpdates();
  content.innerHTML = renderTeamDetail(team, updates);
  document.title = `${team.name} — ES117`;

  // Load interactive features
  renderUpvoteButton(team.id);
  renderPhotoUpload(team.id);
  renderTeamPhotos(team.id);
  renderComments(team.id);
}

// --- Global Init (runs on all pages) ---
document.addEventListener('DOMContentLoaded', async () => {
  // 🚨 EMERGENCY KILL SWITCH — check site-config.json first
  try {
    const cfg = await fetch('site-config.json?' + Date.now()).then(r => r.json());
    if (cfg.maintenance) {
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px;text-align:center;font-family:'Inter',sans-serif;background:#faf8f5;color:#333;">
          <div style="font-size:4rem;margin-bottom:16px;">🔧</div>
          <h1 style="font-family:'Playfair Display',serif;font-size:2rem;margin-bottom:12px;">Maintenance Mode</h1>
          <p style="max-width:420px;color:#666;line-height:1.6;">${cfg.message || 'Site is temporarily down for maintenance. Check back soon!'}</p>
          <p style="margin-top:24px;font-size:0.85rem;color:#999;">ES117 — IIT Gandhinagar</p>
        </div>`;
      return; // Stop all initialization
    }
  } catch { /* config not found = site is live */ }

  initDarkMode();
  initEasterEggs();
  initAuthUI();  // runs async in background, doesn't block page
});
