# 06 — Project Status

_Last updated: P08 complete (Administrative Features)._

**Numbering note:** this milestone's own task brief called itself "P08 of the backend," but the previous version of this document had already assigned "P08" to frontend implementation. Since the actual work delivered here is backend (Super Admin unlimited transfers, administrative point management, password change/reset, forced password change), this document now treats that as P08 and shifts frontend implementation to P09, with Testing/QA and Deployment moving to P10/P11 accordingly. Nothing about the backend itself changed because of this — it's a documentation-numbering correction only.

## Current Phase

**P09 — Frontend implementation** (not yet started).

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

None — P08 is complete. P09 has not started.

## Upcoming Milestones

| Milestone | Deliverable |
|---|---|
| P09 | Frontend implementation against the completed API |
| P10 | Testing and quality assurance |
| P11 | Deployment and user acceptance |

## Future Phases

See table above — P09 onward remain unstarted as of this writing.

## Known Risks

- Scope/timeline risk if requirements change beyond what is documented in `01_REQUIREMENTS.md`.
- FR-1.5 (login history/lockout) remains unimplemented.
- The game catalog has no admin-management endpoint (only seed data).
- `must_change_password` is surfaced by the backend but not enforced — nothing currently blocks an API call just because the flag is true. This is intentional per this milestone's brief ("frontend will later redirect user"), but it means the flag is advisory only until the frontend (P09) acts on it.
- As an academic project with a fixed timeline, thorough testing is at risk of being compressed if earlier milestones run long.

## Current Version

`v0.9.0-in-progress` — backend complete through P08 (scaffolding, database, authentication, user management, wallet management, game management, reporting, notifications, audit log review, and administrative features); frontend implementation (P09) not yet started.
