# Code Runner — ADMIN-LINK module integration brief

Paste this into the Claude session working in the code-runner-production repo.

---

This project is becoming a module of ADMIN-LINK, a central admin hub that displays
this app's existing admin pages inside an iframe at the hub. Nothing is rebuilt —
implement only the module contract below.

## Tasks

1. **Embedded mode — likely already satisfied, verify.** `apps/web/src/app/admin/layout.tsx`
   is a pass-through (no site-wide nav/branding around admin pages), so the
   monitoring dashboard at `/admin/monitoring` should already render chrome-free
   inside an iframe. Verify with the acceptance check below; only if some global
   chrome appears, hide it when `window.self !== window.top` (small client
   component) or `?embed=1` is present.

2. **Remove the frame-blocking nginx header (required before web goes behind nginx).**
   `nginx.conf` line 21 sets `add_header X-Frame-Options "SAMEORIGIN" always;`.
   Today that block only serves `/api/` and `/health` (`location /` returns 404),
   so the admin page isn't affected yet — but the moment the web app is routed
   through this nginx, the hub's iframe goes blank. Remove that line, or replace
   with `Content-Security-Policy: frame-ancestors 'self' <HUB-ORIGIN>` on the
   admin routes. Same rule for `next.config`/middleware: never add `X-Frame-Options`.

3. **Fix the monitoring page's data source (required for live stats).**
   `apps/web/src/app/admin/monitoring/page.tsx` fetches `/api/admin/metrics`
   (marked `// TODO: Replace with actual API endpoint`) — that route does not
   exist. The API actually exposes `GET /health/metrics` (`apps/api/src/index.ts`,
   ~line 156). Point the page at the real endpoint (via the nginx `/api/` rewrite
   that strips the prefix, `/api/health/metrics` → API `/health/metrics`), so the
   dashboard shows real numbers instead of erroring.

4. **Health endpoints — already done.** `apps/web` serves `/api/health` and the
   API serves `/health`; the hub will use the web's `/api/health` (checks the app
   that actually serves the admin UI). No work needed unless those are removed.

## Report back (needed for the hub's registry)

- How the web app is served in production (PM2 `next start` on the VPS? Railway?)
  and its final URL — note `start:prod` defaults to port **8080**, `start`/`dev`
  to **3000**, and `ecosystem.config.js` currently has no web process at all.
- Deployed admin page URL (e.g. `http://<server-ip>:8080/admin/monitoring`)
- Health URL (e.g. `http://<server-ip>:8080/api/health`)

## Acceptance check

Create `test-embed.html` with
`<iframe src="http://localhost:3000/admin/monitoring?embed=1" style="width:100%;height:90vh">`
and open it: the monitoring dashboard renders inside the frame with no site-wide
chrome; opening the URL directly in a tab still shows the normal page.
