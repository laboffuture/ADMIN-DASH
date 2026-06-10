# Code Runner — ADMIN-LINK module integration brief

Paste this into the Claude session working in the code-runner-production repo.

---

This project is becoming a module of ADMIN-LINK, a central admin hub that displays
this app's existing admin pages inside an iframe at the hub. Nothing is rebuilt —
implement only the module contract below.

## Tasks

1. **Embedded mode (required).** When the admin UI (`apps/web/src/app/admin/`,
   currently the monitoring dashboard at `/admin/monitoring`) is displayed inside
   the hub's iframe, hide the app's own global chrome (any site-wide nav/branding
   rendered around admin pages, see `apps/web/src/app/admin/layout.tsx`) and render
   only the dashboard content.
   - Detection: `window.self !== window.top` (needs a small client component since
     this is Next.js App Router), plus support `?embed=1` as an explicit override
     for testing in a normal tab.
   - Everything must look/work unchanged when NOT embedded.

2. **Never block framing (constraint, ongoing).** Do not add `X-Frame-Options`
   or restrictive CSP `frame-ancestors` — neither in `next.config`, middleware,
   nor the deployed `nginx.conf` (currently clean, keep it that way). If security
   headers are added later, use
   `Content-Security-Policy: frame-ancestors 'self' <HUB-ORIGIN>`.

3. **Health endpoints — already done.** `apps/web` already serves `/api/health`
   and the API serves `/health`; the hub will use `/api/health` (checks the app
   that actually serves the admin UI). No work needed unless those are removed.

## Report back (needed for the hub's registry)

- Deployed admin page URL (e.g. `http://<server-ip>:3000/admin/monitoring`)
- Health URL (e.g. `http://<server-ip>:3000/api/health`)

## Acceptance check

Create `test-embed.html` with
`<iframe src="http://localhost:3000/admin/monitoring?embed=1" style="width:100%;height:90vh">`
and open it: the monitoring dashboard renders inside the frame with no site-wide
chrome; opening the URL directly in a tab still shows the normal page.
