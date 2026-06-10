# Module intake — status per module

Derived from code on 2026-06-10. Two host placeholders to fill at deploy time in
`projects.json`:
- `SERVER-IP` — the VPS running CODERUNNER and 3D-VIEWER
- `INTERNAL-HOST` — wherever INTERNAL-AGENTICSYSTEM's docker/nginx stack runs
  (single origin :80 for feedback, syncflow, timesheet, horilla)

## Fully derived (waiting only on host addresses)

| Module | Stack | Admin page | Health | Auth | Notes |
|---|---|---|---|---|---|
| CODERUNNER | Next.js web + Express API + runner · MongoDB + Redis · PM2 + nginx | `/admin/monitoring` | web `/api/health` | JWT | Open: WHICH codebase is live — `code-runner-production` monorepo or `PRODUCTION\Coderunner-Backend`+`Frontend` split? Plus port (8080 vs 3000). Module work briefed in `CODE-RUNNER-INTEGRATION.md` (nginx X-Frame-Options removal, metrics fix) |
| STUDENT-FEEDBACK | Next.js (basePath `/feedback`) + FastAPI router in platform backend (FER emotion model) · `apps/feedback` | `/feedback/admin` (sessions, workshops) | platform `/health` | platform login + SSO | Embed-mode (`?embed=1` chrome-hide) not yet implemented |
| 3D-VIEWER (PROTOVIEW) | Vite/React + Express · MongoDB Atlas · single origin :4000 | `/admin` | `/health` (to be added) | own JWT login | Briefed in `PROTOVIEW-INTEGRATION.md` |
| SYNC FLOW | Next.js (basePath `/syncflow`) + Genkit · `apps/syncflow` | `/syncflow/admin` | none — hub pings admin page | own login + LOF-SSO | Embed-mode pending |
| TIMESHEET | TimeWise — Next.js (basePath `/timesheet`) + MongoDB · `apps/timesheet` | `/timesheet/dashboard/admin` | `/timesheet/api/health` ✓ exists | own login + LOF-SSO | Embed-mode pending |
| HORILLA | Horilla HRMS (Django), self-hosted in `apps/hr/horilla-hr-1.0` | `/hr/` | none — hub pings page | Horilla login | ⚠️ `settings.py:236` sets `X_FRAME_OPTIONS = "SAMEORIGIN"` — blocks the hub's iframe (different origin). Fix: remove XFrameOptionsMiddleware header for hub or add CSP `frame-ancestors 'self' <HUB-ORIGIN>` |

## Still open

| Module | What's missing |
|---|---|
| QC AGENT | Repo is standalone `D:\LOF\PROJECTS\LOF\QC_AGENT` (React/Vite + FastAPI :8000 + 6-layer pipeline; monorepo `apps/qc` is an empty placeholder). PM2 config runs it ON THIS WINDOWS PC. Need: where it will run for the team + how the frontend is served in prod (port), then it gets URLs |
| WEBSITE | Everything: what is it (WordPress? custom?), what "admin" means for it, URL |

## Host addresses needed (the only blockers for going live)

1. `SERVER-IP` — VPS for CODERUNNER + 3D-VIEWER (+ which Coderunner codebase is deployed)
2. `INTERNAL-HOST` — machine running the INTERNAL-AGENTICSYSTEM docker stack
3. QC AGENT serving decision · 4. WEBSITE details

## Module-side work queue (for each project's Claude session, when ready)

- CODERUNNER: per `CODE-RUNNER-INTEGRATION.md`
- 3D-VIEWER: per `PROTOVIEW-INTEGRATION.md`
- STUDENT-FEEDBACK / SYNC FLOW / TIMESHEET: add `?embed=1` chrome-hide to the admin layout
- HORILLA: replace `X_FRAME_OPTIONS = "SAMEORIGIN"` with hub-allowing CSP frame-ancestors
