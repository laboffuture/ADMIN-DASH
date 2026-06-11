# LEDGER — build blueprint

> **How to use this file:** copy it into the new project's empty repo as
> `BLUEPRINT.md`, open a Claude session there, and say *"read BLUEPRINT.md and
> build Phase 1, TDD."* It is self-contained.

| | |
|---|---|
| Hub id / name | `ledger` / **LEDGER** |
| Accent | `#15803D` (money green) |
| Reserved port | **5602** on the LOF VPS |
| Stack | Express (Node 18+, CJS) + better-sqlite3 · Vite + React 18 |
| One line | The company's money in one view — AED/INR/USD, burn, runway, invoices |

## 1. What this is

One screen that answers: how much cash, what came in, what went out, what's
owed to us, how many months of runway. Dubai-based company, Indian team →
**every number readable in AED, INR, and USD** (same keyless FX source as the
hub topbar, open.er-api.com).

**Core design decision — lightweight double-entry.** Industry guidance
(Modern Treasury, SDK.finance, Finlego): single-entry is easier but drifts
silently; double-entry's invariant (every transaction sums to zero) gives
built-in error detection and real statements (P&L, cash flow) for barely more
code. The **UI never says debit/credit** — users click "add expense / add
income / transfer / convert", and the server builds the balanced legs.

Multi-currency the industry way: **separate balances per currency** (never mix);
each entry stores its original currency amount **in minor units (integers —
fils/paise/cents, never floats)** plus an AED-equivalent snapshot taken at
transaction date. The zero-sum invariant is enforced on the AED snapshots.

## 2. Architecture

```
┌──────────────────────────── ledger (one PM2 process, :5602) ────────────────────────────┐
│  Express API ── better-sqlite3 (ledger.db, WAL)                                          │
│     ├─ fx.js     hourly cache of USD-based rates (copy hub's server/rates.js pattern)    │
│     ├─ poster.js builds balanced entries from simple intents (expense/income/transfer/fx)│
│     ├─ reports.js P&L by month · burn (trailing-3-month avg net expense)                 │
│     │            · runway = cash ÷ burn · AR aging                                       │
│     ├─ importer.js bank-CSV import: column mapping + sha256 dedupe per row               │
│     └─ serves client/dist                                                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ iframe (?embed=1) from ADMIN-LINK hub :5500          ▼ open.er-api.com (hourly)
```

## 3. Data model (SQLite DDL)

```sql
CREATE TABLE accounts (        -- hierarchical paths, the Modern-Treasury way
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,   -- 'assets:bank:wio-aed' · 'expenses:cloud:railway' · 'income:schools'
  kind TEXT NOT NULL CHECK (kind IN ('asset','liability','income','expense','equity')),
  currency TEXT);              -- pinned for real accounts (bank), NULL for categories

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, memo TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense','income','transfer','fx','adjust')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')));   -- rows are immutable; fix = reversal

CREATE TABLE entries (
  id INTEGER PRIMARY KEY, txn_id INTEGER NOT NULL REFERENCES transactions(id),
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  amount_minor INTEGER NOT NULL,        -- signed, original currency, minor units
  currency TEXT NOT NULL,               -- 'AED' | 'INR' | 'USD' …
  aed_minor INTEGER NOT NULL);          -- FX snapshot at txn date; SUM per txn must = 0

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY, number TEXT NOT NULL UNIQUE, client TEXT NOT NULL,
  currency TEXT NOT NULL, amount_minor INTEGER NOT NULL,
  issued_on TEXT NOT NULL, due_on TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft','sent','paid','void')),
  paid_txn_id INTEGER REFERENCES transactions(id));      -- overdue = sent AND due_on < today

CREATE TABLE fx_days (day TEXT PRIMARY KEY, usd_aed REAL, inr_aed REAL, fetched_at TEXT);
CREATE TABLE import_rows (hash TEXT PRIMARY KEY, txn_id INTEGER);  -- CSV dedupe
```

Posting rules (in `poster.js`, the most-tested file in the repo):
- expense → `+expenses:<cat>` / `−assets:bank:<acct>`
- income → `+assets:bank:<acct>` / `−income:<src>`
- transfer → `+assets:A` / `−assets:B`
- fx convert → bank legs in two currencies + `equity:fx` leg absorbing rounding
- invariant `SUM(aed_minor)=0` checked in a DB transaction; violation = reject.

## 4. API

```
GET  /health                  → 200 (no auth — hub poller)
GET  /stats                   → {cashAed, runwayMonths, mtdRevenueAed, mtdExpenseAed,
                                 overdueInvoices}            (no auth — hub cards)
POST /auth/hub-sso {token}    → verify HS256(HUB_SSO_SECRET, aud:'ledger')
POST /api/tx {kind, date, memo, amount, currency, account, category}  → server builds legs
GET  /api/dashboard           → cash per account+currency, burn, runway, AR aging, 12-mo chart
GET  /api/pnl?month=2026-06   → income/expense tree with AED + INR + USD columns
CRUD /api/invoices · POST /api/invoices/:id/mark-paid (creates the income txn)
POST /api/import (CSV + mapping) → preview → confirm
```

## 5. UI

- **Dashboard**: five stat cards (CASH · MTD IN · MTD OUT · BURN · RUNWAY) with
  a currency toggle [AED|INR|USD]; 12-month in/out bar chart; overdue invoices
  list in red (`#D93A2B` only for overdue).
- **Add transaction**: one dialog, four tabs (expense/income/transfer/convert);
  Fira Code amount input; category picker from account paths.
- **Invoices**: table with aging chips (current / 1–30 / 31–60 / 60+).
- **P&L**: monthly tree, expandable categories.
- LOF style gate: copy `:root` block from ADMIN-LINK `client/src/styles.css`,
  `--brand:#15803D`; support `?embed=1`.

## 6. Build order (TDD each phase)

1. **poster.js + schema**: posting rules, zero-sum invariant, balances query —
   pure logic, exhaustive tests (incl. rounding on FX legs).
2. **Dashboard + add-transaction** UI; fx_days cache.
3. **Invoices** + mark-paid flow + AR aging.
4. **Reports**: P&L, burn, runway; CSV import with dedupe.
5. **Hub wiring**: /health, /stats, ?embed=1, hub-sso; fill adminUrl in hub.
6. *(later)* Zoho Books / Wafeq / bank-export sync; Claude monthly cost summary.

## 7. Env

```
PORT=5602  ADMIN_PASSWORD=…  SESSION_SECRET=…  HUB_SSO_SECRET=…  DB_PATH=./ledger.db
```
Data is financial — repo stays private; DB file backed up nightly (cron copy).

## 8. Sources

- [Modern Treasury — why a ledger database](https://www.moderntreasury.com/journal/how-to-scale-a-ledger-part-i)
- [Modern Treasury — multi-currency ledgers](https://www.moderntreasury.com/journal/announcing-multi-currency-support-for-ledgers)
- [SDK.finance — multi-currency ledger design](https://sdk.finance/blog/what-is-a-multi-currency-ledger-how-fintechs-track-balances-transfers-and-settlement-across-currencies/)
- [Finlego — real-time double-entry ledger](https://finlego.com/blog/designing-a-real-time-ledger-system-with-double-entry-logic)
- [Enerpize — single vs double entry](https://www.enerpize.com/hub/single-entry-vs-double-entry)
