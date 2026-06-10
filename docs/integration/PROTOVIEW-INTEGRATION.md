# PROTOVIEW (3dviewer) — ADMIN-LINK module integration brief

Paste this into the Claude session working in the 3dviewer repo.

---

This project is becoming a module of ADMIN-LINK, a central admin hub that displays
this app's existing admin pages inside an iframe at the hub. Nothing is rebuilt —
implement only the module contract below.

## Tasks

1. **Embedded mode (required).** When the admin UI is displayed inside the hub's
   iframe, hide the app's own global chrome — the PROTOVIEW topbar/sidebar in
   `client/src/components/AdminLayout.jsx` — and render only the page content,
   so the hub doesn't show nav-inside-nav.
   - Detection: `window.self !== window.top` (robust across client-side route
     changes), plus support `?embed=1` as an explicit override for testing in a
     normal browser tab.
   - The admin login page still shows its password form when embedded (the hub does
     not handle this app's auth) — just without redundant branding.
   - Everything must look/work unchanged when NOT embedded.

2. **Health endpoint (recommended).** Add `GET /health` to the Express server
   returning `200 {"status":"ok"}` (no auth). The hub pings it every 30s for the
   online/offline dot.

3. **Never block framing (constraint, ongoing).** Do not add `X-Frame-Options`
   or a restrictive CSP `frame-ancestors` (e.g. via helmet defaults). If security
   headers are added later, use `Content-Security-Policy: frame-ancestors 'self' <HUB-ORIGIN>`.

## Report back (needed for the hub's registry)

- Deployed admin page URL (e.g. `http://<server-ip>:<port>/admin`)
- Health URL (e.g. `http://<server-ip>:4000/health`)

## Acceptance check

Create `test-embed.html` with
`<iframe src="http://localhost:<port>/admin?embed=1" style="width:100%;height:90vh">`
and open it: the admin page renders inside the frame with no PROTOVIEW
topbar/sidebar; opening `/admin` directly in a tab still shows the full chrome.
