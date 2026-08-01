# Changelog

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
