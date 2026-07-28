# 08 — Development Setup

## Node Version

Use the latest active LTS release of Node.js at the time of development. Record the exact version used in a `.nvmrc` file once implementation begins, so all contributors match.

## Git Workflow

```
main
  ↑
develop
  ↑
feature/*
```

1. Branch every new feature off `develop` as `feature/<short-description>`.
2. Open a pull request from the feature branch back into `develop`.
3. Periodically merge `develop` into `main` at stable milestones.

**Commit message convention:** `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

## Folder Creation

Follow the structure defined in `README.md` and `CLAUDE.md`:

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

## Environment Variables

The following environment variables are expected (define in a `.env` file, never committed to version control):

| Variable | Purpose |
|---|---|
| `PORT` | Port the Express server listens on |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign/verify JWTs |
| `JWT_EXPIRES_IN` | Token expiry duration |
| `BCRYPT_SALT_ROUNDS` | Salt rounds for password hashing |
| `CORS_ORIGIN` | Allowed origin(s) for the frontend |
| `NODE_ENV` | `development` / `production` |

## Database Setup

1. Provision a local or remote PostgreSQL instance.
2. Set `DATABASE_URL` in `.env` to point to it.
3. Run all migrations (see below) to build the schema from scratch.
4. Optionally run seed scripts to populate baseline/test data.

## Migration Workflow

- Migrations live in `server/database/migrations/`, named with a sequential prefix (e.g. `001_create_users_table.sql`).
- Apply migrations in order via the project's migration runner (to be selected in Phase 2/3 — e.g. `node-pg-migrate` or an equivalent raw-SQL runner consistent with the "raw SQL only" constraint).
- Never edit an already-applied migration — create a new one to make further changes.

## Seed Workflow

- Seed scripts live in `server/database/seeds/`.
- At minimum, a seed script creates the initial Super Admin account for local development access.
- Seed scripts are for local/development use only and must never run against production.
