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
