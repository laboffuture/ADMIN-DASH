# Module intake — status per module

Derived from code on 2026-06-10. `projects.json` deliberately carries NO URLs for
unconnected modules — they render as "NOT CONNECTED" placeholder cards. As each
real address arrives, paste the adminUrl/healthUrl below into the module's entry
(hosts to substitute: `SERVER-IP` = the VPS for CODERUNNER backend + 3D-VIEWER;
`INTERNAL-HOST` = wherever INTERNAL-AGENTICSYSTEM's docker/nginx runs;
CODERUNNER's web is on Railway — HTTPS URL from the Railway dashboard).
Topology confirmed by user: CODERUNNER frontend on Railway, backend on VPS;
QC AGENT and the internal system will also run on the VPS.

## Fully derived (waiting only on host addresses)

| Module | Stack | Admin page | Health | Auth | Notes |
|---|---|---|---|---|---|
| CODERUNNER | Next.js web + Express API + runner · MongoDB + Redis · PM2 + nginx | `/admin/monitoring` | web `/api/health` | JWT | Open: WHICH codebase is live — `code-runner-production` monorepo or `PRODUCTION\Coderunner-Backend`+`Frontend` split? Plus port (8080 vs 3000). Module work briefed in `CODE-RUNNER-INTEGRATION.md` (nginx X-Frame-Options removal, metrics fix) |
| ~~STUDENT-FEEDBACK~~ **CONNECTED 2026-08-05** | standalone docker-compose stack at `/home/lofcs/student-feedback`: Next.js `:3000` + FastAPI `:8000` + Postgres. **No basePath** — the `/feedback` prefix in earlier notes was wrong | `https://feedback.laboffuture.com/admin` | `…/health` (Next rewrite → FastAPI `/health`, so it proves the backend too) | own login → `localStorage.kiosk_auth` Bearer | Browser only ever calls relative paths; Next rewrites them server-side to `http://backend:8000` ⇒ **no CORS surface**. Embed-mode (`?embed=1` chrome-hide) still not implemented |
| ~~3D-VIEWER (PROTOVIEW)~~ **CONNECTED 2026-08-05** | Vite/React + Express · MongoDB Atlas · single origin **`:5000`** (not `:4000`) behind `3dviewer.laboffuture.com` | `https://3dviewer.laboffuture.com/admin/dashboard` — note `/admin` is the *login*, `/admin/dashboard` the real page | `…/health` ✓ exists | own JWT login → `localStorage.admin_token` | Client built with an empty `VITE_API_URL` ⇒ relative paths, same origin, **no CORS surface**. No helmet ⇒ frames fine. Embed-mode (`AdminLayout.jsx`) still not implemented |
| SYNC FLOW | Next.js (basePath `/syncflow`) + Genkit · `apps/syncflow` | `/syncflow/admin` | none — hub pings admin page | own login + LOF-SSO | Embed-mode pending |
| TIMESHEET | TimeWise — Next.js (basePath `/timesheet`) + MongoDB · `apps/timesheet` | `/timesheet/dashboard/admin` | `/timesheet/api/health` ✓ exists | own login + LOF-SSO | Embed-mode pending |
| HORILLA | Horilla HRMS (Django), self-hosted in `apps/hr/horilla-hr-1.0` | `/hr/` | none — hub pings page | Horilla login | ⚠️ `settings.py:236` sets `X_FRAME_OPTIONS = "SAMEORIGIN"` — blocks the hub's iframe (different origin). Fix: remove XFrameOptionsMiddleware header for hub or add CSP `frame-ancestors 'self' <HUB-ORIGIN>` |

## Still open

| Module | What's missing |
|---|---|
| QC AGENT | Repo is standalone `D:\LOF\PROJECTS\LOF\QC_AGENT` (React/Vite + FastAPI :8000 + 6-layer pipeline; monorepo `apps/qc` is an empty placeholder). PM2 config runs it ON THIS WINDOWS PC. Need: where it will run for the team + how the frontend is served in prod (port), then it gets URLs |
| WEBSITE | Everything: what is it (WordPress? custom?), what "admin" means for it, URL |

## Host addresses needed (the only blockers for going live)

*Resolved 2026-08-05: the "VPS" is the box the hub itself runs on (public
`14.194.139.124`), and the fleet is reachable by name under `laboffuture.com`,
not by IP:port. Since the hub is now HTTPS (`cortex.laboffuture.com`), register
the **HTTPS domain** for every module — an `http://IP:port` entry is blocked as
mixed content and frames blank.*

1. ~~`SERVER-IP` for CODERUNNER~~ — done: `coderunner.laboffuture.com` (web,
   Railway custom domain) + `api.laboffuture.com` (API on this VPS).
2. ~~**3D-VIEWER**~~ — done: `https://3dviewer.laboffuture.com/admin/dashboard`
   + `/health`. One deployment only — pm2 `3dviewer`
   (`/home/lofcs/PROTOTYPE-VIEWER/server`) listens on **`:5000`**, which is what
   nginx proxies. (`:4000` is CODE-RUNNER's `api-1`, whose helmet headers are
   unrelated to the viewer.) The viewer server uses no helmet, so nothing
   blocks framing.
3. `INTERNAL-HOST` — machine running the INTERNAL-AGENTICSYSTEM docker stack
   (SYNC FLOW / TIMESHEET / HORILLA)
4. QC AGENT serving decision · 5. WEBSITE details

## Module-side work queue (for each project's Claude session, when ready)

- CODERUNNER: per `CODE-RUNNER-INTEGRATION.md`
- 3D-VIEWER: per `PROTOVIEW-INTEGRATION.md`
- STUDENT-FEEDBACK / SYNC FLOW / TIMESHEET: add `?embed=1` chrome-hide to the admin layout
- HORILLA: replace `X_FRAME_OPTIONS = "SAMEORIGIN"` with hub-allowing CSP frame-ancestors
