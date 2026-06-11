# BOARDROOM — build blueprint

> **How to use this file:** copy it into the new project's empty repo as
> `BLUEPRINT.md`, open a Claude session there, and say *"read BLUEPRINT.md and
> build Phase 1, TDD."* It is self-contained.

| | |
|---|---|
| Hub id / name | `boardroom` / **BOARDROOM** |
| Accent | `#1E293B` (board slate) |
| Reserved port | **5604** on the LOF VPS |
| Stack | Express (Node 18+, CJS) + better-sqlite3 (FTS index only) · Vite + React 18 |
| One line | The Dubai investors' window: monthly updates, deck archive, decision log |

## 1. What this is

Three things a CEO loses track of, in one place:

1. **Investor updates** — a monthly letter to the Dubai investors, drafted by
   Claude from real numbers, edited by a human, archived forever.
2. **Decision log** — every major company call recorded with context and
   consequences, so "why did we do this?" always has an answer.
3. **Deck archive** — board decks and key PDFs, dated and findable.

**Core design decision — markdown-first, git as the database.** The decision
log adopts the industry-standard ADR pattern (Nygard format via AWS/Azure/
Google guidance): one numbered markdown file per decision with
**Context / Decision / Consequences** sections and a status field
(`proposed → accepted → superseded`). Files live in the repo; SQLite only
holds a rebuildable full-text index. This keeps the record durable, diffable,
and readable without the app.

## 2. Architecture

```
┌──────────────────────────── boardroom (one PM2 process, :5604) ─────────────────────────┐
│  content/                       ← THE data (committed to the project's own git)          │
│    decisions/0001-….md …        ← ADRs: frontmatter(status,date,deciders,tags) + Nygard  │
│    updates/2026-06.md …         ← investor updates (frontmatter: status draft|sent)      │
│    decks/2026-06-board.pdf …    ← binaries, date-prefixed                                │
│  Express API                                                                             │
│    ├─ indexer.js  watches content/ → rebuilds SQLite FTS5 index (search)                 │
│    ├─ metrics.js  pulls /stats from north-star :5601 · ledger :5602 · student-360 :5603  │
│    ├─ drafter.js  Claude API: metrics + this month's decisions → update draft            │
│    └─ serves client/dist                                                                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ iframe (?embed=1) from hub :5500
```

## 3. Content formats

**Decision (ADR)** — `content/decisions/0007-move-coderunner-to-railway.md`:

```markdown
---
status: accepted            # proposed | accepted | superseded(by: 0012) | rejected
date: 2026-06-04
deciders: [CEO, CTO]
tags: [infra, coderunner]
---
# 0007 — Move CODERUNNER frontend to Railway

## Context        ← forces at play, options considered
## Decision       ← what we chose, stated in full sentences
## Consequences   ← what becomes easier, harder, or risky
```

**Investor update** — `content/updates/2026-06.md`: frontmatter
(`status: draft|sent`, `sent_on`) + the standard sections investors expect:
**TL;DR · Metrics · Highlights · Lowlights · Decisions made · Asks · Runway**.
The Metrics section is a generated block (from `metrics.js`) the human never
hand-types.

## 4. Claude drafting flow

```
POST /api/updates/draft {month}
  → metrics.js gathers: north-star /stats (objective progress),
    ledger /stats (cash, burn, runway, revenue), student-360 /stats (reach),
    decisions with date in <month>
  → Claude API (claude-fable-5): "write the update in this template,
    plain factual tone, numbers verbatim, flag anything missing as [TBD]"
  → saved as content/updates/<month>.md (status: draft)
Human edits in the UI → "mark sent" (status: sent, sent_on) → file is final.
```

Claude drafts; **a human always reads and sends**. The app never emails
investors directly (copy-paste or export — deliberate friction).

## 5. API

```
GET  /health                     → 200 (no auth — hub poller)
GET  /stats                      → {openDecisions, lastUpdateSent, daysSinceUpdate, decks}
POST /auth/hub-sso {token}       → verify HS256(HUB_SSO_SECRET, aud:'boardroom')
GET  /api/decisions?status=&tag=&q=   (FTS search)
POST /api/decisions              → next number, writes the md file
PATCH /api/decisions/:n          → status changes (supersede links both files)
GET  /api/updates · GET /api/updates/:month
POST /api/updates/draft {month}  → Claude draft (above)
PATCH /api/updates/:month        → edit body / mark sent
GET|POST /api/decks              → list/upload (multer, 25 MB cap)
```

## 6. UI

- **Decisions** (default): table (number, title, status chip, date, tags) +
  full-text search; detail pane renders the markdown; "supersede" action.
- **Updates**: reading view (rendered md, metrics block styled as stat cards);
  DRAFT/SENT chips; editor with side-by-side preview; "Draft with Claude" button.
- **Decks**: date-sorted list, inline PDF view.
- LOF style gate (`--brand:#1E293B`), `?embed=1` supported.

## 7. Build order (TDD each phase)

1. **Decision log**: file format, numbering, indexer + FTS search, table +
   detail UI. (Standalone value from day one.)
2. **Updates**: format, reading view, manual editor, sent flow.
3. **Metrics block**: pull sibling /stats with last-good fallback (copy the
   hub's rates.js resilience pattern).
4. **Claude drafting** + deck archive.
5. **Hub wiring**: /health, /stats, ?embed=1, hub-sso; adminUrl into hub.

## 8. Env

```
PORT=5604  ADMIN_PASSWORD=…  SESSION_SECRET=…  HUB_SSO_SECRET=…
ANTHROPIC_API_KEY=…   NORTH_STAR_URL=http://127.0.0.1:5601  LEDGER_URL=…  STUDENT360_URL=…
```
Investor content is sensitive → private repo, content/ included in nightly
backup.

## 9. Sources

- [AWS — ADR best practices](https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/)
- [Microsoft Azure — maintaining an ADR](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record)
- [Google Cloud — ADR overview](https://cloud.google.com/architecture/architecture-decision-records)
- [Martin Fowler — Architecture Decision Record](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)
- [adr.github.io — templates (Nygard/MADR)](https://adr.github.io/adr-templates/)
