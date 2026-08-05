# CODERUNNER — hub SSO brief (paste into the session that maintains the laboffuture repo)

ADMIN-LINK (the central admin hub) embeds this app's `/oversight/dashboard` in an
iframe. Hub admins currently see this app's login inside the frame. Implement the
hub's token handoff so a hub admin lands straight on the dashboard — same pattern
as the `lof-sso` routes in the internal agentic system.

## How the handoff works

The hub appends `&hub_token=<JWT>` to the framed URL:
`/oversight/dashboard?embed=1&hub_token=eyJ...`

Token contract (mint side, already live on the hub):
- **HS256**, signed with the shared secret `HUB_SSO_SECRET`
- `sub: "hub-admin"`, `aud: "coderunner"`, expires **60 seconds** after minting
- Minted fresh every time the hub mounts/reloads the frame

## Tasks in this repo

1. ~~**Backend (Express API): add the exchange endpoint.**~~ **BUILT** — shipped as
   `POST /auth/sso/hub` (not `/auth/hub-sso`), body `{ "hub_token": "<jwt>" }`
   (not `token`), in `apps/api/src/routes/auth.routes.ts:201`. Verifies via
   `verifyHubSsoToken`, maps to the `HUB_SSO_USERNAME` account, returns the same
   shape as `/login`. 401 on a bad token, 503 when SSO env is absent.
   - ⚠️ **Not yet configured on the running API** — it answers `503` today.
     Set `HUB_SSO_SECRET` (the hub's value) and `HUB_SSO_AUDIENCE=coderunner`
     in the pm2 env, plus `HUB_SSO_USERNAME` naming an **`admin`-role** account
     (`/oversight/*` is gated by `requireRole="admin"`), then restart api-1/api-2.
   - Audience is `coderunner` — the hub id. `apps/api/.env.example` shows
     `code-runner`; that value would fail verification.

2. **Frontend (Next.js): consume `hub_token`.**
   - Wherever unauthenticated visitors to `/oversight/*` are redirected to
     `/login`, PRESERVE the query string (`hub_token`, `embed`).
   - On the login page mount: if `hub_token` is present, POST it to
     `/auth/hub-sso` (via the existing api-client); on success store the
     returned auth token exactly like a normal login and redirect to
     `/oversight/dashboard?embed=1`; on failure show the normal login form.
   - Strip `hub_token` from the URL after consuming it (history.replaceState).

3. **Environment (Railway dashboard → web service, and wherever the Express API
   runs): add `HUB_SSO_SECRET`** with the exact value the hub uses (ask the hub
   owner; generated via `crypto.randomBytes(48).toString('hex')`).
   - The web frontend never sees the secret — only the backend verifies.

4. **Reply when deployed** so the hub can flip `"sso": true` for coderunner —
   that's the only hub-side switch.

## Acceptance check

`https://<railway-domain>/oversight/dashboard?embed=1&hub_token=<freshly minted
test token>` in a plain tab: lands on the dashboard with NO login form. With a
garbage/expired token: normal login form, no errors leaking token contents.

## Security notes

- 60s TTL + audience pinning makes replay/forwarding near-useless; the token
  authorizes exactly one app, briefly.
- Keep accepting the module's own login as fallback — SSO failure must never
  lock admins out.
- Do not log token values.
