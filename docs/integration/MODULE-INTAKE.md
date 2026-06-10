# Module intake — what the hub needs from every project

All 8 modules are registered in `projects.json` and visible in the sidebar.
A module with no `adminUrl` shows a dashed "not connected yet" dot; the moment
its URLs are filled in, it goes live — no rebuild, no restart.

**Fast path:** if the project's code lives on this machine
(`D:\LOF\PROJECTS\...`), just give Claude the folder name + how it's deployed.
Items 1–7 get derived from the code; you only confirm the deployed URLs.

## The 8 questions per module

1. **Tech stack ("text tags")** — frontend framework, backend language/framework, database.
2. **Front ↔ back wiring** — one origin (backend serves the built frontend) or two
   ports? Any `/api` prefix, proxy, or nginx in between?
3. **Admin page URL** — the exact deployed address of the admin page
   (`http://IP:PORT/path`). This is what the hub iframes.
4. **Admin auth** — does the admin page have its own login? What kind
   (password / JWT / session cookie)?
5. **Health URL** — any GET endpoint returning 2xx without auth. If none exists,
   the project session adds `GET /health` → `200 {"status":"ok"}`.
6. **Frame headers** — does anything send `X-Frame-Options` or a CSP
   `frame-ancestors` (helmet defaults, nginx `add_header`, Django's
   `XFrameOptionsMiddleware` — Django blocks framing BY DEFAULT)? Must allow the
   hub's origin.
7. **Embed mode** — can the project hide its own sidebar/topbar when loaded with
   `?embed=1` or inside an iframe? If the code can't be edited (third-party),
   say so — the hub falls back to its "open in new tab" button.
8. **Runtime** — which server it runs on, port, process manager
   (PM2 / Docker / systemd), so the URLs stay stable.

## Report-back format (one block per module)

```
MODULE: <name>
stack: <frontend> + <backend> + <db>
wiring: <one origin :PORT | front :A / back :B>
adminUrl: http://<ip>:<port>/<path>
auth: <own login? type>
healthUrl: http://<ip>:<port>/<path>
frame headers: <none | which, where>
embed mode: <done | will add | impossible (third-party)>
runtime: <server, PM2/docker, port>
```

## Current status per module

| Module | Known so far | Still needed |
|---|---|---|
| CODERUNNER | Full stack known (Next.js + Express API + runner, MongoDB+Redis, PM2+nginx). Briefed in `CODE-RUNNER-INTEGRATION.md` | Server IP; how the web app runs in prod (port 8080 vs 3000, no PM2 entry); nginx X-Frame-Options removal; metrics endpoint fix |
| STUDENT-FEEDBACK | Nothing | Everything (or repo folder) — also confirm it's separate from 3D-VIEWER's voting |
| 3D-VIEWER (PROTOVIEW) | Full stack known (Vite/React + Express + MongoDB Atlas, single origin :4000). Briefed in `PROTOVIEW-INTEGRATION.md` | Server IP; `GET /health`; embed mode |
| QC AGENT | Nothing | Everything (or repo folder) |
| SYNC FLOW | Nothing | Everything (or repo folder) |
| TIMESHEET | Nothing | Everything (or repo folder) |
| HORILLA | Third-party Django HRMS. Django sends `X-Frame-Options: DENY` by default → iframe will be blank until its settings allow the hub | Where it's hosted (IP:port); self-hosted & editable? If not editable → new-tab mode |
| WEBSITE | Nothing | What "admin" means here (CMS like WordPress wp-admin? custom?) + URL |
