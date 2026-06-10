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
- `HUB_SSO_SECRET` — only needed once modules opt into SSO (`"sso": true` in
  projects.json). Generate like SESSION_SECRET and set the SAME value in each
  sso-enabled module's environment.

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
