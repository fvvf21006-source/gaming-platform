# 06 — Project Status

_Last updated: P09 frontend rebuild (client code complete, live E2E verification pending — see below)._

**Numbering note:** this milestone's own task brief called itself "P08 of the backend," but the previous version of this document had already assigned "P08" to frontend implementation. Since the actual work delivered here is backend (Super Admin unlimited transfers, administrative point management, password change/reset, forced password change), this document now treats that as P08 and shifts frontend implementation to P09, with Testing/QA and Deployment moving to P10/P11 accordingly. Nothing about the backend itself changed because of this — it's a documentation-numbering correction only.

## Current Phase

**P09 — Frontend implementation** (client code rewritten against the real API contract; live end-to-end verification against a running backend is still pending — see Known Risks).

## Completed

- **P00** — Software Requirements Proposal reviewed and accepted as authoritative business source; technology stack finalized; full documentation foundation created (README, CLAUDE.md, and `docs/00`–`09`).
- **P01** — Project scaffolding: React (Vite) frontend and Express backend scaffolds created and verified to run independently, no business logic.
- **P02** — Database foundation: 11 normalized tables, migrations, seeds, and `schema.sql` created and verified against a live PostgreSQL instance; startup now verifies the database connection before the server listens.
- **P03** — Authentication & Authorization: `POST /api/auth/login` and `GET /api/auth/me`, JWT, bcrypt, `authenticate`/`authorize` middleware.
- **P04** — User Management: `POST /api/users`, `GET /api/users`, `GET /api/users/:id`, `PUT /api/users/:id`, `PATCH /api/users/:id/status`. Hierarchy-restricted creation, atomic profile/wallet creation, recursive descendant visibility, ancestor-only status changes.
- **P05** — Wallet Management: `GET /api/wallet`, `POST /api/wallet/transfer`, `GET /api/wallet/transactions`. Transfers restricted to the sender's own direct child, atomic debit/credit/transaction-record.
- **P06** — Game Management: `GET /api/games`, `POST /api/games/:id/play`, `POST /api/games/sessions/:sessionId/complete`, `GET /api/games/history`. Atomic wallet-debit-plus-session-creation, frozen-player check re-fetched fresh, completion restricted to the session's own owner while `in_progress`.
- **P07** — Reporting, Notifications & Audit Log Review, complete, including comprehensive audit writers for logins, user management, wallet transfers, and game sessions (BR-25/BR-26 fulfilled).
- **P08** — Administrative Features, complete:
  - **Super Admin unlimited transfers** — `POST /api/wallet/transfer` now skips the balance check entirely when the sender is Super Admin (who has no wallet, per FR-3.1); every other role's transfer behavior, including the balance check itself, is byte-for-byte unchanged.
  - **Administrative point management** — `POST /api/wallet/adjust` (add/remove/set), Super Admin may adjust anyone, Level 1–3 only within their own hierarchy (BR-8-style self-or-descendant, broader than the direct-child-only rule transfers use). Every adjustment creates a `wallet_transactions` row (when the balance actually changes), an audit log entry, and a notification.
  - **Change password** — `PUT /api/auth/change-password`, self-service, verifies current password, same minimum-length policy as account creation, clears `must_change_password`.
  - **Password reset** — `POST /api/users/:id/reset-password`, hierarchy-based (ancestor-only, same breadth as point adjustment — never self), generates a random temporary password server-side (never administrator-chosen), returned exactly once, sets `must_change_password`.
  - **Forced password change** — new `users.must_change_password` column; surfaced in the login response (`mustChangePassword`); login still succeeds either way — enforcing an actual redirect is explicitly a frontend concern, out of scope here.
  - **Schema changes** (both additive, zero impact on existing rows): `wallet_transactions.sender_balance_after` is now nullable (Super Admin and admin adjustments have no real sender balance to report), and a new `wallet_transactions.transaction_type` column (`transfer`/`admin_add`/`admin_remove`/`admin_set`) replaces the hardcoded `'transfer'` literal the P07 point-distribution report was explicitly built to anticipate.
  - Three new audit actions (`password_changed`, `password_reset`, `points_adjusted`) and two new notification types (`password_reset`, `points_adjusted`), all through the existing `auditService.logAction()`/`notificationService.createNotification()` helpers — no new repositories.

## In Progress

**P09 — Frontend implementation, client code complete pending live verification:**

- The `client/` app previously contained leftover output from an unrelated prototype session ("Online Casino Night") that invented its own incorrect data model: a 3-tier role system (`super_admin/master_admin/admin/player`) instead of the real 5-tier hierarchy, USD currency balances (`formatUSD`, a fabricated dual "actual"/"bonus" wallet), and gambling mechanics (`wager`, `win`/`loss`, `payout`) with no backend support — all of which contradicted `CLAUDE.md`'s "no real money, no betting/wagering" rule. That model has been fully removed (`data/mockData.ts`, `utils/money.ts`, the unused `services/api.js`, and the local-state-only `context/AppContext.tsx` are all deleted).
- The frontend is now rebuilt around the real 5-tier `Role` type (`super_admin/level_1/level_2/level_3/player`, `src/types/auth.ts`) and a single points balance (no currency formatting), matching `docs/04_API_SPEC.md` and `docs/05_BUSINESS_RULES.md` throughout — hierarchy-restricted user creation (`CHILD_ROLE` map), direct-child-only transfers vs. hierarchy-wide admin adjustments, Super Admin's no-wallet/unlimited-transfer exemption, forced password-change gating on `mustChangePassword`, Super-Admin-only audit log and login report, etc.
- Data layer matches `docs/02_ARCHITECTURE.md`: `client/src/api/client.ts` now runs on Axios (was raw `fetch`, and its dead mock-login fallback is removed) and every screen is wired through TanStack Query hooks (`src/hooks/`) instead of fake local state; forms use React Hook Form + Zod (`src/schemas/`).
- The Player game flow no longer fabricates a client-side win/loss/payout outcome (the real API has no such concept — a session just deducts a fixed `pointCost` and later records an arbitrary integer `score`). It now plays a small real mini-game (`src/components/game/ReflexGame.tsx`) whose score is submitted to `POST /api/games/sessions/:id/complete`. The "Lucky Crown Casino" visual branding and flavor copy were intentionally kept per explicit product direction — only the underlying mechanics changed.
- The unrouted `Messaging.tsx` component was removed — there is no messaging/chat module anywhere in `01_REQUIREMENTS.md` or the API spec, and it had no persistence.
- Fixed a pre-existing responsive bug (NFR-3): the login screen's two-column layout and the sidebar's `.hidden-mobile` class had no actual mobile breakpoint and overflowed below ~820px; both are now fixed via CSS media queries in `index.css`.
- `npx tsc --noEmit` and `npm run build` both pass clean in `client/`.
- **Not yet done this session:** a live end-to-end walkthrough against a running `server/` + PostgreSQL instance. No local Postgres was available and Docker Desktop could not be brought up headlessly in this environment; the user opted to skip live testing for now rather than provision one. `client/.env` / `client/.env.example` are prepared (`VITE_API_BASE_URL`, corrected from the previous `.env.example`'s stale `VITE_API_URL`), and `.claude/launch.json` is set up to preview the Vite dev server, so this is ready to verify as soon as a backend is reachable.

## Upcoming Milestones

| Milestone | Deliverable |
|---|---|
| P09 | Live end-to-end verification of the rebuilt frontend against a running backend + PostgreSQL |
| P10 | Testing and quality assurance |
| P11 | Deployment and user acceptance |

## Future Phases

See table above.

## Known Risks

- Scope/timeline risk if requirements change beyond what is documented in `01_REQUIREMENTS.md`.
- FR-1.5 (login history/lockout) remains unimplemented.
- The game catalog has no admin-management endpoint (only seed data).
- `must_change_password` is now enforced client-side (P09) — a forced change-password screen blocks all other routes until resolved — but this has not been exercised against a live backend yet.
- The frontend's P09 rebuild has not been verified end-to-end against a running backend (see above) — it is confirmed to typecheck, build, and render correctly with no backend reachable (graceful network-error handling), but authenticated flows (login success, hierarchy CRUD, transfers, game sessions, reports) are unverified live.
- As an academic project with a fixed timeline, thorough testing is at risk of being compressed if earlier milestones run long.

## Current Version

`v0.9.0-in-progress` — backend complete through P08; frontend (P09) rebuilt against the real API contract and business rules, typechecked and built successfully, pending live end-to-end verification against a running backend.

## Session Update: Casino Games Hardening and Outcome Presets

- Casino games rebalanced (house edge), crypto RNG, timer/race fixes, and now rendered in the player app.
- Server rejects casino scores above the maximum payout; new seed `006_seed_casino_games.sql` so deployments that already applied seeds 004/005 get the games.
- Level 3 / Super Admin can preset a live session's final score (`PUT /api/games/sessions/:sessionId/outcome`, migration 019); the game plays out to it. Verified end to end locally (API checks plus Crash Rocket and Lucky Wheel in the browser).
- Deploy note: `npm run setup-db` applies migrations 014-019 and seed 006 on API start.
