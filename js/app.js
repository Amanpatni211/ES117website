/* ES117 World of Engineering — Core Application Logic */

const PHASE_NAMES = ['Ideation', 'Conceptualization', 'Building & Iteration', 'Showcase'];
const PHASE_ICONS = ['💡', '🔬', '🔧', '🎤'];

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

// --- Init Pages ---
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
