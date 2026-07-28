# 02 — Architecture

## Overview

```
React (Vite)
     ↓
REST API
     ↓
Express (Routes)
     ↓
Service Layer
     ↓
Repository Layer
     ↓
PostgreSQL
```

## Frontend Architecture

- **React (Vite)** — component-based UI, organized by feature (auth, users, wallet, game, reports).
- **React Router** — client-side routing, with route guards based on the authenticated user's role.
- **Axios + TanStack Query** — all server communication goes through Axios; TanStack Query manages caching, loading/error state, and refetching.
- **React Hook Form + Zod** — form state and client-side validation schemas, mirroring server-side validation rules.
- **Tailwind CSS** — utility-first styling.

The frontend never talks to the database directly and never contains business rules (e.g. "can this role create this account") beyond UI-level convenience checks; the server is always the source of truth.

## Backend Architecture

The backend follows a strict layered architecture with one-directional dependency flow: Routes → Controllers → Services → Repositories → Database. A layer may only call into the layer directly below it.

- **Routes** — declare endpoints and attach middleware (auth, authorization, validation) and the appropriate controller function.
- **Controllers** — parse the HTTP request, invoke the relevant service, and shape the HTTP response. No business logic, no SQL.
- **Middleware** — authentication (JWT verification), authorization (role/permission checks), request logging (Morgan), centralized error handling.
- **Services** — contain all business logic (e.g. "a transfer cannot exceed the sender's balance," "only a direct parent may create this account"). Services call repositories; they never write SQL directly.
- **Repositories** — the only layer permitted to contain SQL. Each repository corresponds to an entity (e.g. `userRepository`, `walletRepository`, `gameRepository`) and exposes functions for querying/mutating that entity.
- **Validators** — `express-validator` schemas run before requests reach controllers, rejecting malformed input early.
- **Utils** — shared, stateless helper functions used across layers.

## Repository Pattern

All database access is abstracted behind repository modules. Services never see raw SQL and never receive `req`/`res` objects. This isolates data-access concerns, keeps business logic testable independent of the database, and confines schema-related changes to a single layer.

## Folder Responsibilities

| Folder | Responsibility |
|---|---|
| `client/` | React frontend application |
| `server/config/` | Environment and application configuration |
| `server/controllers/` | HTTP request/response handling |
| `server/middleware/` | Auth, authorization, logging, error handling |
| `server/repositories/` | All SQL access, one module per entity |
| `server/routes/` | Express route definitions |
| `server/database/connection.js` | PostgreSQL connection pool |
| `server/database/schema.sql` | Reference schema |
| `server/database/migrations/` | Versioned, ordered schema changes |
| `server/database/seeds/` | Seed data scripts |
| `server/services/` | Business logic |
| `server/validators/` | Request validation schemas |
| `server/utils/` | Shared helper functions |
| `server/server.js` | Application entry point |

## Layer Interaction

A typical request (e.g. "Level 2 transfers points to a Level 3 user"):

1. Request hits `routes/wallet.routes.js`.
2. Auth middleware verifies the JWT; authorization middleware confirms the caller's role permits transfers.
3. Validator middleware checks the request body shape (recipient ID, amount).
4. `walletController.transferPoints` parses the request and calls `walletService.transferPoints(...)`.
5. `walletService` enforces business rules: recipient must be a direct child, sender balance must cover the amount, resulting balance must not go negative.
6. `walletService` calls `walletRepository` to perform the balance updates and record the transaction atomically.
7. `walletService` calls `auditRepository` to record the audit log entry.
8. Controller returns the updated balance/response to the client.

## Authentication Flow (High Level)

1. User submits credentials to the login endpoint.
2. Server verifies the password hash (bcrypt) against the stored value.
3. On success, the server issues a signed JWT containing the user's ID and role.
4. The client stores the token and sends it as a Bearer token on subsequent requests.
5. Middleware verifies the token's signature and expiry on every protected request, then attaches the decoded user to the request context for downstream authorization checks.

## Database Strategy

- PostgreSQL as the single relational data store.
- Raw SQL via `pg`, written and maintained inside repository modules only.
- Schema changes are made exclusively through versioned migration files (never by editing the live schema directly).
- Seed scripts populate baseline/test data (e.g. an initial Super Admin account) for local development.

See [`03_DATABASE.md`](03_DATABASE.md) for full schema documentation.

## Deployment Strategy

The frontend and backend are deployed as separate services, communicating over the REST API. See [`09_DEPLOYMENT.md`](09_DEPLOYMENT.md) for the full deployment process, environment variables, and production checklist.
