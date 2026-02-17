/* ES117 World of Engineering — Core Application Logic */

const PHASE_NAMES = ['Ideation', 'Conceptualization', 'Building & Iteration', 'Showcase'];
const PHASE_ICONS = ['💡', '🔬', '🔧', '🎤'];
const DEMO_DAY = new Date('2026-04-15T10:00:00+05:30');

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
function renderTeamCard(team, index) {
    const num = String(index + 1).padStart(2, '0');
    const phase = PHASE_NAMES[team.currentPhase - 1] || 'Ideation';
    const initials = getInitials(team.captain);

    return `
    <article class="team-card animate-in" onclick="navigateToTeam('${team.id}')">
      <div class="team-card__accent"></div>
      <div class="team-card__body">
        <div class="team-card__header">
          <div class="team-card__number">${num}</div>
          <h3 class="team-card__title">${escapeHtml(team.name)}</h3>
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
        const secs = Math.floor((diff / 1000) % 60);
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
              <div class="countdown__sep">:</div>
              <div class="countdown__unit">
                <span class="countdown__number">${String(secs).padStart(2, '0')}</span>
                <span class="countdown__name">secs</span>
              </div>
            </div>
          </div>`;
    }
    update();
    setInterval(update, 1000);
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
// FEATURE: Shoutout Wall
// ============================================================
function renderShoutoutCard(shout, index) {
    const warmColors = ['#d4613b', '#c9a54e', '#5a8a72', '#7c5cbf', '#3575c4', '#c07070'];
    const color = warmColors[index % warmColors.length];
    return `
      <div class="shoutout-card animate-in" style="--accent: ${color}">
        <div class="shoutout-card__body">
          <p class="shoutout-card__text">${escapeHtml(shout.message)}</p>
        </div>
        <div class="shoutout-card__date">${shout.timestamp || ''}</div>
      </div>`;
}

async function initWallPage() {
    const gridEl = document.getElementById('shoutout-grid');
    if (!gridEl) return;
    const shoutouts = await loadShoutouts();
    // Shuffle for freshness on each load
    const shuffled = shoutouts.sort(() => Math.random() - 0.5);
    gridEl.innerHTML = shuffled.map((s, i) => renderShoutoutCard(s, i)).join('');
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
    if (gridEl) gridEl.innerHTML = teams.map((t, i) => renderTeamCard(t, i)).join('');

    const countEl = document.getElementById('team-count');
    if (countEl) countEl.textContent = teams.length;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
            btn.classList.add('filter-btn--active');
            gridEl.innerHTML = filterTeams(teams, btn.dataset.filter).map((t, i) => renderTeamCard(t, i)).join('');
        });
    });

    // Engagement features
    renderRandomQuote();
    renderCountdown();
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
}

// --- Global Init (runs on all pages) ---
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initEasterEggs();
});
