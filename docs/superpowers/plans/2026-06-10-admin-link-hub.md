# ADMIN-LINK Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ADMIN-LINK hub — a password-gated portal that lists every LOF project in a sidebar with live status dots and displays the selected project's existing admin page in an embedded iframe.

**Architecture:** One Express server (`server/`) provides login, the `projects.json` registry, and a 30-second health poller, and serves the built React client in production. One Vite+React client (`client/`) renders Login → Dashboard (Sidebar + iframe Viewport + toasts from module `postMessage`). No database; registry is re-read from disk per request with last-good fallback. Spec: `docs/superpowers/specs/2026-06-10-admin-link-hub-design.md`.

**Tech Stack:** Node 18+ (global `fetch`), Express 4, jsonwebtoken, cookie-parser, dotenv · React 18, Vite 5 · Vitest + Supertest (server), Vitest + Testing Library + jsdom (client). Server code is CommonJS (mirrors 3dviewer); test files use ESM imports (Vitest transforms them).

**Conventions:** All commands run from the repo root `D:\LOF\PROJECTS\ADMIN-LINK`. `npm --prefix server …` / `npm --prefix client …` keep commands cross-platform (no `&&`, no `cd`). The UI ships with a neutral dark theme in one CSS file (`client/src/styles.css`) — the user's style guide, when provided, replaces that file's variables only.

---

## File Structure

```
ADMIN-LINK/
├─ .gitignore
├─ .env.example            # PORT, ADMIN_PASSWORD, SESSION_SECRET
├─ .env                    # local dev values (gitignored)
├─ projects.json           # module registry (deploy-time config)
├─ ecosystem.config.js     # PM2: one process "admin-link"
├─ DEPLOY.md               # VPS install/run steps + nginx snippet
├─ README.md               # what this is, dev quickstart
├─ server/
│  ├─ package.json
│  ├─ index.js             # entry: env, wiring, listen 0.0.0.0
│  ├─ app.js               # createApp(): routes + static client
│  ├─ auth.js              # createAuth(): login/logout/requireAuth (JWT cookie)
│  ├─ registry.js          # createRegistry(): load projects.json, last-good fallback
│  ├─ poller.js            # createPoller(): 30s checks, 5s timeout, status cache
│  └─ tests/
│     ├─ registry.test.js
│     ├─ poller.test.js
│     ├─ auth.test.js
│     └─ api.test.js       # supertest over createApp with fakes
└─ client/
   ├─ package.json
   ├─ vite.config.js       # react plugin, /api proxy → :5500, vitest jsdom
   ├─ index.html
   └─ src/
      ├─ main.jsx
      ├─ App.jsx           # session check → Login | Dashboard
      ├─ api.js            # fetch helpers (login/logout/me/projects/status)
      ├─ styles.css        # ALL theming via CSS variables (style-guide swap point)
      ├─ test-setup.js
      ├─ hooks/
      │  ├─ useHubMessages.js        # postMessage listener + origin allowlist
      │  └─ useHubMessages.test.jsx
      └─ components/
         ├─ Login.jsx / Login.test.jsx
         ├─ Sidebar.jsx / Sidebar.test.jsx
         ├─ Viewport.jsx / Viewport.test.jsx
         ├─ Toast.jsx
         └─ Dashboard.jsx  # assembly: data fetch, 30s poll, selection, toasts
```

API surface (all JSON): `POST /api/login {password}` → sets `admlink_session` cookie · `POST /api/logout` · `GET /api/me` (auth) · `GET /api/projects` (auth) → registry array · `GET /api/status` (auth) → `{ [projectId]: { status: 'online'|'error'|'down', httpStatus, latencyMs, lastChecked } }`.

---

### Task 1: Repo scaffold + server package

**Files:**
- Create: `.gitignore`, `.env.example`, `.env`, `projects.json`, `server/package.json`

- [ ] **Step 1: Write `.gitignore`**

```gitignore
node_modules/
dist/
.env
logs/
*.log
```

- [ ] **Step 2: Write `.env.example`**

```ini
# Port the hub listens on (bound to 0.0.0.0)
PORT=5500
# Single admin password for the hub login
ADMIN_PASSWORD=change-me
# Long random string for signing session cookies
# generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SESSION_SECRET=change-me-too
```

- [ ] **Step 3: Write `.env` (dev values, gitignored)**

```ini
PORT=5500
ADMIN_PASSWORD=dev-password
SESSION_SECRET=dev-secret-not-for-production-0123456789abcdef0123456789abcdef
```

- [ ] **Step 4: Write `projects.json`** (SERVER-IP is filled at deploy time; modules show as ○ down until then — expected)

```json
[
  {
    "id": "code-runner",
    "name": "Code Runner",
    "description": "Python compiler & missions for students",
    "adminUrl": "http://SERVER-IP:8080/admin/monitoring",
    "healthUrl": "http://SERVER-IP:8080/api/health",
    "accent": "#22d3ee"
  },
  {
    "id": "protoview",
    "name": "PROTOVIEW",
    "description": "3D model review & voting",
    "adminUrl": "http://SERVER-IP:4000/admin",
    "healthUrl": "http://SERVER-IP:4000/health",
    "accent": "#a78bfa"
  }
]
```

- [ ] **Step 5: Write `server/package.json`**

```json
{
  "name": "admin-link-server",
  "private": true,
  "engines": { "node": ">=18.0.0" },
  "scripts": {
    "dev": "node index.js",
    "start": "node index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "cookie-parser": "^1.4.6",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 6: Install server deps**

Run: `npm --prefix server install`
Expected: lockfile created, no errors (warnings OK).

- [ ] **Step 7: Commit**

```bash
git add .gitignore .env.example projects.json server/package.json server/package-lock.json
git commit -m "chore: scaffold repo and server package"
```

---

### Task 2: Registry module (projects.json with last-good fallback)

**Files:**
- Create: `server/registry.js`
- Test: `server/tests/registry.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/registry.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRegistry } from '../registry.js';

const VALID = [
  { id: 'a', name: 'Project A', adminUrl: 'http://10.0.0.5:4000/admin' },
];

let file;

beforeEach(() => {
  file = path.join(os.tmpdir(), `admlink-registry-${Date.now()}-${Math.random()}.json`);
});

afterEach(() => {
  if (fs.existsSync(file)) fs.unlinkSync(file);
});

describe('createRegistry', () => {
  it('loads a valid projects file', () => {
    fs.writeFileSync(file, JSON.stringify(VALID));
    const registry = createRegistry(file);
    expect(registry.load()).toEqual(VALID);
  });

  it('keeps the last good list when the file becomes invalid JSON', () => {
    fs.writeFileSync(file, JSON.stringify(VALID));
    const registry = createRegistry(file);
    registry.load();
    fs.writeFileSync(file, '{ this is not json');
    expect(registry.load()).toEqual(VALID);
  });

  it('keeps the last good list when entries are missing required fields', () => {
    fs.writeFileSync(file, JSON.stringify(VALID));
    const registry = createRegistry(file);
    registry.load();
    fs.writeFileSync(file, JSON.stringify([{ name: 'no id or adminUrl' }]));
    expect(registry.load()).toEqual(VALID);
  });

  it('returns an empty list when the file was never valid', () => {
    const registry = createRegistry(file); // file does not exist
    expect(registry.load()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '../registry.js'` (or equivalent resolve error).

- [ ] **Step 3: Write minimal implementation**

`server/registry.js`:

```js
const fs = require('fs');

function validateProjects(data) {
  if (!Array.isArray(data)) throw new Error('projects.json must be an array');
  for (const p of data) {
    if (typeof p.id !== 'string' || !p.id) throw new Error('every project needs a string "id"');
    if (typeof p.name !== 'string' || !p.name) throw new Error(`project "${p.id}": missing "name"`);
    if (typeof p.adminUrl !== 'string' || !p.adminUrl) throw new Error(`project "${p.id}": missing "adminUrl"`);
  }
  return data;
}

// Re-reads the file on every load() so edits apply without a restart.
// On any read/parse/validation error, serves the last good list.
function createRegistry(filePath) {
  let lastGood = [];
  return {
    load() {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        lastGood = validateProjects(JSON.parse(raw));
      } catch (err) {
        console.error(`[registry] keeping last good list (${lastGood.length} projects): ${err.message}`);
      }
      return lastGood;
    },
  };
}

module.exports = { createRegistry };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add server/registry.js server/tests/registry.test.js
git commit -m "feat: project registry with last-good fallback"
```

---

### Task 3: Status poller (30s interval, 5s timeout, online/error/down)

**Files:**
- Create: `server/poller.js`
- Test: `server/tests/poller.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/poller.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createPoller } from '../poller.js';

const projects = [
  { id: 'a', name: 'A', adminUrl: 'http://x/admin', healthUrl: 'http://x/health' },
  { id: 'b', name: 'B', adminUrl: 'http://y/admin' },
];

const okFetch = async () => ({ status: 200 });
const errFetch = async () => ({ status: 503 });
const downFetch = async () => { throw new Error('ECONNREFUSED'); };
const hangingFetch = (url, { signal }) =>
  new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('createPoller', () => {
  it('starts with no statuses', () => {
    const poller = createPoller(() => projects, { fetchFn: okFetch });
    expect(poller.getStatuses()).toEqual({});
  });

  it('marks 2xx responses online with a latency', async () => {
    const poller = createPoller(() => projects, { fetchFn: okFetch });
    const statuses = await poller.checkAll();
    expect(statuses.a.status).toBe('online');
    expect(statuses.a.httpStatus).toBe(200);
    expect(typeof statuses.a.latencyMs).toBe('number');
    expect(typeof statuses.a.lastChecked).toBe('string');
    expect(statuses.b.status).toBe('online');
  });

  it('marks 4xx online (server responded) and 5xx as error', async () => {
    const poller404 = createPoller(() => projects, { fetchFn: async () => ({ status: 404 }) });
    expect((await poller404.checkAll()).a.status).toBe('online');

    const poller503 = createPoller(() => projects, { fetchFn: errFetch });
    expect((await poller503.checkAll()).a.status).toBe('error');
  });

  it('marks network failures down', async () => {
    const poller = createPoller(() => projects, { fetchFn: downFetch });
    const statuses = await poller.checkAll();
    expect(statuses.a).toMatchObject({ status: 'down', httpStatus: null, latencyMs: null });
  });

  it('aborts slow checks after timeoutMs and marks them down', async () => {
    const poller = createPoller(() => projects, { fetchFn: hangingFetch, timeoutMs: 50 });
    const statuses = await poller.checkAll();
    expect(statuses.a.status).toBe('down');
    expect(statuses.b.status).toBe('down');
  });

  it('checks healthUrl when present, otherwise adminUrl', async () => {
    const seen = [];
    const spyFetch = async (url) => { seen.push(url); return { status: 200 }; };
    await createPoller(() => projects, { fetchFn: spyFetch }).checkAll();
    expect(seen).toContain('http://x/health');
    expect(seen).toContain('http://y/admin');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '../poller.js'`.

- [ ] **Step 3: Write minimal implementation**

`server/poller.js`:

```js
// Pings each project's healthUrl (fallback: adminUrl) and caches results.
// online: HTTP < 500 (the server answered) · error: HTTP >= 500 · down: no answer/timeout.
function createPoller(getProjects, { intervalMs = 30000, timeoutMs = 5000, fetchFn = fetch } = {}) {
  const statuses = {};
  let timer = null;

  async function checkProject(project) {
    const url = project.healthUrl || project.adminUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    let result;
    try {
      const res = await fetchFn(url, { signal: controller.signal, redirect: 'follow' });
      result = {
        status: res.status >= 500 ? 'error' : 'online',
        httpStatus: res.status,
        latencyMs: Date.now() - started,
      };
    } catch {
      result = { status: 'down', httpStatus: null, latencyMs: null };
    } finally {
      clearTimeout(timeout);
    }
    statuses[project.id] = { ...result, lastChecked: new Date().toISOString() };
  }

  async function checkAll() {
    await Promise.all(getProjects().map(checkProject));
    return getStatuses();
  }

  function getStatuses() {
    return { ...statuses };
  }

  function start() {
    if (timer) return;
    checkAll();
    timer = setInterval(checkAll, intervalMs);
    if (timer.unref) timer.unref();
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  return { checkAll, getStatuses, start, stop };
}

module.exports = { createPoller };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS — registry + poller suites green.

- [ ] **Step 5: Commit**

```bash
git add server/poller.js server/tests/poller.test.js
git commit -m "feat: health status poller with timeout and three states"
```

---

### Task 4: Auth module (password → JWT httpOnly cookie)

**Files:**
- Create: `server/auth.js`
- Test: `server/tests/auth.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/auth.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { createAuth } from '../auth.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    cookies: {},
    cleared: [],
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    cookie(name, value, opts) { this.cookies[name] = { value, opts }; return this; },
    clearCookie(name) { this.cleared.push(name); return this; },
  };
}

const auth = createAuth({ password: 'hunter2', secret: 'test-secret' });

describe('createAuth', () => {
  it('throws when password or secret is missing', () => {
    expect(() => createAuth({ password: '', secret: 'x' })).toThrow();
    expect(() => createAuth({ password: 'x', secret: '' })).toThrow();
  });

  it('rejects a wrong password with 401 and no cookie', () => {
    const res = mockRes();
    auth.loginHandler({ body: { password: 'wrong' } }, res);
    expect(res.statusCode).toBe(401);
    expect(Object.keys(res.cookies)).toHaveLength(0);
  });

  it('accepts the right password and sets an httpOnly session cookie', () => {
    const res = mockRes();
    auth.loginHandler({ body: { password: 'hunter2' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const cookie = res.cookies[auth.COOKIE_NAME];
    expect(cookie).toBeDefined();
    expect(cookie.opts.httpOnly).toBe(true);
  });

  it('requireAuth passes a valid cookie through and rejects missing/garbage tokens', () => {
    const good = mockRes();
    auth.loginHandler({ body: { password: 'hunter2' } }, good);
    const token = good.cookies[auth.COOKIE_NAME].value;

    const next = vi.fn();
    auth.requireAuth({ cookies: { [auth.COOKIE_NAME]: token } }, mockRes(), next);
    expect(next).toHaveBeenCalled();

    const res401 = mockRes();
    auth.requireAuth({ cookies: {} }, res401, vi.fn());
    expect(res401.statusCode).toBe(401);

    const resBad = mockRes();
    auth.requireAuth({ cookies: { [auth.COOKIE_NAME]: 'garbage' } }, resBad, vi.fn());
    expect(resBad.statusCode).toBe(401);
  });

  it('logout clears the cookie', () => {
    const res = mockRes();
    auth.logoutHandler({}, res);
    expect(res.cleared).toContain(auth.COOKIE_NAME);
    expect(res.body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '../auth.js'`.

- [ ] **Step 3: Write minimal implementation**

`server/auth.js`:

```js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'admlink_session';
const SESSION_HOURS = 12;

// Constant-time comparison via hashing (inputs may differ in length).
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function createAuth({ password, secret }) {
  if (!password || !secret) {
    throw new Error('ADMIN_PASSWORD and SESSION_SECRET must both be set');
  }

  function loginHandler(req, res) {
    const supplied = req.body && req.body.password;
    if (!supplied || !safeEqual(supplied, password)) {
      return res.status(401).json({ error: 'invalid password' });
    }
    const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: `${SESSION_HOURS}h` });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_HOURS * 60 * 60 * 1000,
    });
    res.json({ ok: true });
  }

  function logoutHandler(req, res) {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  }

  function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'not authenticated' });
    try {
      jwt.verify(token, secret);
      next();
    } catch {
      res.status(401).json({ error: 'session expired' });
    }
  }

  return { loginHandler, logoutHandler, requireAuth, COOKIE_NAME };
}

module.exports = { createAuth };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS — all three suites green.

- [ ] **Step 5: Commit**

```bash
git add server/auth.js server/tests/auth.test.js
git commit -m "feat: single-password auth with JWT session cookie"
```

---

### Task 5: Express app + API routes + entrypoint

**Files:**
- Create: `server/app.js`, `server/index.js`
- Test: `server/tests/api.test.js`

- [ ] **Step 1: Write the failing test**

`server/tests/api.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createAuth } from '../auth.js';

const PROJECTS = [
  { id: 'a', name: 'Project A', adminUrl: 'http://10.0.0.5:4000/admin' },
];
const STATUSES = {
  a: { status: 'online', httpStatus: 200, latencyMs: 12, lastChecked: '2026-06-10T00:00:00.000Z' },
};

let app;

beforeEach(() => {
  app = createApp({
    registry: { load: () => PROJECTS },
    poller: { getStatuses: () => STATUSES },
    auth: createAuth({ password: 'hunter2', secret: 'test-secret' }),
    clientDist: null,
  });
});

async function loginCookie() {
  const res = await request(app).post('/api/login').send({ password: 'hunter2' });
  return res.headers['set-cookie'];
}

describe('API', () => {
  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/login').send({ password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('logs in and grants /api/me', async () => {
    const cookie = await loginCookie();
    expect(cookie).toBeDefined();
    const me = await request(app).get('/api/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ ok: true });
  });

  it('blocks /api/projects and /api/status without a session', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);
    expect((await request(app).get('/api/status')).status).toBe(401);
  });

  it('serves the registry to a logged-in admin', async () => {
    const cookie = await loginCookie();
    const res = await request(app).get('/api/projects').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(PROJECTS);
  });

  it('serves cached statuses to a logged-in admin', async () => {
    const cookie = await loginCookie();
    const res = await request(app).get('/api/status').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(STATUSES);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `Cannot find module '../app.js'`.

- [ ] **Step 3: Write the app factory**

`server/app.js`:

```js
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

// clientDist: absolute path to the built client, or null to skip static serving (dev/tests).
function createApp({ registry, poller, auth, clientDist }) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.post('/api/login', auth.loginHandler);
  app.post('/api/logout', auth.logoutHandler);
  app.get('/api/me', auth.requireAuth, (req, res) => res.json({ ok: true }));
  app.get('/api/projects', auth.requireAuth, (req, res) => res.json(registry.load()));
  app.get('/api/status', auth.requireAuth, (req, res) => res.json(poller.getStatuses()));

  if (clientDist) {
    app.use(express.static(clientDist));
    // SPA fallback for everything that is not an API route
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}

module.exports = { createApp };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS — 4 suites green.

- [ ] **Step 5: Write the entrypoint**

`server/index.js`:

```js
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createRegistry } = require('./registry');
const { createPoller } = require('./poller');
const { createAuth } = require('./auth');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 5500;

const registry = createRegistry(path.join(__dirname, '..', 'projects.json'));
const poller = createPoller(() => registry.load());
const auth = createAuth({
  password: process.env.ADMIN_PASSWORD,
  secret: process.env.SESSION_SECRET,
});

const distPath = path.join(__dirname, '..', 'client', 'dist');
const clientDist = fs.existsSync(distPath) ? distPath : null;

const app = createApp({ registry, poller, auth, clientDist });

poller.start();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ADMIN-LINK hub listening on 0.0.0.0:${PORT} (client ${clientDist ? 'served' : 'NOT built yet'})`);
});
```

- [ ] **Step 6: Boot smoke test**

Run (PowerShell): `$p = Start-Process node -ArgumentList 'server/index.js' -PassThru; Start-Sleep 2; curl.exe -s -i http://localhost:5500/api/me; Stop-Process $p.Id`
Expected output contains: `HTTP/1.1 401` and `{"error":"not authenticated"}` — server boots, auth gate works.

- [ ] **Step 7: Commit**

```bash
git add server/app.js server/index.js server/tests/api.test.js
git commit -m "feat: express app with auth-gated registry and status API"
```

---

### Task 6: Client scaffold (Vite + React + vitest)

**Files:**
- Create: `client/package.json`, `client/vite.config.js`, `client/index.html`, `client/src/main.jsx`, `client/src/App.jsx` (placeholder), `client/src/styles.css`, `client/src/test-setup.js`

- [ ] **Step 1: Write `client/package.json`**

```json
{
  "name": "admin-link-client",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "vite": "^5.4.8",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Write `client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:5500' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    globals: true,
  },
});
```

- [ ] **Step 3: Write `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ADMIN-LINK</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `client/src/test-setup.js`**

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Write `client/src/main.jsx`**

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 6: Write placeholder `client/src/App.jsx`** (replaced in Task 7)

```jsx
export function App() {
  return <div className="boot">ADMIN-LINK</div>;
}
```

- [ ] **Step 7: Write `client/src/styles.css`**

```css
/* ─────────────────────────────────────────────────────────────
   ADMIN-LINK neutral theme.
   TEMPORARY until the official style guide arrives — reskin by
   editing the variables below; components reference them only.
   ───────────────────────────────────────────────────────────── */
:root {
  --bg: #0f1115;
  --panel: #161a22;
  --panel-raised: #1d232e;
  --border: #2a3140;
  --text: #e8ecf4;
  --muted: #8b94a7;
  --accent: #4f8cff;
  --online: #2ecc71;
  --warn: #f5a623;
  --down: #596070;
  --danger: #e5484d;
  --radius: 10px;
  --font: system-ui, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, 'Cascadia Code', Consolas, monospace;
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { background: var(--bg); color: var(--text); font-family: var(--font); }
button { font: inherit; cursor: pointer; }

.boot {
  height: 100%; display: grid; place-items: center;
  color: var(--muted); letter-spacing: 0.2em;
}

/* ── layout ── */
.hub-layout { display: flex; height: 100%; }

/* ── sidebar ── */
.sidebar {
  width: 260px; flex: none; display: flex; flex-direction: column;
  background: var(--panel); border-right: 1px solid var(--border);
}
.sidebar-brand { padding: 20px 18px 14px; border-bottom: 1px solid var(--border); }
.sidebar-brand h1 { margin: 0; font-size: 15px; letter-spacing: 0.12em; }
.sidebar-brand p { margin: 4px 0 0; font-size: 11px; color: var(--muted); font-family: var(--mono); }
.sidebar-projects { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 4px; }
.sidebar-empty { color: var(--muted); font-size: 12px; padding: 8px; }

.project-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 10px 12px; text-align: left;
  background: transparent; color: var(--text);
  border: 1px solid transparent; border-radius: var(--radius);
}
.project-item:hover { background: var(--panel-raised); }
.project-item.selected {
  background: var(--panel-raised);
  border-color: var(--accent);
}
.project-name { flex: 1; font-size: 13px; font-weight: 600; }
.latency { font-size: 10px; color: var(--muted); font-family: var(--mono); }

.dot { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--down); }
.dot-online { background: var(--online); box-shadow: 0 0 6px var(--online); }
.dot-error { background: var(--warn); box-shadow: 0 0 6px var(--warn); }
.dot-down { background: transparent; border: 2px solid var(--down); width: 7px; height: 7px; }
.dot-unknown { background: var(--down); opacity: 0.5; }

.sidebar-footer { padding: 12px 18px; border-top: 1px solid var(--border); }
.sidebar-footer p { margin: 0 0 8px; font-size: 10px; color: var(--muted); font-family: var(--mono); }
.logout {
  width: 100%; padding: 7px; border-radius: var(--radius);
  background: transparent; color: var(--muted); border: 1px solid var(--border);
}
.logout:hover { color: var(--text); border-color: var(--muted); }

/* ── viewport ── */
.viewport { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.viewport-empty { align-items: center; justify-content: center; color: var(--muted); }
.toolbar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; background: var(--panel); border-bottom: 1px solid var(--border);
}
.toolbar-title { font-weight: 700; font-size: 13px; letter-spacing: 0.06em; }
.toolbar-desc { flex: 1; font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.toolbar-actions { display: flex; gap: 8px; }
.toolbar-actions button, .toolbar-actions a {
  font-size: 11px; padding: 5px 10px; border-radius: var(--radius);
  background: var(--panel-raised); color: var(--text);
  border: 1px solid var(--border); text-decoration: none;
}
.toolbar-actions button:hover, .toolbar-actions a:hover { border-color: var(--accent); }

.module-frame { flex: 1; width: 100%; border: 0; background: #fff; }

.down-panel {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.down-panel h2 { margin: 0; font-size: 16px; }
.down-panel p { margin: 0; color: var(--muted); font-size: 13px; }
.down-actions { display: flex; gap: 10px; margin-top: 12px; }
.down-actions button, .down-actions a {
  padding: 8px 14px; border-radius: var(--radius); font-size: 12px;
  background: var(--panel-raised); color: var(--text);
  border: 1px solid var(--border); text-decoration: none;
}
.down-actions button:hover, .down-actions a:hover { border-color: var(--accent); }

/* ── login ── */
.login-screen { height: 100%; display: grid; place-items: center; }
.login-card {
  width: 320px; padding: 32px 28px; display: flex; flex-direction: column; gap: 12px;
  background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
}
.login-card h1 { margin: 0; font-size: 18px; letter-spacing: 0.14em; text-align: center; }
.login-sub { margin: 0 0 8px; text-align: center; color: var(--muted); font-size: 11px; font-family: var(--mono); }
.login-card input {
  padding: 10px 12px; border-radius: var(--radius); font: inherit;
  background: var(--bg); color: var(--text); border: 1px solid var(--border);
}
.login-card input:focus { outline: none; border-color: var(--accent); }
.login-card button {
  padding: 10px; border-radius: var(--radius); font-weight: 600;
  background: var(--accent); color: #fff; border: 0;
}
.login-card button:disabled { opacity: 0.5; cursor: default; }
.login-error { margin: 0; color: var(--danger); font-size: 12px; }

/* ── toasts ── */
.toasts { position: fixed; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 10; }
.toast {
  padding: 10px 14px; border-radius: var(--radius); font-size: 12px; max-width: 320px;
  background: var(--panel-raised); border: 1px solid var(--accent); color: var(--text);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.toast strong { margin-right: 6px; }
```

- [ ] **Step 8: Install client deps and verify the build**

Run: `npm --prefix client install`
Then: `npm --prefix client run build`
Expected: `vite build` completes, `client/dist/index.html` exists.

- [ ] **Step 9: Commit**

```bash
git add client/package.json client/package-lock.json client/vite.config.js client/index.html client/src
git commit -m "chore: scaffold vite react client with neutral theme"
```

---

### Task 7: API helper + Login screen + session gate

**Files:**
- Create: `client/src/api.js`, `client/src/components/Login.jsx`
- Modify: `client/src/App.jsx` (replace placeholder)
- Test: `client/src/components/Login.test.jsx`

- [ ] **Step 1: Write the failing test**

`client/src/components/Login.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from './Login';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(status, body) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  ));
}

describe('Login', () => {
  it('calls onSuccess when the password is accepted', async () => {
    stubFetch(200, { ok: true });
    const onSuccess = vi.fn();
    render(<Login onSuccess={onSuccess} />);
    await userEvent.type(screen.getByPlaceholderText('Admin password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows an error and does not succeed on a wrong password', async () => {
    stubFetch(401, { error: 'invalid password' });
    const onSuccess = vi.fn();
    render(<Login onSuccess={onSuccess} />);
    await userEvent.type(screen.getByPlaceholderText('Admin password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid password');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test`
Expected: FAIL — cannot resolve `./Login`.

- [ ] **Step 3: Write `client/src/api.js`**

```js
async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  login: (password) => request('/api/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/api/logout', { method: 'POST' }),
  me: () => request('/api/me'),
  projects: () => request('/api/projects'),
  status: () => request('/api/status'),
};
```

- [ ] **Step 4: Write `client/src/components/Login.jsx`**

```jsx
import { useState } from 'react';
import { api } from '../api';

export function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setError(err.status === 401 ? 'Invalid password' : 'Could not reach the hub server');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <h1>ADMIN-LINK</h1>
        <p className="login-sub">central admin hub</p>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Replace `client/src/App.jsx`** (session gate; `Dashboard` arrives in Task 10 — use a temporary inline placeholder so the app stays runnable)

```jsx
import { useEffect, useState } from 'react';
import { api } from './api';
import { Login } from './components/Login';

export function App() {
  const [authed, setAuthed] = useState(null); // null = checking session

  useEffect(() => {
    api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div className="boot">ADMIN-LINK</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <div className="boot">signed in — dashboard lands in Task 10</div>;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm --prefix client test`
Expected: PASS — 2 tests.

- [ ] **Step 7: Commit**

```bash
git add client/src/api.js client/src/components/Login.jsx client/src/components/Login.test.jsx client/src/App.jsx
git commit -m "feat: hub login screen and session gate"
```

---

### Task 8: Sidebar (project list + status dots)

**Files:**
- Create: `client/src/components/Sidebar.jsx`
- Test: `client/src/components/Sidebar.test.jsx`

- [ ] **Step 1: Write the failing test**

`client/src/components/Sidebar.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';

const projects = [
  { id: 'code-runner', name: 'Code Runner', adminUrl: 'http://10.0.0.5:8080/admin/monitoring' },
  { id: 'protoview', name: 'PROTOVIEW', adminUrl: 'http://10.0.0.5:4000/admin' },
];

describe('Sidebar', () => {
  it('renders each project with its status dot and latency', () => {
    const statuses = {
      'code-runner': { status: 'online', latencyMs: 42 },
      protoview: { status: 'down', latencyMs: null },
    };
    render(
      <Sidebar projects={projects} statuses={statuses} selectedId="code-runner" onSelect={() => {}} onLogout={() => {}} />,
    );
    expect(screen.getByText('Code Runner').closest('button').querySelector('.dot-online')).not.toBeNull();
    expect(screen.getByText('PROTOVIEW').closest('button').querySelector('.dot-down')).not.toBeNull();
    expect(screen.getByText('42ms')).toBeInTheDocument();
  });

  it('shows an unknown dot before the first status arrives', () => {
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('Code Runner').closest('button').querySelector('.dot-unknown')).not.toBeNull();
  });

  it('reports the clicked project id', async () => {
    const onSelect = vi.fn();
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={onSelect} onLogout={() => {}} />);
    await userEvent.click(screen.getByText('PROTOVIEW'));
    expect(onSelect).toHaveBeenCalledWith('protoview');
  });

  it('marks the selected project', () => {
    render(<Sidebar projects={projects} statuses={{}} selectedId="protoview" onSelect={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('PROTOVIEW').closest('button').className).toContain('selected');
  });

  it('calls onLogout from the footer button', async () => {
    const onLogout = vi.fn();
    render(<Sidebar projects={projects} statuses={{}} selectedId={null} onSelect={() => {}} onLogout={onLogout} />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test`
Expected: FAIL — cannot resolve `./Sidebar`.

- [ ] **Step 3: Write `client/src/components/Sidebar.jsx`**

```jsx
const DOT_TITLE = {
  online: 'online',
  error: 'responding with errors',
  down: 'not responding',
  unknown: 'checking…',
};

export function Sidebar({ projects, statuses, selectedId, onSelect, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>ADMIN-LINK</h1>
        <p>all projects · one place</p>
      </div>
      <nav className="sidebar-projects">
        {projects.map((p) => {
          const st = statuses[p.id];
          const state = st ? st.status : 'unknown';
          return (
            <button
              key={p.id}
              className={`project-item ${p.id === selectedId ? 'selected' : ''}`}
              onClick={() => onSelect(p.id)}
              style={p.accent ? { '--accent': p.accent } : undefined}
            >
              <span className={`dot dot-${state}`} title={DOT_TITLE[state]} />
              <span className="project-name">{p.name}</span>
              {st && st.latencyMs != null && <span className="latency">{st.latencyMs}ms</span>}
            </button>
          );
        })}
        {projects.length === 0 && <p className="sidebar-empty">No projects yet.</p>}
      </nav>
      <footer className="sidebar-footer">
        <p>add a project → edit projects.json</p>
        <button className="logout" onClick={onLogout}>Sign out</button>
      </footer>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix client test`
Expected: PASS — Login + Sidebar suites.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Sidebar.jsx client/src/components/Sidebar.test.jsx
git commit -m "feat: sidebar with project registry and live status dots"
```

---

### Task 9: Viewport (iframe with embed=1, toolbar, down panel)

**Files:**
- Create: `client/src/components/Viewport.jsx`
- Test: `client/src/components/Viewport.test.jsx`

- [ ] **Step 1: Write the failing test**

`client/src/components/Viewport.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Viewport } from './Viewport';

const project = {
  id: 'protoview',
  name: 'PROTOVIEW',
  description: '3D model review & voting',
  adminUrl: 'http://10.0.0.5:4000/admin',
};

describe('Viewport', () => {
  it('frames the admin page with embed=1 appended', () => {
    render(<Viewport project={project} status={{ status: 'online' }} onRetry={() => {}} />);
    const frame = screen.getByTitle('PROTOVIEW');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', 'http://10.0.0.5:4000/admin?embed=1');
  });

  it('appends embed=1 with & when the url already has a query', () => {
    const p = { ...project, adminUrl: 'http://10.0.0.5:4000/admin?tab=models' };
    render(<Viewport project={p} status={{ status: 'online' }} onRetry={() => {}} />);
    expect(screen.getByTitle('PROTOVIEW')).toHaveAttribute(
      'src',
      'http://10.0.0.5:4000/admin?tab=models&embed=1',
    );
  });

  it('offers an open-in-new-tab link to the raw admin url', () => {
    render(<Viewport project={project} status={{ status: 'online' }} onRetry={() => {}} />);
    expect(screen.getByTitle('Open in new tab')).toHaveAttribute('href', project.adminUrl);
  });

  it('shows the down panel instead of a frame when the module is down', async () => {
    const onRetry = vi.fn();
    render(<Viewport project={project} status={{ status: 'down' }} onRetry={onRetry} />);
    expect(screen.queryByTitle('PROTOVIEW')).toBeNull();
    expect(screen.getByText(/is not responding/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('asks to select a project when none is selected', () => {
    render(<Viewport project={null} status={undefined} onRetry={() => {}} />);
    expect(screen.getByText(/select a project/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test`
Expected: FAIL — cannot resolve `./Viewport`.

- [ ] **Step 3: Write `client/src/components/Viewport.jsx`**

```jsx
import { useState } from 'react';

function embedUrl(adminUrl) {
  return adminUrl + (adminUrl.includes('?') ? '&' : '?') + 'embed=1';
}

export function Viewport({ project, status, onRetry }) {
  const [frameKey, setFrameKey] = useState(0);

  if (!project) {
    return (
      <main className="viewport viewport-empty">
        <p>Select a project</p>
      </main>
    );
  }

  const down = status && status.status === 'down';

  return (
    <main className="viewport">
      <div className="toolbar">
        <span className="toolbar-title">{project.name}</span>
        <span className="toolbar-desc">{project.description}</span>
        <span className="toolbar-actions">
          <button onClick={() => setFrameKey((k) => k + 1)} title="Reload frame">↻ reload</button>
          <a href={project.adminUrl} target="_blank" rel="noreferrer" title="Open in new tab">↗ new tab</a>
        </span>
      </div>
      {down ? (
        <div className="down-panel">
          <h2>{project.name} is not responding</h2>
          <p>The hub keeps checking every 30 seconds.</p>
          <div className="down-actions">
            <button onClick={onRetry}>Try again</button>
            <a href={project.adminUrl} target="_blank" rel="noreferrer">Open in new tab ↗</a>
          </div>
        </div>
      ) : (
        <iframe
          key={`${project.id}-${frameKey}`}
          className="module-frame"
          title={project.name}
          src={embedUrl(project.adminUrl)}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix client test`
Expected: PASS — Login + Sidebar + Viewport suites.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Viewport.jsx client/src/components/Viewport.test.jsx
git commit -m "feat: embedded viewport with toolbar and down panel"
```

---

### Task 10: postMessage hook, toasts, Dashboard assembly

**Files:**
- Create: `client/src/hooks/useHubMessages.js`, `client/src/components/Toast.jsx`, `client/src/components/Dashboard.jsx`
- Modify: `client/src/App.jsx` (mount Dashboard)
- Test: `client/src/hooks/useHubMessages.test.jsx`

- [ ] **Step 1: Write the failing test**

`client/src/hooks/useHubMessages.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHubMessages } from './useHubMessages';

const projects = [
  { id: 'protoview', name: 'PROTOVIEW', adminUrl: 'http://10.0.0.5:4000/admin' },
];

function postFrom(origin, data) {
  window.dispatchEvent(new MessageEvent('message', { origin, data }));
}

describe('useHubMessages', () => {
  it('forwards notify messages from registered module origins', () => {
    const onNotify = vi.fn();
    renderHook(() => useHubMessages(projects, onNotify));
    postFrom('http://10.0.0.5:4000', { type: 'notify', text: 'New votes are in' });
    expect(onNotify).toHaveBeenCalledWith('New votes are in', 'http://10.0.0.5:4000');
  });

  it('ignores messages from unknown origins', () => {
    const onNotify = vi.fn();
    renderHook(() => useHubMessages(projects, onNotify));
    postFrom('http://evil.example', { type: 'notify', text: 'hi' });
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('ignores unknown message types and malformed payloads', () => {
    const onNotify = vi.fn();
    renderHook(() => useHubMessages(projects, onNotify));
    postFrom('http://10.0.0.5:4000', { type: 'mystery' });
    postFrom('http://10.0.0.5:4000', { type: 'notify', text: 42 });
    postFrom('http://10.0.0.5:4000', null);
    expect(onNotify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test`
Expected: FAIL — cannot resolve `./useHubMessages`.

- [ ] **Step 3: Write `client/src/hooks/useHubMessages.js`**

```js
import { useEffect } from 'react';

// Listens for window messages from embedded modules. Only origins present in
// the registry (derived from each project's adminUrl) are accepted.
// v1 protocol: { type: 'notify', text: string } → onNotify(text, origin).
export function useHubMessages(projects, onNotify) {
  useEffect(() => {
    const allowed = new Set(
      projects
        .map((p) => {
          try {
            return new URL(p.adminUrl).origin;
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    );

    function onMessage(event) {
      if (!allowed.has(event.origin)) return;
      const data = event.data;
      if (data && data.type === 'notify' && typeof data.text === 'string') {
        onNotify(data.text, event.origin);
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [projects, onNotify]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix client test`
Expected: PASS — all client suites.

- [ ] **Step 5: Write `client/src/components/Toast.jsx`**

```jsx
import { useEffect } from 'react';

const TOAST_MS = 5000;

export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="toast" role="status">
      <strong>{toast.from}</strong>
      {toast.text}
    </div>
  );
}
```

- [ ] **Step 6: Write `client/src/components/Dashboard.jsx`**

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Sidebar } from './Sidebar';
import { Viewport } from './Viewport';
import { Toast } from './Toast';
import { useHubMessages } from '../hooks/useHubMessages';

const STATUS_POLL_MS = 30000;

export function Dashboard({ onLogout }) {
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(1);

  const refreshStatuses = useCallback(() => {
    api.status().then(setStatuses).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .projects()
      .then((list) => {
        setProjects(list);
        setSelectedId((cur) => cur || (list[0] && list[0].id) || null);
      })
      .catch(() => {});
    refreshStatuses();
    const timer = setInterval(refreshStatuses, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshStatuses]);

  const notify = useCallback(
    (text, origin) => {
      const match = projects.find((p) => {
        try {
          return new URL(p.adminUrl).origin === origin;
        } catch {
          return false;
        }
      });
      setToasts((cur) => [
        ...cur,
        { id: nextToastId.current++, text, from: match ? match.name : origin },
      ]);
    },
    [projects],
  );

  useHubMessages(projects, notify);

  const dismissToast = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  function handleLogout() {
    api.logout().catch(() => {}).finally(onLogout);
  }

  const selected = projects.find((p) => p.id === selectedId) || null;

  return (
    <div className="hub-layout">
      <Sidebar
        projects={projects}
        statuses={statuses}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onLogout={handleLogout}
      />
      <Viewport project={selected} status={selectedId ? statuses[selectedId] : undefined} onRetry={refreshStatuses} />
      <div className="toasts">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Replace the placeholder branch in `client/src/App.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { api } from './api';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [authed, setAuthed] = useState(null); // null = checking session

  useEffect(() => {
    api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div className="boot">ADMIN-LINK</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => setAuthed(false)} />;
}
```

- [ ] **Step 8: Run all client tests and the build**

Run: `npm --prefix client test`
Expected: PASS — Login, Sidebar, Viewport, useHubMessages suites.
Run: `npm --prefix client run build`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add client/src/hooks client/src/components/Toast.jsx client/src/components/Dashboard.jsx client/src/App.jsx
git commit -m "feat: dashboard assembly with status polling and module toasts"
```

---

### Task 11: Deployment files + docs

**Files:**
- Create: `ecosystem.config.js`, `DEPLOY.md`, `README.md`, `docs/nginx-admin-link.conf`

- [ ] **Step 1: Write `ecosystem.config.js`**

```js
// PM2 configuration — run from the repo root on the VPS: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'admin-link',
      script: './server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

- [ ] **Step 2: Write `docs/nginx-admin-link.conf`**

```nginx
# OPTIONAL: serve the hub on port 80 instead of :5500.
# Place in /etc/nginx/sites-available/admin-link and symlink into sites-enabled.
# IMPORTANT: do NOT add X-Frame-Options here — the hub iframes other apps.
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

- [ ] **Step 3: Write `DEPLOY.md`**

```markdown
# Deploying ADMIN-LINK

## Prerequisites
Node.js 18+, PM2 (`npm i -g pm2`), git.

## First-time install (on the server)
```bash
git clone <repo> /var/www/admin-link
cd /var/www/admin-link
npm --prefix server install
npm --prefix client install
npm --prefix client run build
cp .env.example .env
```

Edit `.env`:
- `PORT` — port the hub listens on (default 5500)
- `ADMIN_PASSWORD` — the single hub login password
- `SESSION_SECRET` — generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

Edit `projects.json`: replace every `SERVER-IP` with the real host/IP and ports of
the running projects. This file can be edited any time — the hub picks changes up
on the next browser refresh, no restart needed.

## Run
```bash
pm2 start ecosystem.config.js
pm2 save
```

Open `http://<server-ip>:5500/` and sign in with `ADMIN_PASSWORD`.

## Updating
```bash
cd /var/www/admin-link
git pull
npm --prefix server install
npm --prefix client install
npm --prefix client run build
pm2 restart admin-link
```

## Notes
- The hub serves plain HTTP; session cookies are not marked `Secure`. If you later
  add HTTPS, set the cookie `secure` flag in `server/auth.js`.
- Optional port-80 exposure: see `docs/nginx-admin-link.conf`.
- Module checklist for connecting projects: `docs/integration/`.
```

- [ ] **Step 4: Write `README.md`**

```markdown
# ADMIN-LINK

Central admin hub: one password-gated portal that lists every LOF project with a
live status dot and shows the selected project's existing admin page inside the
hub (iframe with `?embed=1`). Projects are registered in `projects.json` — adding
a module is one JSON entry, no rebuild.

- Design spec: `docs/superpowers/specs/2026-06-10-admin-link-hub-design.md`
- Module integration briefs: `docs/integration/`
- Deployment: `DEPLOY.md`

## Development

```bash
npm --prefix server install
npm --prefix client install
# terminal 1 — API on :5500
npm --prefix server run dev
# terminal 2 — Vite dev server on :5173 (proxies /api → :5500)
npm --prefix client run dev
```

Login password: `ADMIN_PASSWORD` in `.env` (dev default: `dev-password`).

## Tests

```bash
npm --prefix server test
npm --prefix client test
```
```

- [ ] **Step 5: Commit**

```bash
git add ecosystem.config.js DEPLOY.md README.md docs/nginx-admin-link.conf
git commit -m "docs: deployment config, nginx snippet, readme"
```

---

### Task 12: Full verification (prod-mode boot + login round-trip)

**Files:** none created — verification only.

- [ ] **Step 1: Run both test suites**

Run: `npm --prefix server test`
Expected: PASS — registry, poller, auth, api suites.
Run: `npm --prefix client test`
Expected: PASS — Login, Sidebar, Viewport, useHubMessages suites.

- [ ] **Step 2: Build the client**

Run: `npm --prefix client run build`
Expected: `client/dist/` produced.

- [ ] **Step 3: Boot the server in served mode and exercise the API end-to-end**

Run (PowerShell, from repo root):

```powershell
$p = Start-Process node -ArgumentList 'server/index.js' -PassThru
Start-Sleep 2
curl.exe -s -i http://localhost:5500/ | Select-Object -First 5            # expect 200 + html
curl.exe -s -i http://localhost:5500/api/projects                          # expect 401
curl.exe -s -i -c cookies.txt -H "Content-Type: application/json" -d '{\"password\":\"dev-password\"}' http://localhost:5500/api/login   # expect 200 + set-cookie
curl.exe -s -b cookies.txt http://localhost:5500/api/projects              # expect JSON array with code-runner + protoview
curl.exe -s -b cookies.txt http://localhost:5500/api/status                # expect JSON statuses (down until real IPs are set — correct)
Stop-Process $p.Id
Remove-Item cookies.txt
```

Expected: statuses show `"status":"down"` for both modules (SERVER-IP placeholder is unreachable) — this is the correct behaviour until real URLs are configured.

- [ ] **Step 4: Manual browser check (document result, no commit needed)**

Run `npm --prefix server run dev` and open `http://localhost:5500/` — login screen appears; after signing in with `dev-password`, the sidebar lists Code Runner + PROTOVIEW with ○ down dots and the viewport shows the iframe area. Stop the server.

- [ ] **Step 5: Commit any stragglers and mark plan complete**

```bash
git status
git add -A
git commit -m "chore: complete hub v1 implementation"
```

(Skip the commit if `git status` is clean.)

---

## Self-Review (run after writing, fixed inline)

- **Spec coverage:** registry/last-good (§4 → Task 2) ✓ · poller 30s/5s, three states (§2/§6 → Task 3) ✓ · single-password JWT cookie auth (§5 → Task 4) ✓ · auth-gated API + SPA serving (§2 → Task 5) ✓ · login screen, sidebar + dots + latency, footer note (§5 → Tasks 7–8) ✓ · iframe `?embed=1`, toolbar reload/new-tab, down panel (§3/§5/§6 → Task 9) ✓ · postMessage origin allowlist + notify toasts (§3/§6 → Task 10) ✓ · 30s client polling without frame reload (§5 → Task 10: statuses state is independent of iframe `key`) ✓ · PM2/env/DEPLOY/nginx (§7 → Task 11) ✓ · Vitest+Supertest / Testing Library (§8 → every task) ✓
- **Placeholder scan:** none — every step has full code/commands. `SERVER-IP` strings in `projects.json` are deliberate deploy-time config documented in DEPLOY.md, not plan gaps.
- **Type consistency:** status object `{ status, httpStatus, latencyMs, lastChecked }` identical in poller, api.test, Sidebar, Viewport ✓ · `createAuth` exposes `loginHandler/logoutHandler/requireAuth/COOKIE_NAME` used identically in app.js and tests ✓ · `onNotify(text, origin)` signature matches hook, test, and Dashboard ✓ · `registry.load()` used by app.js and index.js ✓
