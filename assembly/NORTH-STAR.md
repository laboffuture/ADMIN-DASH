# NORTH STAR — build blueprint

> **How to use this file:** copy it into the new project's empty repo as
> `BLUEPRINT.md`, open a Claude session there, and say *"read BLUEPRINT.md and
> build Phase 1, TDD."* It is self-contained.

| | |
|---|---|
| Hub id / name | `north-star` / **NORTH STAR** |
| Accent | `#4F46E5` (indigo) |
| Reserved port | **5601** on the LOF VPS |
| Stack | Express (Node 18+, CJS) + better-sqlite3 · Vite + React 18 |
| One line | The company scoreboard: OKRs & KPIs whose numbers update themselves |

## 1. What this is

Are we winning? NORTH STAR holds the company's objectives per quarter, each
with 2–4 measurable key results. Industry practice (Atlassian, Asana, Quantive
guides): keep **3–5 objectives per cycle**, each KR quantifiable, progress
updated **weekly** via check-ins, everything in one shared system — never
scattered spreadsheets.

The LOF twist: a key result can be **live** — wired to another module's
`/stats` endpoint (e.g. "500 CODERUNNER runs/week") so the scoreboard updates
itself nightly. Manual KRs get a weekly check-in drawer.

## 2. Architecture

```
┌────────────────────────── north-star (one PM2 process, :5601) ─────────────────────────┐
│  Express API ── better-sqlite3 (north-star.db)                                          │
│     │                                                                                   │
│     ├─ collector (cron, nightly): for each KR with source_url →                         │
│     │    GET module /stats → pluck source_path (dot-path) → INSERT auto check-in        │
│     │                                                                                   │
│     └─ serves client/dist (Vite build)                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ iframe (?embed=1)                       │ GET /stats of coderunner, ledger, …
   ADMIN-LINK hub :5500                           ▼ (same /stats contract the hub uses)
```

## 3. Data model (SQLite DDL)

```sql
CREATE TABLE cycles (         -- one row per quarter: "2026-Q3"
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  starts_on TEXT NOT NULL, ends_on TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','closed')));

CREATE TABLE objectives (
  id INTEGER PRIMARY KEY, cycle_id INTEGER NOT NULL REFERENCES cycles(id),
  title TEXT NOT NULL, owner TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0);

CREATE TABLE key_results (
  id INTEGER PRIMARY KEY, objective_id INTEGER NOT NULL REFERENCES objectives(id),
  title TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',           -- '%', 'students', 'AED'…
  start_value REAL NOT NULL DEFAULT 0,
  target_value REAL NOT NULL,
  weight REAL NOT NULL DEFAULT 1,          -- weighted progress (Quantive pattern)
  source_url TEXT,                         -- live KR: e.g. http://127.0.0.1:5500/api/… or module /stats
  source_path TEXT);                       -- dot-path into the JSON: "week.runs"

CREATE TABLE checkins (
  id INTEGER PRIMARY KEY, key_result_id INTEGER NOT NULL REFERENCES key_results(id),
  value REAL NOT NULL,
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 10),  -- null for auto
  note TEXT, source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
```

Computed (in code, tested):
- KR progress = clamp((latest − start) / (target − start), 0, 1)
- Objective progress = Σ(KR progress × weight) / Σ(weight)
- Health from latest manual confidence: ≥7 `on-track`, 4–6 `at-risk`, ≤3
  `off-track`, no check-in 14d → `stale`.

## 4. API

```
GET  /health                       → 200 {ok:true}            (no auth — hub poller)
GET  /stats                        → {cycle:"2026-Q3", progress:0.62,
                                      onTrack:4, atRisk:2, offTrack:1}   (no auth — hub cards)
POST /auth/hub-sso {token}         → verify HS256(HUB_SSO_SECRET, aud:'north-star') → set session
GET  /api/scoreboard?cycle=        → full computed tree (objectives→KRs→latest+sparkline)
POST /api/checkins {krId,value,confidence,note}
CRUD /api/cycles · /api/objectives · /api/key-results   (admin session only)
```

## 5. UI

- **Scoreboard** (default): objective rows with thick progress bars, owner
  chip, health dot per KR, weighted % per objective; cycle switcher top-right.
- **Check-in drawer**: click a KR → value + confidence slider (0–10) + note;
  shows 12-week sparkline of past check-ins.
- **Live KR badge**: ⚡ icon when source_url set; shows "auto, updated nightly".
- LOF style gate: copy the `:root` variable block from ADMIN-LINK
  `client/src/styles.css`, set `--brand:#4F46E5`. Support `?embed=1` → hide
  the app's own header (hub provides chrome).

## 6. Build order (TDD each phase)

1. **Core math + schema**: cycles/objectives/KRs/check-ins; progress & health
   functions (pure, heavily unit-tested); scoreboard API; minimal UI list.
2. **Check-in flow**: drawer, sparkline, stale detection.
3. **Live KRs**: nightly collector with dot-path plucking + last-good keep
   (copy the hub's `rates.js` resilience pattern); ⚡ badges.
4. **Hub wiring**: /health, /stats, ?embed=1, hub-sso; fill `adminUrl` in the
   hub's projects.json.
5. *(later)* Friday Claude digest: "what moved this week" → hub postMessage.

## 7. Env

```
PORT=5601  ADMIN_PASSWORD=…  SESSION_SECRET=…  HUB_SSO_SECRET=…  DB_PATH=./north-star.db
```

## 8. Sources

- [Atlassian — OKR guide](https://www.atlassian.com/agile/agile-at-scale/okr)
- [Quantive — OKR tracking best practices](https://quantive.com/resources/articles/okr-tracking)
- [Businessmap — weighted KRs & tracking](https://businessmap.io/okr-resources/okr/tracking)
- [Asana — setting OKRs (3–5 objectives, 2–4 KRs)](https://asana.com/resources/setting-okrs)
- [IBM — implementing OKRs step-by-step](https://www.ibm.com/think/topics/okr-implementation)
