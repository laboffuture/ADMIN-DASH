# TECH RADAR — build blueprint

> **How to use this file:** copy it into the new project's empty repo as
> `BLUEPRINT.md`, open a Claude session there, and say *"read BLUEPRINT.md and
> build Phase 1, TDD."* It is self-contained.

| | |
|---|---|
| Hub id / name | `tech-radar` / **TECH RADAR** |
| Accent | `#CA8A04` (gold) |
| Reserved port | **5607** on the LOF VPS |
| Stack | Express (Node 18+, CJS) + better-sqlite3 · Vite + React 18 · Claude API |
| One line | The world's tech news, Claude-summarized into a 5-minute morning brief |

## 1. What this is

A radar that sweeps the global tech landscape daily and surfaces the blips
that matter — readable in five minutes, archived forever. Claude does the
summarizing; nobody reads forty articles.

The big-tech watchlist keeps the owner's **MANGO** nickname:
**M**eta · **A**pple · **N**vidia · **G**oogle · **O**penAI — with Anthropic,
Microsoft, Amazon, TSMC, ASML riding along even though they're not in the
letters.

### The daily brief — five sections

| Section | Covers | Owner's example |
|---|---|---|
| BIG TECH | MANGO companies: launches, models, org moves | "Claude is developing a new product and they're releasing it" |
| CHIPS | ASML, TSMC, Nvidia supply chain, fabs, export rules | "ASML and TSMC have done something these days" |
| AI RELEASES | New models/products from anyone (incl. Chinese labs) | — |
| IPO WATCH | Upcoming + completed tech IPOs globally | "IPO of all the companies in the global" |
| WORLD | Other countries' breakthroughs, research (BCI etc.) | "through brain cells they have implemented…" |

## 2. Architecture

```
┌──────────────────────────── tech-radar (one PM2 process, :5607) ────────────────────────┐
│  Express API ── better-sqlite3 (radar.db)                                                │
│   ├─ ingest/   (cron 05:30 GST)                                                          │
│   │    rss.js      feeds table → fetch/parse (rss-parser) → items                        │
│   │    hn.js       Hacker News official API front page                                   │
│   │    ipo.js      Finnhub /calendar/ipo (free tier)                                     │
│   │    arxiv.js    arXiv cs.AI RSS                                                       │
│   ├─ dedupe.js  cluster same story: URL canon + title trigram similarity                 │
│   ├─ brief.js   (cron 06:00 GST) Claude: classify items into the 5 sections,             │
│   │             2-line summary each, pick "TOP 5 of the day" → briefs row                │
│   └─ serves client/dist                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ iframe (?embed=1) from hub :5500     ▼ RSS/HN/Finnhub/arXiv (all free, no scraping)
```

## 3. Data model (SQLite DDL)

```sql
CREATE TABLE sources (id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK
   (kind IN ('rss','hn','ipo','arxiv')), url TEXT NOT NULL, name TEXT NOT NULL,
   section_hint TEXT, active INTEGER NOT NULL DEFAULT 1);

CREATE TABLE items (
  id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL REFERENCES sources(id),
  url TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  published_at TEXT, fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  cluster_id INTEGER,                -- same-story grouping
  section TEXT,                      -- filled by Claude: bigtech|chips|ai|ipo|world|skip
  summary TEXT);                     -- 2 lines, filled by Claude

CREATE TABLE briefs (
  day TEXT PRIMARY KEY,              -- '2026-06-12'
  top5 TEXT NOT NULL,                -- JSON [{title,summary,url,section}]
  sections TEXT NOT NULL,            -- JSON {bigtech:[ids], chips:[ids], …}
  tokens_used INTEGER, built_at TEXT NOT NULL);

CREATE TABLE watchlist (ticker TEXT PRIMARY KEY, name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('public','private')));
-- seed: META AAPL NVDA GOOGL MSFT AMZN ASML TSM AMD AVGO INTC (public)
--       OpenAI Anthropic xAI DeepSeek ByteDance (private, news-only)
```

Seed RSS sources: The Verge, TechCrunch, Ars Technica, MIT Tech Review;
company newsrooms (Meta/Google/Nvidia/OpenAI/Anthropic blogs); SCMP Tech +
TechNode (China); ASML & TSMC investor-news feeds.

## 4. The Claude step (brief.js)

One batched call per day, not per item: yesterday's deduped item list (title +
source + first paragraph) → Claude returns per item `{section|skip, summary}`
plus the day's TOP 5 with one-line "why it matters". Rules in the prompt:
factual tone, no hype, keep company names exact, mark paywalled sources.
Budget: ~1 call/day ≈ trivial cost; record `tokens_used` (LEDGER will ask).
Failure mode: if Claude or a source fails, the brief builds with what exists —
**a thin brief beats no brief** (same last-good philosophy as the hub).

## 5. API

```
GET  /health                 → 200 (no auth — hub poller)
GET  /stats                  → {lastBrief, itemsToday, sourcesHealthy}   (hub cards)
POST /auth/hub-sso {token}   → verify HS256(HUB_SSO_SECRET, aud:'tech-radar')
GET  /api/brief/today        → today's brief (or latest)
GET  /api/brief/:day         → archive read
GET  /api/archive?month=     → list of days with brief titles
GET  /api/search?q=          → FTS over items (what did TSMC do in May?)
CRUD /api/sources            → manage feeds (admin)
POST /api/rebuild/:day       → re-run the Claude step (admin, idempotent)
```

## 6. UI

- **Today** (default): TOP 5 as cards up top, then the five sections in
  Orbitron headers with 2-line summaries + source links; date switcher.
- **Archive**: calendar/list of past briefs.
- **Search**: ask the item store ("ASML May").
- **Watchlist strip**: ticker chips across the top; *(later)* live quotes via
  Finnhub free tier.
- Hub toast at 06:05: `postMessage({type:'notify', text:"Today's brief is ready"})`.
- LOF style gate: copy the `:root` variable block from ADMIN-LINK
  `client/src/styles.css`, set `--brand:#CA8A04`; support `?embed=1`.

## 7. Build order (TDD each phase)

1. **Ingest + store**: sources table, rss.js + hn.js, dedupe — fetchers with
   injected fetchFn (test with fixtures, no network in tests); items list UI.
2. **The Claude brief**: brief.js, today view, archive.
3. **IPO + arXiv ingestors**, search (FTS5), watchlist strip.
4. **Hub wiring**: /health, /stats, ?embed=1, hub-sso, ready-toast; adminUrl
   into the hub's projects.json.
5. *(later)* live quotes, weekly "what mattered this week" roll-up, merge with
   the hub's internal Morning Brief (backlog #24) into one morning read.

## 8. Env

```
PORT=5607  ADMIN_PASSWORD=…  SESSION_SECRET=…  HUB_SSO_SECRET=…  DB_PATH=./radar.db
ANTHROPIC_API_KEY=…  FINNHUB_KEY=…(free)  TZ=Asia/Dubai
```

## 9. Relation to backlog #24 ("Morning Brief")

#24 is the **internal** digest (our modules' stats). TECH RADAR is the
**external** world. Build TECH RADAR standalone first; they can merge later
into "the world + the company" one-pager.
