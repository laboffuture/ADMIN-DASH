# STUDENT 360 — build blueprint

> **How to use this file:** copy it into the new project's empty repo as
> `BLUEPRINT.md`, open a Claude session there, and say *"read BLUEPRINT.md and
> build Phase 1, TDD."* It is self-contained.

| | |
|---|---|
| Hub id / name | `student-360` / **STUDENT 360** |
| Accent | `#0891B2` (cyan) |
| Reserved port | **5603** on the LOF VPS |
| Stack | Express (Node 18+, CJS) + better-sqlite3 · Vite + React 18 |
| One line | Every student across every LOF product — engagement, outcomes, at-risk alerts |

## 1. What this is

The EdTech question behind all others: **are students actually engaged and
succeeding?** Today the answer is split across CODERUNNER (missions),
3D-VIEWER (votes), STUDENT-FEEDBACK (class ratings) — nobody sees one student,
one cohort, one school whole.

Architecture follows the learning-analytics industry pattern (EDUCAUSE
"360-degree view", xAPI/LRS): **one central store of learning events** in
actor–verb–object form, fed by every product, with dashboards and early-alert
logic on top. Key best practice adopted: **keep analytics separate from the
products' transactional databases** — products expose read APIs; STUDENT 360
pulls nightly and never writes back.

We adopt the xAPI *shape* without running a heavyweight LRS (Learning Locker
etc. is overkill at LOF scale) — a SQLite `events` table with xAPI-style
columns is queryable, portable, and exportable to a real LRS later.

## 2. Architecture

```
┌──────────────────────────── student-360 (one PM2 process, :5603) ───────────────────────┐
│  Express API ── better-sqlite3 (s360.db, WAL)                                            │
│     ├─ connectors/ (nightly cron, one file per product, idempotent upserts)              │
│     │     coderunner.js   → missions run / passed / failed per student                   │
│     │     viewer.js       → models viewed, votes cast                                    │
│     │     feedback.js     → class ratings (smile / hand-gesture stars)                   │
│     ├─ identity.js  roster: per-product external ids → one canonical student             │
│     ├─ rollup.js    nightly daily_rollups + engagement score + at-risk alerts            │
│     └─ serves client/dist                                                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ iframe (?embed=1) from hub :5500     ▼ read-only product APIs (API keys in env)
```

## 3. Data model (SQLite DDL)

```sql
CREATE TABLE schools  (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
CREATE TABLE students (
  id INTEGER PRIMARY KEY, full_name TEXT NOT NULL,
  school_id INTEGER REFERENCES schools(id), cohort TEXT,          -- '2026-grade-8A'
  external_ids TEXT NOT NULL DEFAULT '{}');  -- {"coderunner":"u_91","feedback":"S-204"}

CREATE TABLE events (                        -- xAPI-shaped: actor–verb–object
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  product TEXT NOT NULL,                     -- 'coderunner' | '3d-viewer' | 'student-feedback'
  verb TEXT NOT NULL,                        -- 'launched','completed','passed','failed','voted','rated'
  object TEXT NOT NULL,                      -- mission/model/class identifier
  score REAL,                                -- pass %, stars, …
  occurred_at TEXT NOT NULL,
  source_key TEXT NOT NULL UNIQUE,           -- product:event-id → idempotent re-pulls
  raw TEXT);                                 -- original JSON, audit/debug

CREATE TABLE daily_rollups (                 -- fast charts; rebuilt nightly
  student_id INTEGER NOT NULL, day TEXT NOT NULL, product TEXT NOT NULL,
  events_count INTEGER NOT NULL, score_avg REAL,
  PRIMARY KEY (student_id, day, product));

CREATE TABLE alerts (
  id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id),
  kind TEXT NOT NULL,                        -- 'disengaged-14d' | 'score-drop' | 'never-started'
  detail TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), resolved_at TEXT);
```

**Engagement score** (0–100, in `rollup.js`, pure + unit-tested): recency ×
frequency — weighted events over trailing 28 days with exponential decay
(half-life 7 days), normalized per cohort. At-risk rules: no events in 14 days
(`disengaged-14d`), score_avg drop >30% vs prior 4-week window (`score-drop`).

## 4. Connector contract (what each product must expose)

One read-only endpoint per product — same spirit as the hub's `/stats`:

```
GET /api/export/activity?since=<ISO>&key=<API_KEY>
→ [{ externalId, fullName?, school?, verb, object, score?, occurredAt, eventId }]
```

Paged by `since`; `eventId` unique per product (feeds `source_key`). Add this
endpoint to each product repo via its own Claude session — it's ~30 lines each.

## 5. API

```
GET  /health                    → 200 (no auth — hub poller)
GET  /stats                     → {students, activeThisWeek, atRisk, avgEngagement} (hub cards)
POST /auth/hub-sso {token}      → verify HS256(HUB_SSO_SECRET, aud:'student-360')
GET  /api/cohorts               → cohort grid data (engagement heatmap)
GET  /api/students/:id          → profile: timeline of events, per-product charts, alerts
GET  /api/schools/:id           → school rollup, cohort comparison
GET  /api/alerts?open=1         → at-risk list
POST /api/alerts/:id/resolve
CRUD /api/students · /api/schools  (+ CSV roster import with external-id mapping)
```

## 6. UI

- **Cohort grid** (default): rows = students, columns = last 8 weeks,
  cells = engagement heat (white → accent); summary chips ACTIVE / QUIET / AT RISK.
- **Student profile**: event timeline (Fira Code), per-product sparklines,
  open alerts banner.
- **School view**: cohort comparison bars, "most/least engaged" lists.
- **At-risk inbox**: sorted by days silent; resolve button writes a note.
- LOF style gate (`--brand:#0891B2`), `?embed=1` supported.

## 7. Build order (TDD each phase)

1. **Schema + identity + engagement math**: roster import, score function,
   rollup builder — pure logic first, exhaustive tests.
2. **CODERUNNER connector** (first real data) + cohort grid + student profile.
3. **Alerts**: rules, inbox, resolve flow.
4. **Hub wiring**: /health, /stats, ?embed=1, hub-sso; adminUrl into hub.
5. **More connectors** as products grow the export endpoint (3D-VIEWER,
   STUDENT-FEEDBACK); each is its own small phase.
6. *(later)* xAPI export (real LRS compatibility), Claude weekly cohort
   narrative ("8A is slipping, 7B doubled output").

## 8. Env

```
PORT=5603  ADMIN_PASSWORD=…  SESSION_SECRET=…  HUB_SSO_SECRET=…  DB_PATH=./s360.db
CODERUNNER_EXPORT_URL=…  CODERUNNER_API_KEY=…   (one pair per connector)
```
Minors' data → repo private, DB backed up, names only (no contact details),
masked exports.

## 9. Sources

- [EDUCAUSE — NGDLE learning analytics, 360° view](https://er.educause.edu/blogs/2018/1/ngdle-learning-analytics-gaining-a-360-degree-view-of-learning)
- [Lambda Solutions — xAPI & LRS explained](https://www.lambdasolutions.net/en/blog/learning-analytics-what-is-xapi-and-lrs-how-do-they-support-data-analytics-reporting)
- [Gloobia — LRS & student progress tracking](https://gloobia.com/learning-record-stores-explained-xapi-student-tracking/)
- [MindK — custom LMS reporting architecture](https://www.mindk.com/blog/lms-reporting-and-analytics/)
- [Aristek — K-12 LMS analytics dashboards](https://aristeksystems.com/blog/best-dashboards-analytics-in-academic-lms/)
