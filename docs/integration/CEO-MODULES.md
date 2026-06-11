# CEO command-center modules — concepts

> Status: **named & registered as placeholders (2026-06-11), none built yet.**
> The hub's first ten modules answer *"is everything up?"*. These five answer
> what a CEO asks next: *money, mission, customers, paperwork, investors.*
> Each follows the standard module contract (`ARCHITECTURE.md` §3) when built;
> dropping any idea = deleting its entry in `projects.json`.

## NORTH STAR — goals & KPIs  (`north-star`, #4F46E5)

Are we winning? Company OKRs and quarterly targets with owners and progress
bars; each key result can pull its number live from a module's `/stats` (e.g.
"500 students/week on CODERUNNER" updates itself). The hub stops being a status
map and starts being a scoreboard.
**MVP:** goals in a YAML/JSON file + tiny Express/React app; later auto-pull
from module stats. Effort: small.

## LEDGER — money in one view  (`ledger`, #15803D)

Revenue, expenses, invoices (paid/due/overdue), monthly burn, runway — in AED,
INR, and USD using the same FX source as the hub topbar. Also the home for
infra spend (Railway, VPS, Claude API usage) so cloud burn isn't invisible.
**MVP:** manual entries + CSV import into SQLite; charts; later bank/accounting
exports (Zoho Books / Wafeq are common in UAE). Effort: medium.

## STUDENT 360 — the business heartbeat  (`student-360`, #0891B2)

One view per student/cohort across every product: CODERUNNER missions run,
3D-VIEWER votes, STUDENT-FEEDBACK ratings, attendance. Which schools are
engaged, which cohorts are slipping, what outcomes look like — the EdTech
question behind all other questions.
**MVP:** nightly pull from each module's API into one DB keyed by student/
school; cohort table + trend lines. Depends on modules exposing read APIs
(same `/stats` contract direction as backlog #1). Effort: the big one — phase
it per product.

## BOARDROOM — investors & decisions  (`boardroom`, #1E293B)

The Dubai investors' window: monthly investor update (Claude drafts it from
NORTH STAR + LEDGER + STUDENT 360 numbers), board deck archive, cap-table
notes, and a decision log — every major call with date, context, and outcome.
CEOs forget *why*; this doesn't.
**MVP:** markdown-based updates + decision journal with a clean reading UI.
Effort: small.

## PAPER TRAIL — compliance radar  (`paper-trail`, #92400E)

Everything with an expiry date: trade license, establishment card, employee
visas & Emirates IDs, insurance, domain names, key contracts. Countdown view +
alerts at 90/30/7 days (reuses the hub's alert channel from backlog #2).
Boring until the day it saves the company.
**MVP:** one table of documents with dates + a cron that nags. Effort: tiny —
highest value-per-line-of-code on this page.

---

## Considered, deliberately folded elsewhere

- **Cloud-cost tracker** → a LEDGER tab (it's just another expense category).
- **Competitor watch** → a TECH RADAR section (same pipeline, extra sources).
- **Help desk / support inbox** → wait for ticket volume to exist first.
- **Company wiki / SOPs ("PLAYBOOK")** → valuable, but a docs tool fits better
  than a dashboard module; revisit when the team grows.

## Suggested build order (payoff ÷ effort)

1. PAPER TRAIL (days of work, prevents disasters)
2. NORTH STAR (makes every other number mean something)
3. LEDGER (CEO dashboard without money isn't one)
4. BOARDROOM (rides on the first three's data)
5. STUDENT 360 (biggest, phase per product as module APIs appear)
