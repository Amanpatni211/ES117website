# ES117 — World of Engineering

A team progress tracker for **ES117: World of Engineering** at IIT Gandhinagar.
~350 students · 13 teams · 4 project phases

---

## 🚀 Quick Start

```bash
# View locally
python3 -m http.server 8000
# → http://localhost:8000
```

---

## 📋 Weekly TA Workflow (~5 min/week)

### Step 1 — Collect responses
Share the Google Form with team captains at the start of each week. They submit progress, photos, and blockers.

### Step 2 — Download CSV
Go to **Google Forms → Responses → three dots → Download responses (.csv)**.

### Step 3 — Convert to JSON
```bash
# First time (initial team data from Ideation form):
python3 scripts/csv_to_json.py --csv responses.csv --type ideation

# Weekly updates:
python3 scripts/csv_to_json.py --csv weekly.csv --type weekly --week 3
```

### Step 4 — Add photos (optional)
Drop team photos into `assets/gallery/` (name them `teamNN_weekNN.jpg`).

### Step 5 — Push
```bash
git add .
git commit -m "Week N update"
git push
```
GitHub Pages auto-deploys — site updates in ~1 min.

---

## 🤖 Agent Workflow

> **For AI agents** (Gemini / Antigravity / similar) helping the TA:

1. **Read** `data/teams.json` to understand current team data.
2. **Receive** a CSV file from the TA (either via file path or Google Drive link).
3. **Run** the conversion script:
   ```bash
   python3 scripts/csv_to_json.py --csv /path/to/file.csv --type ideation
   # OR for weekly updates:
   python3 scripts/csv_to_json.py --csv /path/to/file.csv --type weekly --week N
   ```
4. **Verify** the JSON output in `data/teams.json` or `data/updates/weekNN.json`.
5. **Commit and push**:
   ```bash
   cd /home/aman/Projects/ES117website
   git add data/
   git commit -m "Update: Week N data"
   git push origin main
   ```
6. **If photos** are provided, download them to `assets/gallery/` before pushing.

### Data Files
| File | Purpose |
|------|---------|
| `data/teams.json` | Master team list (name, captain, description, phase, etc.) |
| `data/updates/weekNN.json` | Weekly update entries per team |
| `assets/gallery/` | Team photos and prototype images |

### JSON Schema — teams.json
```json
{
  "id": "team01",
  "name": "Project Name",
  "captain": "Captain Name",
  "type": "hardware",
  "currentPhase": 1,
  "memberCount": 25,
  "description": "...",
  "ideaLocked": true
}
```

---

## 📁 Project Structure

```
├── index.html              Landing page
├── team.html               Team detail (dynamic via ?id=teamNN)
├── gallery.html            Photo gallery
├── css/style.css           Design system
├── js/app.js               App logic (rendering, filters, routing)
├── data/
│   ├── teams.json          Team roster
│   └── updates/            Weekly JSON files
├── assets/gallery/         Team photos
└── scripts/
    └── csv_to_json.py      CSV → JSON converter
```

---

## 🌐 Deployment

**GitHub Pages** (free):
1. Push to `main` branch
2. Settings → Pages → Source: Deploy from `main`
3. Live at: `https://<username>.github.io/ES117website/`
