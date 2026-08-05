# ADMIN-LINK backlog — CEO-dashboard upgrades

Ideas approved for the checklist on 2026-06-10, tiered by effort→payoff.
Theme: the hub already sees everything — these make it *say* something
(status → numbers → alerts → briefs → decisions).

## Tier 1 — cheap on current architecture, daily payoff
1. **Live stats on cards** — each module adds a tiny `/stats` endpoint (3–5
   numbers); overview cards show them under the dot (runs today, pass %, avg ★).
2. **Alerts that find you** — poller fires Telegram/email on status flips and
   stat thresholds; no more discovering outages by opening the dashboard.
3. **24h sparklines** — persist poll history; per-card uptime/latency strip with
   downtime ranges ("down 02:10–02:24").

## Tier 2 — productivity multipliers
4. **Morning Brief** — 8am Claude-written 5-line digest of overnight stats +
   alerts, in-hub and pushed to phone.
5. **Approvals inbox** — pending human decisions from all modules (Horilla
   leave, QC verdicts, sign-offs) in one inbox with approve/reject callbacks.
6. **Ctrl+K switcher** — command palette + number keys 1–8 for instant module
   jumps.

## Tier 3 — showpieces
7. **Ask-the-company chat** — Claude Q&A over module stats APIs ("how many
   students this week and what did they rate us?").
   *Started 2026-06-11 as CLAWD (`agent/ARCHITECTURE.md`): in-portal agent
   answering status/rates; module-stats answers land with item 1's `/stats`.*
8. **Wallboard mode** — `?kiosk=1` fullscreen rotating read-only status for the
   office TV.
9. **Weekly trends report** — Monday auto-generated week-over-week PDF/email.
10. **Hub SSO** — phase-2 signed-token exchange (spec §3): one login unlocks
    every module inside the frames.
    *Hub half: done and verified 2026-08-05 — `/api/sso-token/coderunner` mints
    a valid HS256 token (`sub=hub-admin`, `aud=coderunner`, 60s) and the frame
    URL carries it. CODERUNNER's half is unfinished, two pieces:*
    - **API** (`Coderunner-Backend`, this VPS): `POST /auth/sso/hub` is deployed
      but answers `503 "Hub SSO is not configured"` — `HUB_SSO_SECRET` (same
      value as the hub's `.env`) and `HUB_SSO_AUDIENCE=coderunner` are missing
      from the pm2 env. Note the audience is `coderunner`, not the `code-runner`
      shown in `apps/api/.env.example`; it must equal the token's `aud`
      byte-for-byte. `HUB_SSO_USERNAME` must name an account whose role is
      `admin` — `/oversight/*` is gated by `requireRole="admin"`.
    - **Frontend** (`Coderunner-Frontend`, Railway): no `hub_token` handling
      exists at all, and `ProtectedRoute.tsx:28` redirects with
      `router.push('/login')`, dropping the query string — so the token must
      first be made to survive that redirect, then consumed on the login page.
    *Until both ship, framing CODERUNNER shows its own login form, which works
    normally (fixed 2026-08-05 — see the CORS/origin warning in ARCHITECTURE §3).*

---

Future **module** projects (registered as placeholders) have detailed,
self-contained build blueprints in **`assembly/`** — one file per project
(SOCIAL PULSE · TECH RADAR · NORTH STAR · LEDGER · STUDENT 360 · BOARDROOM ·
PAPER TRAIL). Quick concept summary: `docs/integration/CEO-MODULES.md`.
