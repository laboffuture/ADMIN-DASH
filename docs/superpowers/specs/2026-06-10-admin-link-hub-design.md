# ADMIN-LINK — Central Admin Hub — Design Spec

**Date:** 2026-06-10
**Status:** Approved by user (embedded-portal approach, embed-mode amendment)

## 1. Purpose

ADMIN-LINK is a single admin portal, self-hosted on the team's server and reached
by IP (e.g. `http://SERVER-IP:5500/`). It shows every LOF project in one place,
mapped project-wise in a sidebar. Selecting a project displays that project's
**existing, already-built admin page live inside the hub** (iframe). Nothing is
rebuilt; the projects stay independently deployed and untouched except for one
small "embedded mode" tweak each.

Initial modules:

| Module id    | Display name | Project                                  | Admin page                  |
|--------------|--------------|------------------------------------------|-----------------------------|
| `code-runner`| Code Runner  | code-runner-production (Next.js web app) | `/admin` section            |
| `protoview`  | PROTOVIEW    | 3dviewer (Vite/React + Express)           | `/admin` (already rebranded PROTOVIEW) |

More projects are added later with one registry entry each (see §4).

## 2. Architecture

```
Browser ──► ADMIN-LINK hub (one Express process, PM2-managed)
              ├─ serves built React client (sidebar + iframe viewport)
              ├─ POST /api/login            single admin password gate
              ├─ GET  /api/projects        registry from projects.json
              └─ GET  /api/status          cached health of every module
                          │
                          └── server-side pinger ──► each module's healthUrl (30s interval, 5s timeout)

Browser iframe ──► module's adminUrl?embed=1 (direct, not proxied)
Module (inside iframe) ──► window.parent.postMessage(...) ──► hub listener (optional)
```

- **Repo layout** mirrors 3dviewer so the team already knows it:
  - `server/` — Node.js + Express. Auth, registry, status poller, serves `client/dist`.
  - `client/` — Vite + React. Login screen, sidebar with status dots, iframe viewport.
- **No database.** State = `projects.json` + in-memory status cache.
- **Stack rationale:** all-Node like every other LOF project; one PM2 process; no CORS
  anywhere because the browser only talks to the hub (iframes load modules directly,
  which is plain page navigation, not XHR).

## 3. Module contract (how any project connects)

The same four agreements for every current and future module:

1. **Registry entry on the hub** (§4). This is the entire hub-side connection.
2. **Framing allowed.** The module must not send `X-Frame-Options: DENY/SAMEORIGIN`
   or a `frame-ancestors` CSP that excludes the hub. Verified 2026-06-10: neither
   code-runner-production nor 3dviewer sends any such header today. If headers are
   added later, allowlist the hub origin.
3. **Embedded mode.** When loaded with `?embed=1` (or `window.self !== window.top`),
   the module hides its own global chrome (topbar/sidebar/branding) and renders only
   the dashboard content, so the hub doesn't show nav-inside-nav.
   - Status: not yet implemented in either project; one small layout-level change each
     (3dviewer `AdminLayout.jsx`, code-runner admin layout). Tracked as integration
     tasks, done in those repos.
4. **Health URL** (recommended): any GET endpoint. 2xx–4xx ⇒ online, 5xx ⇒ error,
   timeout/refused ⇒ down. code-runner API already has `/health`; 3dviewer root `/` works.

**Module → hub calls (optional):** modules may send
`window.parent.postMessage({ type, ...payload }, HUB_ORIGIN)`. The hub registers a
`message` listener from day one and validates `event.origin` against registry URLs.
v1 handles `{type:'notify', text}` (toast) and ignores unknown types. Modules never
need this to work — it exists so a module can push events to the hub later.

**Auth:** v1 has no SSO. The hub is gated by one admin password; each module's own
login still applies inside the frame. Phase-2 option (out of scope): hub-issued
short-lived signed token (`?hub_token=`) that modules verify with a shared secret —
chosen over parent-domain cookies because the deployment is IP-based (no shared domain).

## 4. Project registry — `projects.json`

```json
[
  {
    "id": "code-runner",
    "name": "Code Runner",
    "description": "Python compiler & missions for students",
    "adminUrl": "http://SERVER-IP:3000/admin",
    "healthUrl": "http://SERVER-IP:4000/health",
    "accent": "#22d3ee"
  },
  {
    "id": "protoview",
    "name": "PROTOVIEW",
    "description": "3D model review & voting",
    "adminUrl": "http://SERVER-IP:4173/admin",
    "healthUrl": "http://SERVER-IP:4000/",
    "accent": "#a78bfa"
  }
]
```

- URLs above are examples; real host/ports are filled in at deploy time (`projects.json`
  is environment config, not code).
- The server re-reads the file on each `/api/projects` request → **adding a module =
  edit file, refresh browser.** No rebuild, no restart.
- Invalid JSON ⇒ server logs the parse error and keeps serving the last good registry.

## 5. Hub UI

- **Login screen** — single password field (checked against `ADMIN_PASSWORD` env var);
  on success an httpOnly signed session cookie is set.
- **Main screen** — left sidebar: project list with status dot (● online, ● error,
  ○ down) + latency; footer "add a project = edit projects.json".
  Main area: toolbar (project name, ↻ reload frame, ↗ open in new tab) above a
  full-height iframe of `adminUrl?embed=1`.
- **Down module** — viewport shows "PROJECT is not responding" panel (with retry +
  new-tab buttons) instead of a broken frame.
- Client polls `/api/status` every 30s and re-renders dots without reloading frames.

## 6. Error handling

| Failure | Behaviour |
|---|---|
| Module down / timeout | Status dot ○, friendly panel in viewport, hub unaffected |
| Module 5xx on health | Dot ● error (amber), frame still loads if page works |
| Module blocks framing later | Frame fails ⇒ user uses ↗ new-tab button (always visible) |
| Bad projects.json edit | Keep last good registry, log error |
| Wrong password | 401, generic "invalid password" message, no lockout in v1 |
| postMessage from unknown origin | Ignored (origin not in registry) |

## 7. Deployment

- One PM2 app `admin-link` (entry `server/index.js`), `PORT` from env (default 5500),
  binds `0.0.0.0` so the chosen server IP serves it.
- `.env`: `PORT`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
- Ships with `ecosystem.config.js`, `.env.example`, `DEPLOY.md` (install → build client
  → pm2 start), and an optional nginx server-block snippet for port-80 exposure later.
- Build artifact: `client/dist` served statically by Express.

## 8. Testing

- **Server (Vitest + Supertest):** login flow (right/wrong password, cookie set),
  `/api/projects` (valid file, malformed file ⇒ last-good), status poller unit tests
  with mocked fetch (online / 5xx / timeout ⇒ correct states), auth middleware blocks
  unauthenticated `/api/*`.
- **Client (Vitest + Testing Library):** sidebar renders registry with correct dots,
  selecting a project sets iframe src with `?embed=1`, down-module panel appears,
  new-tab link correctness.
- Same tooling as 3dviewer, TDD during implementation.

## 9. Out of scope (v1)

- SSO / shared login across modules (phase-2 token-exchange path documented in §3).
- Proxying modules under one origin (nginx front-door) — upgrade path if framing or
  cookie problems ever appear.
- Restart/stop controls, log viewers, metrics aggregation — modules' own admin pages
  already cover their stats ("all the stats are already there").
- Embed-mode edits inside code-runner and 3dviewer repos (one small change each,
  done in those projects, not in this repo).
