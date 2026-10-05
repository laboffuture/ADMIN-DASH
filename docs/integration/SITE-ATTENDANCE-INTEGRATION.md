# SITE ATTENDANCE (TRGBI) — ADMIN-DASH module integration brief

Paste this into the Claude session working in the siteattendance repo.

---

This project is becoming a module of ADMIN-DASH, a central admin hub that displays
this app's existing admin pages inside an iframe at the hub. Nothing is rebuilt —
implement only the module contract below.

The hub already lists this module and polls `/healthz` successfully. The only
thing blocking the embed is the framing headers.

## 1. Allow the hub to frame this app (required)

The app currently sends both of these, and a browser refuses the frame on either:

```
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: … frame-ancestors 'self' …
```

**These come from Helmet, not nginx.** The response also carries
`X-DNS-Prefetch-Control: off`, `X-Download-Options: noopen`,
`Origin-Agent-Cluster: ?1` and `Referrer-Policy: no-referrer` — Helmet's default
set. Searching the nginx config for `X-Frame-Options` will turn up nothing.

Find the `app.use(helmet(...))` call and change it to:

```js
const HUB_ORIGINS = ['https://<the-hub-origin>'];   // add 'http://localhost:5173' for local testing

app.use(helmet({
  // drop X-Frame-Options entirely — it has no origin allowlist, so it cannot
  // express "this one other host may frame me". frame-ancestors replaces it.
  frameguard: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      // …keep every existing directive as-is…
      frameAncestors: ["'self'", ...HUB_ORIGINS],
    },
  },
}));
```

Both changes are needed. Removing `X-Frame-Options` alone still leaves
`frame-ancestors 'self'` blocking; widening `frame-ancestors` alone still leaves
`X-Frame-Options` blocking in browsers that honour it.

Verify from any machine — neither header should block the hub's origin:

```bash
curl -sI https://siteattendance.toprockglobal.com/dashboard \
  | grep -iE 'x-frame-options|frame-ancestors'
```

## 2. Embedded mode (recommended)

When shown inside the hub's iframe, hide this app's own global chrome — top nav
and sidebar — and render only the page content, so the hub doesn't show
nav-inside-nav.

- Detection: `window.self !== window.top`, plus `?embed=1` as an explicit
  override for testing in a normal tab. The hub always appends `?embed=1`.
- The sign-in page still shows its own form when embedded — the hub does not
  handle this app's auth.
- Everything must look and work unchanged when NOT embedded.

## 3. Cookies (only if sign-in fails inside the frame)

A session cookie sent as `SameSite=Lax` or `Strict` is not returned on requests
made from inside a cross-site iframe, so sign-in appears to silently fail. If
that happens, the session cookie needs `SameSite=None; Secure`.

## Notes

- `/healthz` returns `{"status":"ok","dbReady":true}` — already correct, leave it.
- The hub reads `adminUrl` as `/dashboard` and `healthUrl` as `/healthz`.
- No SSO: this app keeps its own login. The hub does not mint tokens for it.

## Hub side, once this is done

Set `"embed": true` in the hub's `projects.json` entry for `site-attendance`
(or delete the line — framing is the default). No rebuild; the registry re-reads
the file on every request.
