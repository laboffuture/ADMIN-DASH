# assembly/ — project blueprints for the LOF fleet

One file = one future project, **self-contained and very detailed**. This is the
assembly area: when a project starts, copy its file into the new empty repo
(as `BLUEPRINT.md`), open a Claude session there, and say *"read BLUEPRINT.md
and build Phase 1, TDD."* Everything the session needs is inside the file —
architecture, data model, API, hub contract, style, build order.

Researched 2026-06-11 against current industry patterns (sources cited inside
each file). Registered in the hub's `projects.json` as placeholders already.

| Blueprint | Hub id | Suggested port | One line |
|---|---|---|---|
| `TECH-RADAR.md` | `tech-radar` | 5607 | daily global tech brief, Claude-summarized |
| `SOCIAL-PULSE.md` | `social-pulse` | 5606 | AI agents run social media, humans approve |
| `NORTH-STAR.md` | `north-star` | 5601 | OKRs/KPIs scoreboard, numbers pull themselves |
| `LEDGER.md` | `ledger` | 5602 | money in one view — AED/INR/USD, burn, runway |
| `STUDENT-360.md` | `student-360` | 5603 | every student across all products |
| `BOARDROOM.md` | `boardroom` | 5604 | investor updates + decision log |
| `PAPER-TRAIL.md` | `paper-trail` | 5605 | license/visa/contract expiry radar |

Ports are reserved here so fleet services never collide
(hub :5500 · PROTOVIEW :4000 · QC AGENT :8000 · this block :5601–5607).

## Fleet standards (every blueprint follows these)

- **Stack:** Vite + React 18 frontend · Express (Node 18+) or FastAPI backend ·
  SQLite (`better-sqlite3`) — no heavier infra unless the file says so.
- **Style:** the LOF style gate — white surfaces, 2px `#e5e7eb` borders, page
  bg `#F2F2F2`, Orbitron/Rajdhani/Fira Code, radius-16 cards, chips = 10% fill
  + 20% ring, module accent from `projects.json`. Copy the variable block from
  ADMIN-LINK `client/src/styles.css` and change `--brand` to the module accent.
- **TDD:** Vitest (+ Supertest server-side, Testing Library client-side); no
  production code without a failing test first — same as the hub.
- **Deploy:** one PM2 process on the LOF VPS, listening on the reserved port.
- **Hub contract** (ADMIN-LINK `ARCHITECTURE.md` §3): allow framing, support
  `?embed=1` (hide own chrome), no-auth `GET /health`, optional `GET /stats`
  (3–5 headline numbers for the hub card), optional `POST /auth/hub-sso`
  (verify HS256 `HUB_SSO_SECRET`, `aud` = hub id, `sub=hub-admin`, 60s TTL).
- When live: fill `adminUrl` + `healthUrl` in the hub's `projects.json` — the
  card goes green, no hub code changes.
