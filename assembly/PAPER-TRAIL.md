# PAPER TRAIL — build blueprint

> **How to use this file:** copy it into the new project's empty repo as
> `BLUEPRINT.md`, open a Claude session there, and say *"read BLUEPRINT.md and
> build Phase 1, TDD."* It is self-contained.

| | |
|---|---|
| Hub id / name | `paper-trail` / **PAPER TRAIL** |
| Accent | `#92400E` (manila brown) |
| Reserved port | **5605** on the LOF VPS |
| Stack | Express (Node 18+, CJS) + better-sqlite3 · Vite + React 18 |
| One line | Everything with an expiry date — renewals surfaced before they bite |
| Build effort | **Smallest of the fleet — build this one first** |

## 1. What this is

UAE compliance lives and dies by renewal dates: trade license, establishment
card, **per-employee visa + Emirates ID + labor approval**, insurance policies,
office lease, key client contracts, domain names, SSL certs. Industry guidance
(UAE compliance checklists, Expiration Reminder-class tools): keep a **digital
checklist per employee/company file with automated reminders** — never
spreadsheets and memory.

PAPER TRAIL is one table of dated items + a daily cron that nags. Boring until
the day it saves the company a fine or a grounded visa.

## 2. Architecture

```
┌──────────────────────────── paper-trail (one PM2 process, :5605) ───────────────────────┐
│  Express API ── better-sqlite3 (papertrail.db)                                           │
│     ├─ scheduler.js  daily 07:00 GST: for each active item, generate/fire due reminders  │
│     ├─ notify.js     Telegram bot (primary) + SMTP email (fallback)                      │
│     ├─ files/        uploaded scans (license PDF, visa page) — local dir, never in git   │
│     └─ serves client/dist                                                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ iframe (?embed=1) from hub :5500          ▼ Telegram Bot API / SMTP
```

## 3. Data model (SQLite DDL)

```sql
CREATE TABLE people (             -- employees/holders; minimal PII by design
  id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, role TEXT, active INTEGER DEFAULT 1);

CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,                          -- 'Trade license — TopRock Global'
  category TEXT NOT NULL CHECK (category IN
    ('license','establishment','visa','emirates-id','labor','insurance',
     'contract','lease','domain','certificate','other')),
  person_id INTEGER REFERENCES people(id),      -- NULL = company-level
  ref_masked TEXT,                              -- '•••• 4821' — NEVER the full number (PDPL)
  issued_on TEXT, expires_on TEXT NOT NULL,
  renewal_lead_days INTEGER NOT NULL DEFAULT 90,
  cost_minor INTEGER, currency TEXT DEFAULT 'AED',
  file_path TEXT, notes TEXT,
  supersedes_id INTEGER REFERENCES items(id),   -- renewal chain
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','renewed','expired','archived')));

CREATE TABLE reminders (                        -- generated at 90/30/7/1 days before expiry
  id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES items(id),
  fire_on TEXT NOT NULL, channel TEXT NOT NULL DEFAULT 'telegram',
  sent_at TEXT, UNIQUE (item_id, fire_on, channel));

CREATE TABLE audit (id INTEGER PRIMARY KEY, item_id INTEGER, action TEXT,
  detail TEXT, at TEXT NOT NULL DEFAULT (datetime('now')));
```

Rules (pure functions, unit-tested):
- `daysLeft(item)` → drives color bands: >90 ok · 31–90 watch (amber) ·
  ≤30 urgent · <0 **OVERDUE** (the only red).
- Default lead days per category (visa 60, license 90, domain 30…), overridable.
- **Renew flow**: `POST /items/:id/renew {newExpiresOn}` → archives old row
  (`status:'renewed'`), inserts successor with `supersedes_id` → full history
  chain per document.
- Expired-but-active items escalate: daily reminder until renewed/archived.

## 4. API

```
GET  /health                   → 200 (no auth — hub poller)
GET  /stats                    → {overdue, due30, due90, items}      (hub cards)
POST /auth/hub-sso {token}     → verify HS256(HUB_SSO_SECRET, aud:'paper-trail')
GET  /api/board?days=120       → items sorted by daysLeft with bands
CRUD /api/items  ·  POST /api/items/:id/renew  ·  POST /api/items/:id/file (upload)
GET  /api/people/:id/file      → employee completeness (has visa? EID? labor?)
GET  /api/calendar.ics         → expiry dates as an iCal feed (phone calendars)
POST /api/test-notify          → fires a test Telegram/email
```

## 5. UI

- **Countdown board** (default): items sorted by days left; big Fira Code
  day counters; band colors; category + person filters; OVERDUE pinned top.
- **Employee files**: card per person with a checklist (visa / Emirates ID /
  labor approval) and the soonest expiry — incomplete file = dashed border
  (same language as the hub's pending cards).
- **Item drawer**: dates, masked ref, cost, scan preview, renewal chain
  timeline, audit trail.
- LOF style gate (`--brand:#92400E`), `?embed=1` supported.

## 6. Privacy (PDPL — UAE Federal Decree-Law 45/2021)

This app holds personal data (visas, IDs). Hard rules: document numbers stored
**masked only**; scans on disk outside git; repo private; admin password +
hub SSO only; no third-party services except Telegram/SMTP notifications
(which carry titles and dates, never numbers or scans).

## 7. Build order (TDD each phase)

1. **Schema + rules**: daysLeft, bands, defaults, renew-chain — pure logic,
   exhaustive tests; items CRUD; countdown board UI.
2. **Reminders**: generation (90/30/7/1), scheduler, Telegram + email senders,
   test-notify.
3. **Employee files** view + uploads + audit.
4. **Hub wiring**: /health, /stats, ?embed=1, hub-sso; adminUrl into hub.
   *(Future: hub Morning Brief includes "PAPER TRAIL: 2 items due in 30 days".)*
5. *(later)* iCal feed, WhatsApp via Twilio if Telegram isn't adopted.

## 8. Env

```
PORT=5605  ADMIN_PASSWORD=…  SESSION_SECRET=…  HUB_SSO_SECRET=…  DB_PATH=./papertrail.db
TELEGRAM_BOT_TOKEN=…  TELEGRAM_CHAT_ID=…  SMTP_URL=…  FILES_DIR=./files
```

## 9. Sources

- [Bizvisor — UAE business compliance checklist](https://www.bizvisor.ae/uae-business-compliance-checklist/)
- [IFZA — UAE compliance & legal requirements](https://ifza.com/en/uae-business-compliance-legal-requirements/)
- [Expiration Reminder — document expiry tracking patterns](https://www.expirationreminder.com/)
- [Remindax — expiry reminder feature set](https://www.remindax.com/)
- [ITSEC — UAE PDPL overview](https://itsecnow.com/regulators/pdpl-cybersecurity)
