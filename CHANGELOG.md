# Changelog

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
