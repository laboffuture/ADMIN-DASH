# CLAWD — the hub's resident agent

> The little pixel guy walking along the bottom of the portal. Click him and a
> chat pops up; he answers from the hub's live data. This document is his home:
> identity, architecture, and the growth plan from mascot to the agent that
> "manages the whole internal stuff."

| | |
|---|---|
| Name | **CLAWD** (after Anthropic's crab mascot — it's literally him walking) |
| Body | `client/public/anim/claude.json` (pixel-art Lottie, 107 KB) |
| Legs | `client/src/components/HubPet.jsx` (wander + click → chat) |
| Mouth | `client/src/components/AgentChat.jsx` (the pop-up chat) |
| Brain | `server/agent.js` (`createAgent`) behind `POST /api/agent/chat` |
| Status | **Phase 1 + 2 shipped 2026-06-11** (local brain always; Claude brain when key set) |

## 1. How he works today

```
click CLAWD ──► AgentChat (pop-up, bottom-left)
   │  POST /api/agent/chat {message}            (auth-gated, same-origin)
   ▼
server/agent.js
   ├─ context(): live snapshot — registry projects + poller statuses
   │             (online/error/down/pending + latencies) + FX rates + time
   ├─ ANTHROPIC_API_KEY set?
   │     yes → Claude API (claude-fable-5, max 400 tokens):
   │           system = "you are Clawd… answer ONLY from CONTEXT, brief,
   │           friendly, plain text" · user = CONTEXT JSON + question
   │           → {reply, source:'claude'}
   │     no / API error → LOCAL BRAIN (rule-based, same context):
   │           · names a module? → that module's status + latency
   │           · rate/currency words? → AED→INR & USD→INR
   │           · otherwise → "N of M online", trouble list, pending count
   │           → {reply, source:'local'}
   ▼
chat bubble (Clawd-blue, LOF style gate)
```

Design rules baked in:

- **The hub never depends on the API.** No key, network down, quota hit —
  Clawd still answers; he just answers from rules instead of Claude. Same
  last-good philosophy as the poller and rates cache.
- **Read-only.** Phase 1–2 Clawd only *reports*. He holds no credentials and
  can change nothing.
- **Auth-gated.** `/api/agent/chat` sits behind the hub session like every
  data route; context never leaves the hub except to Anthropic when a key is
  deliberately configured.
- **Never in the way.** He walks `z-index:4`, the chat opens `z-index:6`
  (under toasts), the walk pauses while you talk, reduced-motion users get a
  standing Clawd, and if his animation fails to load he simply doesn't exist.

## 2. Enabling the Claude brain

```
# .env on the hub
ANTHROPIC_API_KEY=sk-ant-…     # restart the server; that's all
```

Without it `source:'local'` (deterministic answers). With it `source:'claude'`
(natural conversation over the same context). The reply object says which
brain answered — the UI can badge it later.

## 3. Growth plan

| Phase | What Clawd learns | Builds on |
|---|---|---|
| 1 ✅ | Walk, be clicked, answer status/rates from live hub data | — |
| 2 ✅ | Claude brain when `ANTHROPIC_API_KEY` set (graceful fallback) | phase 1 |
| 3 | **Cross-module numbers**: pull each module's `/stats` (runs today, ratings, pending reviews) into context → "how many students this week?" | backlog #21 (the `/stats` contract) |
| 4 | **Memory of the day**: status-flip history in context → "did anything go down overnight?" | backlog #3 (poll history) |
| 5 | **Morning Brief narrator**: Clawd posts the 8am digest as a chat message + toast | backlog #4, TECH RADAR |
| 6 | **Hands** (carefully): act on modules — restart a check, acknowledge an alert, approve from the approvals inbox. Every action confirmed in-chat, audited, allowlisted | backlog #5; module APIs |
| 7 | Conversation memory across the session (multi-turn context window) | — |

Phase 6 is the only phase where Clawd stops being read-only — it ships with an
explicit per-action allowlist and confirm-before-do, or it doesn't ship.

## 4. Files

```
agent/ARCHITECTURE.md                      ← this file (Clawd's home)
server/agent.js                            ← both brains + context builder
server/tests/agent.test.js                 ← brain behavior (6 tests)
server/app.js                              ← POST /api/agent/chat route
client/src/components/HubPet.jsx           ← the walking button
client/src/components/AgentChat.jsx        ← the pop-up chat
client/src/components/ClaudeMark.jsx       ← useClaudeAnim (lazy lottie loader)
client/src/components/{HubPet,AgentChat}.test.jsx
client/public/anim/claude.json             ← the body (optimized Lottie)
```

## 5. Conventions for whoever grows him next

- TDD like the rest of the hub — his brains are pure functions with injected
  `fetchFn`/getters; no network in tests.
- Keep the local brain answering everything the Claude brain can be asked —
  it is the floor, not a stub.
- New context = extend `context()` in one place; both brains see it.
- His personality: brief, warm, honest about what he can't see. He says
  "worth a look", not "CRITICAL ALERT".
