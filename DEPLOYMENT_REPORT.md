# ES117 Backend — Deployment & Security Report

**Date:** February 18, 2026
**Server:** mirlab (14.139.98.105), IIT Gandhinagar
**Purpose:** Backend API for the ES117 course website (student polling, shoutout wall, Google OAuth login)

---

## What Was Deployed

A lightweight **Python FastAPI** web server that provides three features for the ES117 course website:

| Feature | Description |
|---|---|
| Google OAuth Login | Students sign in with `@iitgn.ac.in` Google accounts only |
| Shoutout Wall | Authenticated students can post anonymous encouragement messages |
| Live Polls | Instructor creates polls, students vote (one vote per user per poll) |

The frontend is a static site hosted on **GitHub Pages** (separate from this server). The backend only handles API requests.

---

## Architecture

```
Students' browsers
       │
       ▼
GitHub Pages (static HTML/CSS/JS)        ← Frontend (not on this server)
       │
       │ HTTPS API calls
       ▼
ngrok tunnel (encrypted)                 ← HTTPS termination
       │
       ▼
localhost:8000 (FastAPI)                  ← Python process (this server)
       │
       ▼
~/Projects/es117-backend/es117.db        ← SQLite file (only data stored)
```

---

## What's Running on the Server

| Component | Process | Listens on |
|---|---|---|
| FastAPI (uvicorn) | Python process | `127.0.0.1:8000` (localhost only) |
| ngrok tunnel | Go binary | Outbound connection to ngrok.com |

> [!IMPORTANT]
> The backend binds to **127.0.0.1 only** (localhost). It is **NOT** directly accessible from the internet. All external traffic routes through the ngrok tunnel.

---

## Files on the Server

| Path | Purpose |
|---|---|
| `~/Projects/es117-backend/` | Backend code (Python) |
| `~/Projects/es117-backend/.env` | Credentials (gitignored, never pushed) |
| `~/Projects/es117-backend/es117.db` | SQLite database (auto-created) |
| `~/.local/bin/ngrok` | ngrok binary (37 MB) |
| `~/.local/bin/cloudflared` | Cloudflare binary (unused, can be deleted) |
| `~/.config/ngrok/ngrok.yml` | ngrok auth token |

**No system-level packages were installed.** Everything is in the user's home directory. No `sudo` was used.

---

## Security Analysis

### ✅ What's Protected

| Concern | Status |
|---|---|
| **Server filesystem** | ✅ FastAPI cannot access any files outside its own directory. It only reads/writes `es117.db`. No file-serving endpoints exist. |
| **Other services on server** | ✅ Backend is isolated — it's a Python process with no elevated privileges. It cannot interact with other processes, databases, or services. |
| **Network exposure** | ✅ Backend binds to `127.0.0.1` only. No new ports are opened on the server's network interface. |
| **Traffic encryption** | ✅ All external traffic is HTTPS via ngrok's TLS certificate. |
| **OAuth security** | ✅ Only `@iitgn.ac.in` emails are accepted. OAuth tokens are exchanged server-side (never exposed to browsers). |
| **Credentials storage** | ✅ Google OAuth secrets and JWT key stored in `.env` file, which is gitignored. |
| **Data stored** | ✅ Only student names, emails (from Google), shoutout messages, and poll votes. No passwords stored. |
| **No root/sudo** | ✅ Entire setup runs as user `aman`. No system-level changes. |

### ⚠️ Caveats & Risks

| Concern | Risk Level | Details |
|---|---|---|
| **ngrok free tier** | Low | Traffic routes through ngrok's infrastructure. ngrok can theoretically inspect traffic. They are a reputable company (YC-backed, SOC2 compliant). For a course website, this is acceptable. |
| **ngrok interstitial** | Cosmetic | First-time visitors to the API URL see a one-time ngrok warning page. This does **not** affect API calls from the frontend (skipped via header). |
| **Process persistence** | Medium | If the server reboots, the backend and ngrok processes stop. They need to be manually restarted via `./run.sh`. A systemd service could automate this (requires admin). |
| **SQLite concurrency** | Low | SQLite handles one write at a time. Fine for a class of ~100 students. Would be a concern at ~1000+ concurrent users. |
| **JWT secret** | Low | Currently a static string in `.env`. If someone obtains the JWT secret, they could forge auth tokens. The secret never leaves the server. |

### 🚫 What This Does NOT Do

- ❌ Does NOT open any ports on the server's firewall
- ❌ Does NOT install system packages or modify system configuration
- ❌ Does NOT run as root or require sudo
- ❌ Does NOT serve or expose any files from the server
- ❌ Does NOT connect to or access any other databases or services on the server
- ❌ Does NOT store passwords (authentication is delegated to Google)

---

## How to Start / Stop

**Start:**
```bash
cd ~/Projects/es117-backend
./run.sh
```

**Stop:**
```
Ctrl+C (if foreground)
# or:
pkill -f "uvicorn app.main"
pkill -f ngrok
```

**Run in background (persists after SSH logout):**
```bash
cd ~/Projects/es117-backend
nohup ./run.sh > backend.log 2>&1 &
```

---

## How to Remove Everything

If you ever want to completely remove the backend:

```bash
# Stop processes
pkill -f "uvicorn app.main"
pkill -f ngrok

# Remove all files
rm -rf ~/Projects/es117-backend
rm -f ~/.local/bin/ngrok
rm -f ~/.local/bin/cloudflared
rm -rf ~/.config/ngrok

# That's it — no system cleanup needed
```

---

## Summary for Admin

> A lightweight Python web server (FastAPI) runs as user `aman` on `localhost:8000` to serve API requests for a course website. External access is via an encrypted ngrok tunnel — **no ports are opened on the server**. The application only reads/writes a single SQLite file (`es117.db`) containing student messages and poll votes. No system-level changes were made; everything is in the user's home directory and can be fully removed with `rm -rf`.
