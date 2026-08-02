# Gaming Platform

A Multi-Level Virtual Points Gaming Platform — a hierarchical, role-based web application for controlled account provisioning, virtual point distribution, and gated access to simple arcade games. Built as an academic project to demonstrate layered backend architecture, role-based access control, and full transaction traceability.

## Project Description

The platform models a four-tier management hierarchy (Super Admin → Level 1 → Level 2 → Level 3 → Player). Accounts are never self-registered; each tier creates and manages the tier directly beneath it. Virtual points — used only to access simple arcade games within the platform, with no real-world monetary value — flow downward through the hierarchy. Every account action, point transfer, and game session is logged for full auditability.

## Objectives

- Demonstrate a secure, role-based, hierarchical account management system
- Implement controlled (non-public) account provisioning
- Implement a virtual points wallet and downward-only transfer system
- Gate access to arcade games behind wallet balance checks
- Provide administrative reporting and a full audit trail
- Apply a clean layered backend architecture (Controller → Service → Repository)

## Tech Stack

**Frontend:** React (Vite), Tailwind CSS, React Router, Axios, TanStack Query, React Hook Form, Zod
**Backend:** Node.js, Express.js
**Database:** PostgreSQL, `pg` (node-postgres), raw SQL, SQL migrations, SQL seeds
**Authentication:** JWT, bcrypt
**Validation:** express-validator
**Security:** Helmet, CORS, Morgan

## Folder Structure

```
gaming-platform/
  client/                 React frontend
  server/
    config/                Environment & app configuration
    controllers/            HTTP request/response handling only
    middleware/              Auth, authorization, logging, error handling
    repositories/            All SQL lives here
    routes/                  Express route definitions
    database/
      connection.js           DB connection pool
      schema.sql               Reference schema
      migrations/               Versioned migration files
      seeds/                     Seed data scripts
    services/                Business logic
    validators/               Request validation schemas
    utils/                    Shared helper functions
    server.js                 App entry point
  docs/                    Full documentation set (see below)
  README.md
  CLAUDE.md
```

## Setup Overview

See [`docs/08_SETUP.md`](docs/08_SETUP.md) for full setup instructions, including Node version, environment variables, database provisioning, migrations, and seed data.

## Authentication Setup

Authentication uses JWT (issuance/verification) and bcrypt (password hashing) — no OAuth, refresh tokens, cookies, or session store.

1. Add a JWT secret to `server/.env` (copy from `server/.env.example`):
   ```
   JWT_SECRET=replace_with_secure_random_secret
   JWT_EXPIRES_IN=1h
   ```
2. Run migrations and seeds as usual (see [`docs/08_SETUP.md`](docs/08_SETUP.md)) — the seed data now includes a real bcrypt hash, so no manual SQL is needed to make the default account usable.
3. Log in with the seeded Super Admin account:
   ```
   username: super_admin
   password: Admin@123
   ```
4. Example login request:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"super_admin","password":"Admin@123"}'
   ```
   Returns `{ token, user }`. Use the token as a Bearer token on protected endpoints:
   ```bash
   curl http://localhost:5000/api/auth/me \
     -H "Authorization: Bearer <token>"
   ```
5. **Change the default password before any real deployment** — see the production checklist in [`docs/09_DEPLOYMENT.md`](docs/09_DEPLOYMENT.md).

## User Management

Accounts are created only by the tier directly above them in the hierarchy (Super Admin → Level 1 → Level 2 → Level 3 → Player) — there is no public self-registration. Creating a user also creates their profile and wallet in the same transaction. Full endpoint list: [`docs/04_API_SPEC.md`](docs/04_API_SPEC.md).

Example: the seeded Super Admin creates a Level 1 account:
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <super_admin token>" \
  -d '{"username":"level1_alice","email":"alice@example.com","password":"Password123","role":"level_1"}'
```

Each user can list and view only themselves and their own descendants (`GET /api/users`, `GET /api/users/:id`). Profile and email updates go through `PUT /api/users/:id`; role changes are never accepted there. Freezing/reactivating an account is a separate, ancestor-only action (`PATCH /api/users/:id/status`) — a user can never change their own status. Deletion is not implemented (`DELETE` returns `405`).

## Wallet Management

Every non-Super-Admin user gets a wallet automatically when their account is created (see User Management above) — there is no separate "create wallet" step. Super Admin has no wallet (`GET /api/wallet` returns `404` for that account) and configures balances directly at the database level. Full endpoint list: [`docs/04_API_SPEC.md`](docs/04_API_SPEC.md).

Points move only downward, one hierarchy tier at a time, and only to an account the sender directly created — never sideways, never to a grandchild, never skipping a tier. Example: a Level 1 account transfers points to one of its own Level 2 accounts:
```bash
curl -X POST http://localhost:5000/api/wallet/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <level 1 token>" \
  -d '{"recipientId":"<a level 2 user this account created>","amount":100}'
```
A transfer is rejected if the sender doesn't have enough balance, targets themselves, targets a non-descendant, or either party is frozen. Every successful transfer debits the sender, credits the recipient, and records one `wallet_transactions` row, all in a single atomic database transaction — if any part fails, nothing is written. View history with `GET /api/wallet/transactions` (newest first).

## Game Management

Every endpoint in this module is Player-only. A fresh clone seeds a small, active game catalog (three sample games across three categories) so there's something to play immediately — see `server/database/seeds/004_seed_game_categories.sql` and `005_seed_games.sql`. There is no admin catalog-management endpoint; the catalog is seed data only for now.

Starting a game debits its point cost from the player's wallet and creates a session, atomically — the same pattern as a wallet transfer, but the deduction is recorded on the session itself (`game_sessions.points_spent`), not as a `wallet_transactions` row (see the wallet-flow explanation in `docs/ER_DIAGRAM.md`).
```bash
curl -X POST http://localhost:5000/api/games/<game id>/play \
  -H "Authorization: Bearer <player token>"
```
The response includes the new session and the player's remaining balance. A session is rejected if the game doesn't exist or is inactive, the player doesn't have enough balance, or the player's account is frozen. Complete a session with its own score — only the session's owner can complete it, and only once:
```bash
curl -X POST http://localhost:5000/api/games/sessions/<session id>/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <player token>" \
  -d '{"score":750}'
```
View your own history with `GET /api/games/history` (newest first).

## Development Workflow

See [`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md) for the layered architecture and [`CLAUDE.md`](CLAUDE.md) for coding standards and development rules. Git branching and commit conventions are documented at the bottom of `CLAUDE.md`.

## Documentation Index

| Document | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Primary reference for all future development sessions |
| [docs/00_PROJECT_OVERVIEW.md](docs/00_PROJECT_OVERVIEW.md) | Business overview, scope, goals |
| [docs/01_REQUIREMENTS.md](docs/01_REQUIREMENTS.md) | Functional & non-functional requirements |
| [docs/02_ARCHITECTURE.md](docs/02_ARCHITECTURE.md) | System architecture |
| [docs/03_DATABASE.md](docs/03_DATABASE.md) | Database design documentation |
| [docs/04_API_SPEC.md](docs/04_API_SPEC.md) | REST API specification |
| [docs/05_BUSINESS_RULES.md](docs/05_BUSINESS_RULES.md) | All business rules |
| [docs/06_PROJECT_STATUS.md](docs/06_PROJECT_STATUS.md) | Current status & roadmap |
| [docs/07_DECISIONS.md](docs/07_DECISIONS.md) | Architectural decision log |
| [docs/08_SETUP.md](docs/08_SETUP.md) | Local development setup |
| [docs/09_DEPLOYMENT.md](docs/09_DEPLOYMENT.md) | Deployment process |

## Future Roadmap

See [`docs/06_PROJECT_STATUS.md`](docs/06_PROJECT_STATUS.md) for phased milestones, and [`docs/01_REQUIREMENTS.md`](docs/01_REQUIREMENTS.md) for the future enhancements backlog.

## Scope Note

This is an academic project. The "virtual points" have no real-world monetary value, are not purchasable or redeemable for cash, and exist solely to gate access to simple, self-contained arcade games within the platform. There is no real-money wagering, betting, or gambling functionality anywhere in this system.
