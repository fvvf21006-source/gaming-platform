# 06 — Project Status

_Last updated: P05 (wallet management) complete._

## Current Phase

**P06 — Game Management** (not yet started).

## Completed

- **P00** — Software Requirements Proposal reviewed and accepted as authoritative business source; technology stack finalized; full documentation foundation created (README, CLAUDE.md, and `docs/00`–`09`).
- **P01** — Project scaffolding: React (Vite) frontend and Express backend scaffolds created and verified to run independently, no business logic.
- **P02** — Database foundation: 11 normalized tables, migrations, seeds, and `schema.sql` created and verified against a live PostgreSQL instance; startup now verifies the database connection before the server listens.
- **P03** — Authentication & Authorization: `POST /api/auth/login` and `GET /api/auth/me` implemented end-to-end (routes → controller → service → repository), JWT issuance/verification, bcrypt password hashing, reusable `authenticate` and `authorize(roles)` middleware. The existing seeded Super Admin account was updated with a real bcrypt hash (no new accounts, no schema changes). Verified against a live PostgreSQL instance: valid login, wrong password, unknown user, missing/invalid/expired token, valid `/me`, and role authorization.
- **P04** — User Management: `POST /api/users`, `GET /api/users`, `GET /api/users/:id`, `PUT /api/users/:id`, `PATCH /api/users/:id/status` implemented end-to-end. Account creation is restricted to exactly one tier below the creator, creates the user's profile and wallet atomically in one transaction, and enforces username/email uniqueness. Hierarchy visibility (self + all descendants, found via a recursive query) governs listing and viewing. Status changes are ancestor-only — a user can never freeze/reactivate themselves. `DELETE /api/users/:id` returns 405 by design; no schema changes. No frontend, wallet, game, dashboard, or notification work included.
- **P05** — Wallet Management: `GET /api/wallet`, `POST /api/wallet/transfer`, `GET /api/wallet/transactions` implemented end-to-end. A transfer's recipient must be an account the sender directly created (not merely any user one tier down); sender/recipient existence, frozen status (BR-18), self-transfer, and sufficient balance are all checked. The debit, credit, and `wallet_transactions` insert happen in one atomic database transaction — the debit itself is a single conditional `UPDATE ... WHERE balance >= amount`, so the balance check is race-safe without explicit row locking. Verified against a live PostgreSQL instance: successful transfer with correct balance changes and exactly one transaction row, insufficient balance, self-transfer, three forms of invalid hierarchy (skip-tier, same-tier, unrelated branch), Player rejection, frozen sender and frozen recipient rejection, transaction history ordering, and confirmed rollback (rejected attempts left zero trace in the database). No schema changes; existing `authenticate`/`authorize` middleware and `userRepository.findUserById` reused as-is.

## In Progress

None — P05 is complete. P06 has not started.

## Upcoming Milestones

| Milestone | Deliverable |
|---|---|
| P06 | Game management: game catalog, session start/completion, gameplay history (FR-4.1–FR-4.4) |
| P07 | Reporting, notifications, and audit log review endpoints (FR-5–FR-7) |
| P08 | Frontend implementation against the completed API |
| P09 | Testing and quality assurance |
| P10 | Deployment and user acceptance |

## Future Phases

See table above — P06 onward remain unstarted as of this writing.

## Known Risks

- Scope/timeline risk if requirements change beyond what is documented in `01_REQUIREMENTS.md`.
- Password reset (FR-1.2) and login history/lockout (FR-1.5) remain unimplemented; they were explicitly out of scope for P03 and are not yet scheduled against a specific milestone above.
- As an academic project with a fixed timeline, thorough testing is at risk of being compressed if earlier milestones run long.

## Current Version

`v0.6.0-in-progress` — scaffolding, database foundation, authentication, user management, and wallet management complete (P00–P05); game management (P06) not yet started.
