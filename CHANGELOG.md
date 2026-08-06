# Changelog

## P07 - Comprehensive Audit Logging (BR-25/BR-26 closed out)

Date:
YYYY-MM-DD

Completed

- Extended audit logging beyond login (the only writer as of the previous P07 session) to cover every major action the SRS requires: user creation, user updates, account freeze/activate, wallet transfers, and game session start/completion
- Added a shared `logAction()` helper to the existing `auditService.js` — best-effort and defensive by design (a logging failure never breaks the underlying action), same policy `authService`'s login audit write already used. No new repository created; every call still goes through the existing `auditRepository.createLogEntry()`
- Added one-line additive audit calls into `userService` (`user_created`, `user_updated`, `account_frozen`/`account_activated`), `walletService` (`wallet_transfer`), and `gameService` (`game_started`, `game_completed`) — no existing public behavior, response shape, or business logic changed in any of the three
- `password_changed` remains undocumented-as-triggered by design — there is still no password-change endpoint anywhere in the API (FR-2.3), so there's nothing to hook it into yet
- No schema changes, no new repository, no pagination added (consistent with every other list endpoint)
- Corrected three now-stale doc claims that said audit logging was login-only (`README.md`, `docs/04_API_SPEC.md`, `docs/06_PROJECT_STATUS.md`) — `docs/05_BUSINESS_RULES.md`'s BR-25/BR-26 needed no change, since they already described this exact behavior as a requirement; it's just true now

Next

- P08 — Frontend implementation

## P07 - Notifications & Audit Log Review (remainder of P07)

Date:
YYYY-MM-DD

Completed

- Implemented `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- Added `notificationRepository`, `notificationService` (including the `createNotification()` hook other services call), `notificationController`, `notificationValidator`, `notificationRoutes`
- Defined five notification types (`account_created`, `wallet_transfer`, `password_changed`, `account_status_changed`, `game_completed`); wired up automatic triggers for four of them with minimal additive hooks into existing services:
  - `userService.createUser` → notifies the new user (`account_created`)
  - `userService.updateUser` / `updateUserStatus` → notifies the target user on an actual status change (`account_status_changed`)
  - `walletService.transferPoints` → notifies both sender and recipient (`wallet_transfer`)
  - `gameService.completeSession` → notifies the player (`game_completed`)
  - `password_changed` has no trigger yet — no password-change endpoint exists anywhere in the API (FR-2.3 unimplemented); the type is defined and ready for when it does
- Notification creation is defensive and best-effort, same policy as P07's login audit logging — a failure to notify never breaks the underlying action
- Implemented `GET /api/audit`, `GET /api/audit/:id` — Super-Admin-only, platform-wide, filterable by `actorId`, `action`, `entityType`, `startDate`/`endDate`
- Extended the existing `auditRepository.js` (from earlier in P07) with `findLogs()` and `findLogById()`; added new `auditService`, `auditController`, `auditValidator`, `auditRoutes` — no update/delete path exists anywhere for audit logs (BR-27)
- No pagination on either module's list endpoints, consistent with every other list endpoint in the project
- No schema changes — `notifications` and `audit_logs` both already existed from P02

Testing note

- Found and corrected a test-script issue during verification (not an app bug): a game-session test initially failed with "Insufficient balance" because the test script hadn't funded that particular player's wallet in this fresh database — re-ran after funding and it passed as expected.

Next

- P08 — Frontend implementation

## P07 - Reporting Module

Date:
YYYY-MM-DD

Completed

- Implemented `GET /api/reports/point-distribution`, `GET /api/reports/player-activity`, `GET /api/reports/login`
- Point-distribution and player-activity reports are scoped to the requester's own hierarchy (self + all descendants), reusing the same recursive `created_by` scoping pattern `userRepository` established in P04 — not a new pattern, the same one applied to a new query
- Login report is platform-wide and Super-Admin-only, sourced from `audit_logs`
- All three reports support `startDate`/`endDate` query params (ISO 8601, both optional, all-time if omitted) and `?format=csv` alongside the JSON default
- Point-distribution items include a `type` field (always `"transfer"` today) for forward compatibility with future transaction types, without any schema change
- Wired up login audit logging for the first time: `authService.login()` now writes a `login_success` or `login_failed` entry to `audit_logs` on every attempt (success, wrong password, unknown username, frozen account), via a new generic `auditRepository.createLogEntry()` — `audit_logs` existed since P02 but had never been written to before this
- The audit write is best-effort and defensive: a failure to log never turns a real login into an unrelated 500
- Added `reportRepository`, `reportService`, `reportController`, `reportValidator`, `reportRoutes`, `auditRepository`, and a new reusable `utils/csv.js` helper
- Found and fixed a bug during testing: CSV output initially rendered timestamps using JS's verbose `Date.toString()` instead of ISO 8601, since `JSON.stringify` calls `toJSON()` automatically but the CSV helper's plain `String()` did not — fixed in `utils/csv.js` before this was considered done
- No schema changes — `wallet_transactions`, `game_sessions`, and `audit_logs` already existed from P02

Not completed (deferred to the remainder of P07)

- Notifications endpoints
- An audit log review endpoint (`audit_logs` now has a writer, but still no reader)
- Audit logging for actions other than login (transfers, account creation, status changes, game sessions — BR-25/BR-26 remain otherwise unimplemented)
- PDF export (JSON and CSV only, by explicit decision)

Next

- Remainder of P07 (Notifications, Audit Log review endpoint)

## P06 - Game Management

Date:
YYYY-MM-DD

Completed

- Implemented `GET /api/games`, `POST /api/games/:id/play`, `POST /api/games/sessions/:sessionId/complete`, `GET /api/games/history` — all Player-only
- Starting a session atomically debits the game's point cost from the player's wallet and creates the `game_sessions` row, using the same conditional `UPDATE ... WHERE balance >= cost` guard pattern P05 established for wallet transfers
- The point deduction is recorded on `game_sessions.points_spent` directly, not as a `wallet_transactions` row, per the existing wallet/game separation documented in `ER_DIAGRAM.md`
- A frozen player is blocked from starting a session (BR-32) — the player is re-fetched fresh from the database on every request rather than trusted from the JWT, extending the same BR-18 pattern P05 used for transfers
- A session can only be completed once, by its own owner, and only while still `in_progress` (BR-33); a conditional `UPDATE ... WHERE status = 'in_progress'` guards against double-completion and race conditions
- Inactive or nonexistent games return 404 on `/play`
- Added `gameRepository`, `gameService`, `gameController`, `gameValidator`, `gameRoutes`; reused `userRepository.findUserById` for the frozen check rather than duplicating user lookups
- Added two new seed files (`004_seed_game_categories.sql`, `005_seed_games.sql`) populating a minimal, active game catalog — three categories and three games — since there is no admin catalog-management endpoint and a fresh clone would otherwise have nothing to play
- No schema changes — `game_categories`, `games`, and `game_sessions` already existed from P02

Next

- Reporting, Notifications & Audit Log Endpoints (P07)

## P05 - Wallet Management

Date:
YYYY-MM-DD

Completed

- Implemented `GET /api/wallet`, `POST /api/wallet/transfer`, `GET /api/wallet/transactions`
- Transfer recipient must be an account the sender directly created (`created_by` check) — one hierarchy tier down, the sender's own child specifically, not any user at that tier and not a more distant descendant
- Sender and recipient are re-fetched fresh from the database on every transfer (never trusted from the JWT), so a frozen account can't transfer or receive points even with a still-valid, previously-issued token (BR-18)
- Self-transfers rejected; Players cannot transfer (route-level `authorize` plus a service-layer check)
- Debit, credit, and the `wallet_transactions` insert happen in a single atomic database transaction; the debit is one conditional `UPDATE ... WHERE balance >= amount`, making the sufficient-balance check race-safe without explicit row locking
- Added `walletRepository`, `walletService`, `walletController`, `walletValidator`, `walletRoutes`; reused `userRepository.findUserById` rather than duplicating user lookups
- No schema changes — `wallets` and `wallet_transactions` already existed from P02

Next

- Game Management (P06)

## P04 - User Management

Date:
YYYY-MM-DD

Completed

- Implemented `POST /api/users`, `GET /api/users`, `GET /api/users/:id`, `PUT /api/users/:id`, `PATCH /api/users/:id/status`
- Account creation restricted to exactly one hierarchy tier below the creator, with the target role validated against the creator's role
- User creation, profile creation, and wallet creation committed atomically in a single database transaction
- Enforced username and email uniqueness (proactive check plus a fallback on the underlying unique-constraint violation)
- Hierarchy-based visibility for listing/viewing users, computed via a recursive query over `created_by` (self + all descendants, not just direct children)
- `PUT` allows updating email, status, and profile fields, but rejects any `role` field outright
- Status changes (`PATCH .../status`) restricted to ancestors only — a user can never change their own status
- `DELETE /api/users/:id` intentionally returns `405 Method Not Allowed`
- Added `userRepository`, `userService`, `userController`, `userValidator`, `userRoutes`, and a shared `utils/httpErrors.js` helper
- No schema changes; existing `authenticate`/`authorize` middleware reused as-is

Next

- Wallet Management (P05)

## P03 - Authentication & Authorization

Date:
YYYY-MM-DD

Completed

- Implemented `POST /api/auth/login` and `GET /api/auth/me`
- Added JWT issuance and verification (`utils/jwt.js`)
- Added bcrypt password hashing and comparison (`utils/password.js`)
- Added `authenticate` middleware (JWT verification, `req.user`)
- Added reusable `authorize(roles)` middleware for role-based access control
- Added `authRepository`, `authService`, `authController`, `authValidator`, `authRoutes`
- Replaced the placeholder password hash in the existing Super Admin seed with a real bcrypt hash (no new seed rows, no schema changes)
- Added `JWT_SECRET` and `JWT_EXPIRES_IN` to `server/.env.example`

Next

- User Management (P04)

## P02 - Database Foundation

Date:
YYYY-MM-DD

Completed

- Designed and implemented the PostgreSQL schema: 11 normalized tables (`roles`, `users`, `user_profiles`, `wallets`, `wallet_transactions`, `game_categories`, `games`, `game_sessions`, `notifications`, `audit_logs`, `system_settings`)
- Added UUID primary keys (`pgcrypto`/`gen_random_uuid()`), foreign keys, unique constraints, CHECK constraints, and indexes throughout
- Created versioned migration files (`server/database/migrations/000`–`011`) and seed files (`server/database/seeds/001`–`003`)
- Generated `server/database/schema.sql` as the cumulative reference schema
- Verified all migrations and seeds apply cleanly against a live PostgreSQL instance, including constraint rejection tests
- Updated `server.js` to call `verifyConnection()` before the server starts listening, exiting with a clear error if the database is unreachable

Next

- Authentication & Authorization (P03)

## P01 - Project Scaffolding

Date:
YYYY-MM-DD

Completed

- Initialized the Express backend: `server.js`, `config/`, `middleware/` (`errorHandler`, `notFound`), `routes/index.js` with `GET /` and `GET /health`
- Initialized the React (Vite) frontend: routing (`/`, `/dashboard`, 404), `MainLayout`, Tailwind CSS, Axios service instance, TanStack Query provider
- Verified frontend and backend run independently with no database, authentication, or business logic

Next

- PostgreSQL Database Foundation (P02)

## P00 - Project Foundation

Date:
YYYY-MM-DD

Completed

- Created documentation foundation
- Established architecture
- Defined business rules
- Defined Git workflow

Next

- Project scaffolding
