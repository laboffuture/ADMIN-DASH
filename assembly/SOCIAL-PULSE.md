# SOCIAL PULSE — build blueprint

> **How to use this file:** copy it into the new project's empty repo as
> `BLUEPRINT.md`, open a Claude session there, and say *"read BLUEPRINT.md and
> build Phase 1, TDD."* It is self-contained.

| | |
|---|---|
| Hub id / name | `social-pulse` / **SOCIAL PULSE** |
| Accent | `#C026D3` (fuchsia) |
| Reserved port | **5606** on the LOF VPS |
| Stack | Express (Node 18+, CJS) + better-sqlite3 · Vite + React 18 · Claude API |
| One line | AI agents draft & track LOF's social media — a human approves every post |

## 1. What this is

Agents do the work, humans keep the keys. 2026 industry consensus on agentic
social pipelines (admove, Fastio, Zapier guides) is a **modular four-stage
pipeline — Research → Draft → Review → Publish** — where AI handles perception
(monitoring, research), reasoning (drafting, adapting per platform), and action
(scheduling, posting), while humans own creative direction and **final
approval**. The single most important safety pattern: a **human-in-the-loop
approval queue** so unreviewed AI content can never go live.

**The iron rule of this app: no post reaches a platform without a human
clicking APPROVE.** That is enforced in the state machine, not the UI.

## 2. Architecture

```
┌──────────────────────────── social-pulse (one PM2 process, :5606) ──────────────────────┐
│  Express API ── better-sqlite3 (pulse.db)                                                │
│   ├─ agents/                                                                             │
│   │   research.js  daily: TECH RADAR items (:5607) + LOF milestones + content calendar   │
│   │   drafter.js   Claude API: idea → per-platform variants (tone file, banned topics)   │
│   │   analyst.js   nightly: pull per-post metrics back from platforms                    │
│   ├─ pipeline.js   THE state machine:                                                    │
│   │     draft → pending_review → approved → scheduled → posted                           │
│   │                    └→ rejected (with reviewer note → drafter learns)                 │
│   ├─ publisher.js  workers per platform; only consumes status='approved'                 │
│   │     linkedin.js · instagram.js (Meta Graph) · x.js                                   │
│   └─ serves client/dist                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ iframe (?embed=1) from hub :5500     ▼ platform APIs (tokens in env, never in DB)
```

Platform reality check (2026): Instagram/Facebook = Meta Graph API (business
account required); X = paid API tier; LinkedIn = Community Management API
(approval process). **MVP works without any of them**: draft → approve →
"copy & open composer" assisted posting; real API publishers come per-platform
in later phases. Buffer's API is an optional shortcut for scheduling.

## 3. Data model (SQLite DDL)

```sql
CREATE TABLE campaigns (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  theme TEXT, starts_on TEXT, ends_on TEXT, active INTEGER DEFAULT 1);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY, campaign_id INTEGER REFERENCES campaigns(id),
  platform TEXT NOT NULL CHECK (platform IN ('linkedin','instagram','x')),
  body TEXT NOT NULL, media_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN
    ('draft','pending_review','approved','rejected','scheduled','posted','failed')),
  scheduled_for TEXT, posted_at TEXT,
  external_id TEXT,                 -- platform's post id once live
  source_idea TEXT,                 -- what the research agent saw
  model_meta TEXT,                  -- model, prompt version, tokens
  created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE reviews (id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id),
  reviewer TEXT NOT NULL, verdict TEXT NOT NULL CHECK (verdict IN ('approve','reject')),
  note TEXT, at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE metrics (post_id INTEGER NOT NULL REFERENCES posts(id),
  fetched_at TEXT NOT NULL, impressions INTEGER, likes INTEGER,
  comments INTEGER, shares INTEGER, PRIMARY KEY (post_id, fetched_at));

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);  -- tone, banned_topics, cadence
```

State machine invariants (the most-tested code in the repo):
- only `pending_review → approved` exists, and only via a review row —
  **no code path sets approved otherwise**;
- publisher refuses any post whose latest review isn't `approve`;
- `rejected` posts keep the note (future fine-tuning of the drafter prompt);
- escalation guard: drafts touching banned topics (settings list) are tagged
  `needs-care` and pinned top of review.

## 4. Claude drafting

`drafter.js` prompt contract: tone file (settings) + platform constraints
(length, hashtags, emoji policy per platform) + the idea + 2 recent approved
posts as style examples → returns 2 variants per platform. Temperature low;
banned-topics list re-checked on output (belt and braces). Model:
`claude-fable-5`; record tokens in `model_meta` (LEDGER will want cost later).

## 5. API

```
GET  /health                  → 200 (no auth — hub poller)
GET  /stats                   → {pendingReview, scheduledThisWeek, postedThisWeek, reach7d}
POST /auth/hub-sso {token}    → verify HS256(HUB_SSO_SECRET, aud:'social-pulse')
POST /api/ideas {text}        → manual idea → drafter → pending_review posts
POST /api/posts/:id/review {verdict, note}
POST /api/posts/:id/schedule {when} · POST /api/posts/:id/mark-posted {externalId}
GET  /api/board               → kanban data · GET /api/calendar?month=
GET  /api/posts/:id/metrics   → engagement series
CRUD /api/campaigns · GET|PUT /api/settings
```

## 6. UI

- **Kanban board** (default): DRAFT → REVIEW → SCHEDULED → POSTED columns;
  review cards show platform chip, body preview, `needs-care` flag; approve /
  reject (note required on reject) right on the card.
- **Calendar**: month grid of scheduled/posted, drag to reschedule.
- **Post detail**: variants side-by-side, metrics sparkline once posted.
- **Settings**: tone editor, banned topics, weekly cadence per platform.
- Hub toast on new drafts: `postMessage({type:'notify', text:'3 posts await review'})`.
- LOF style gate (`--brand:#C026D3`), `?embed=1` supported.

## 7. Build order (TDD each phase)

1. **Pipeline core**: schema + state machine with its invariants (pure,
   exhaustive tests — this is the safety) + kanban UI + manual posts.
2. **Drafter**: Claude integration, settings, variants, needs-care guard.
3. **Research agent**: TECH RADAR feed + calendar themes → daily idea batch.
4. **Assisted publishing**: schedule, copy-and-open-composer flow, mark-posted,
   manual metrics entry.
5. **Hub wiring**: /health, /stats, ?embed=1, hub-sso, review toasts.
6. **Real publishers** (each its own phase): Meta Graph → LinkedIn → X;
   analyst.js metric pulls.

## 8. Env

```
PORT=5606  ADMIN_PASSWORD=…  SESSION_SECRET=…  HUB_SSO_SECRET=…  DB_PATH=./pulse.db
ANTHROPIC_API_KEY=…  TECH_RADAR_URL=http://127.0.0.1:5607
META_GRAPH_TOKEN=…  LINKEDIN_TOKEN=…  X_API_KEY=…        (each optional until its phase)
```

## 9. Sources

- [admove.ai — AI agents for social media, 2026 guide](https://www.admove.ai/blog/ai-agents-for-social-media-guide)
- [Fastio — AI agent social automation 2026](https://fast.io/resources/ai-agent-social-media-automation/)
- [Acrid Automation — human-in-the-loop approval pipeline](https://acridautomation.com/learn/how-to-automate-social-media-ai/)
- [Zapier — AI social media tools 2026](https://zapier.com/blog/best-ai-social-media-management/)
- [Marketing Agent — AI social strategy 2026](https://marketingagent.blog/2026/03/24/how-to-build-an-ai-powered-social-media-strategy-for-business-in-2026/)
