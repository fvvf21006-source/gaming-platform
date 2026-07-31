# CLAUDE.md — Project Memory & Development Guide

This file is the primary reference for every future development session on this project. Read this file first, before touching any code. It reflects the permanent rules of the project and should be treated as the source of truth alongside the `docs/` folder.

---

## Project Summary

**Gaming Platform** is a Multi-Level Virtual Points Gaming Platform — an academic project implementing a hierarchical, role-based web application. Authorized users create accounts beneath them, distribute virtual points downward through a four-tier hierarchy, and the points at the bottom of that hierarchy (held by Players) gate access to simple arcade games. Every action is logged for full auditability. Virtual points have no real-world monetary value; there is no real-money transaction of any kind in this system.

**User Hierarchy:** Super Admin → Level 1 → Level 2 → Level 3 → Player

---

## Architecture

```
React (client)
     ↓
REST API
     ↓
Express (routes)
     ↓
Service Layer   (business logic)
     ↓
Repository Layer (SQL access)
     ↓
PostgreSQL
```

Full detail: [`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md).

## Folder Structure

```
gaming-platform/
  client/
  server/
    config/
    controllers/
    middleware/
    repositories/
    routes/
    database/
      connection.js
      schema.sql
      migrations/
      seeds/
    services/
    validators/
    utils/
    server.js
  docs/
  README.md
  CLAUDE.md
```

## Business Rules (Summary)

Full detail: [`docs/05_BUSINESS_RULES.md`](docs/05_BUSINESS_RULES.md). Key non-negotiable rules:

- Only a parent (the tier immediately above) may create a child account.
- Players cannot create accounts and cannot transfer points.
- Virtual points move only downward through the hierarchy — never sideways, never upward.
- No account may ever hold a negative point balance.
- Every point transfer, account action, login, and game session produces an audit log entry.
- Frozen users cannot log in or perform any action.
- Every action is permission-checked against the acting user's role.
- Nothing bypasses the hierarchy — no level may skip or act on a non-descendant account.
- Virtual points carry no real-world monetary value and are never exchanged for real currency anywhere in the system.

## Coding Standards

- **Controllers** — HTTP request/response handling only. No business logic, no SQL.
- **Services** — All business logic. No direct HTTP objects (`req`/`res`), no SQL.
- **Repositories** — All SQL lives here, and only here. No business logic.
- **Validators** — Request/input validation only.
- **Utils** — Small, shared, stateless helper functions.
- **Middleware** — Authentication, authorization, request logging, centralized error handling.
- No duplicated logic — extract shared logic into services or utils.
- No SQL outside repositories, under any circumstance.
- No business logic inside controllers, under any circumstance.
- Small, single-responsibility, reusable functions.
- Meaningful, descriptive naming for files, functions, and variables.
- Configuration and secrets only via environment variables — never hardcoded.

## Development Rules

- Follow the Repository Pattern strictly for all database access.
- Every new endpoint must have: a route, a controller, a service, and (if it touches the DB) a repository method — in that order of responsibility.
- Every new endpoint must have validation via `express-validator` before it reaches the service layer.
- Every state-changing action (create, update, freeze, transfer) must produce a corresponding audit log entry.
- Every endpoint must declare its required role(s) and be protected by the authorization middleware.
- Database schema changes must go through a new migration file — never edit an already-applied migration.
- Update [`docs/06_PROJECT_STATUS.md`](docs/06_PROJECT_STATUS.md) at the end of each work session.
- Log any new architectural decision in [`docs/07_DECISIONS.md`](docs/07_DECISIONS.md) as it is made.

## Current Phase

**P05 — Wallet Management** (not yet started; see [`docs/06_PROJECT_STATUS.md`](docs/06_PROJECT_STATUS.md) for full milestone tracking).

## Completed Phases

- **P00** — Documentation foundation (requirements, architecture, business rules, Git workflow).
- **P01** — Project scaffolding (frontend and backend run independently, no business logic).
- **P02** — Database foundation (11 tables, migrations, seeds, `schema.sql`, connection verification on startup).
- **P03** — Authentication & Authorization (`POST /api/auth/login`, `GET /api/auth/me`, JWT, bcrypt, `authenticate`/`authorize` middleware).
- **P04** — User Management (`POST/GET /api/users`, `GET/PUT /api/users/:id`, `PATCH /api/users/:id/status`; hierarchy-restricted creation, atomic profile/wallet creation, recursive descendant visibility, ancestor-only status changes).

## Next Phase

**P05 — Wallet management.** Balance retrieval, downward-only point transfers, and transaction history (FR-3.1–FR-3.5). Builds on the hierarchy visibility rules established in P04 — expect the same self-or-descendant checks to govern who can transfer to whom.

## Important Constraints

- This project involves **no real money at any point** — no payment gateway, no cash-out mechanism, no real-currency conversion of any kind. Points are an internal, non-monetary game-access mechanism only.
- The "games" are simple, self-contained arcade games. This project does not implement betting, wagering, or odds-based outcomes of any kind.
- All account creation is controlled (hierarchical) — there is no public self-registration endpoint.

## What Claude Should NEVER Do

- Never put SQL in a controller or service — SQL belongs only in repositories.
- Never put business logic in a controller — controllers only translate HTTP ↔ service calls.
- Never allow a level to create, view, or modify an account that is not its direct child.
- Never allow a point transfer that would push a balance negative.
- Never allow an action to bypass an audit log entry.
- Never hardcode secrets, connection strings, or credentials.
- Never introduce real-money payment processing, cash-out, or currency-exchange functionality.
- Never add public self-registration for any role.
- Never skip authorization middleware on a new endpoint, even temporarily.

## Coding Philosophy

Keep layers thin and single-purpose. A controller should be readable in a few lines: validate input arrived correctly, call one service method, return the response. Business rules should be expressed clearly in services, in plain functions that read like the rules in `05_BUSINESS_RULES.md`. Repositories should read like a thin, literal translation of the database schema — no cleverness, no business rules leaking in.

## Repository Pattern Explanation

The Repository Pattern isolates all SQL and database access behind a well-defined interface (a "repository" module per entity, e.g. `userRepository.js`, `walletRepository.js`). Services call repository functions (e.g. `userRepository.createUser(...)`) and never write or see raw SQL themselves. This means:

- The database can be queried consistently from one place per entity.
- Business logic in services stays testable and independent of SQL syntax.
- If the database access pattern ever needs to change, only the repository layer is touched.

## Layer Responsibilities

| Layer | Responsibility | Must NOT contain |
|---|---|---|
| Routes | Map HTTP method + path to a controller function | Any logic |
| Controllers | Parse request, call service, shape response | Business logic, SQL |
| Middleware | Auth, authorization, logging, error handling | Business logic |
| Services | Business rules, orchestration across repositories | SQL, HTTP objects |
| Repositories | All SQL queries for one entity | Business logic |
| Validators | Input shape/type/rule validation | Business logic, SQL |
| Utils | Small stateless helpers | Business logic |

---

## Git Workflow

```
main
  ↑
develop
  ↑
feature/*
```

Every feature branch merges into `develop`; `develop` merges into `main` at release points.

**Commit message convention:**
- `feat:` — a new feature
- `fix:` — a bug fix
- `docs:` — documentation only changes
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `chore:` — tooling, config, or maintenance changes
