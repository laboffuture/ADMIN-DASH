# MANGO BRIEF — concept & build notes

> Status: **named & registered in the hub (2026-06-11), not built yet.**
> Registry entry: `mango-brief` / "MANGO BRIEF" / accent `#CA8A04` (mango gold).
> This doc is the starting brief for the session/repo that will build it.

## What it is

A daily, auto-summarized briefing of global tech: what the big players shipped,
what the chip supply chain did, who is IPO-ing, and what the world (especially
China) announced — readable in five minutes every morning. Claude does the
summarizing; nobody reads forty articles.

The name: **MANGO** = **M**eta · **A**pple · **N**vidia · **G**oogle · **O**penAI
(the owner's acronym). Anthropic, Microsoft, Amazon, TSMC, ASML ride along in
the watchlist even though they're not in the letters.

## The daily brief — five sections

| Section | Covers | Example from the owner |
|---|---|---|
| BIG TECH | MANGO companies: launches, models, org moves | "Claude is developing a new product and they're releasing it" |
| CHIPS | ASML, TSMC, Nvidia supply chain, fabs, export rules | "ASML and TSMC have done something these days" |
| AI RELEASES | New models/products from anyone (incl. Anthropic, Chinese labs) | — |
| IPO WATCH | Upcoming + completed tech IPOs globally | "IPO of all the companies in the global" |
| WORLD | China & other countries' breakthroughs, research (BCI etc.) | "through brain cells they have implemented…" |

## Watchlist (tickers where they exist)

- Public: META, AAPL, NVDA, GOOGL, MSFT, AMZN, **ASML**, **TSM**, AMD, AVGO, INTC
- Private (news-only, no ticker): OpenAI, Anthropic, xAI, DeepSeek, ByteDance
- Optional later: show live quotes for these next to the brief (free tiers:
  Finnhub / Twelve Data / stooq CSV).

## Ingestion sources (all free, no scraping needed)

- **RSS**: The Verge, TechCrunch, Ars Technica, MIT Tech Review; company
  newsrooms (Meta, Google, Nvidia, OpenAI, Anthropic blogs all publish RSS);
  SCMP Tech + TechNode (China); investor-news feeds for ASML/TSMC.
- **Hacker News API** (free, official) — front-page tech signal.
- **IPO calendar**: Finnhub free tier has `/calendar/ipo`; Nasdaq's public
  calendar as backup.
- **arXiv RSS** (cs.AI) for research-grade items (the "brain cells" category).

## Pipeline (the actual build)

```
cron (daily, e.g. 06:00 GST)
  → fetch all sources → dedupe/cluster by story
  → Claude API: classify into the 5 sections + write 2-line summaries
    and a 5-bullet "top of the day"
  → store briefs (SQLite or JSON files; date-keyed)
  → web UI: today's brief + archive by date + watchlist strip
```

Needs: a Claude API key, a tiny server with a scheduler, ~zero ops. Stack to
match the fleet: Express or FastAPI + Vite/React, served on the VPS behind one
port.

## Hub contract (when it's built)

Same five promises as every module (`ARCHITECTURE.md` §3): allow framing,
support `?embed=1`, expose a no-auth `GET /health`, optional postMessage
("today's brief is ready" toast would be lovely), optional SSO. Then fill in
`adminUrl` + `healthUrl` on the `mango-brief` entry — no hub code changes.

## Relation to backlog #24 ("Morning Brief")

#24 is the **internal** morning digest (our own modules' stats). MANGO BRIEF is
the **external** world. They can eventually merge into one morning read —
"the world + the company" — but build MANGO BRIEF standalone first.
