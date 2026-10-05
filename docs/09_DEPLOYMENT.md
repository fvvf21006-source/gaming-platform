# 09 — Deployment

This document describes the future deployment process. No deployment has occurred yet (see `06_PROJECT_STATUS.md`); this is a plan to be executed in a future milestone (P10 — Deployment and user acceptance).

## Frontend

- Build the React (Vite) app into static assets (`vite build`).
- Serve the static build via a static hosting provider or a lightweight static file server, configured to point at the deployed backend's API URL.

## Backend

- Deploy the Express application to a Node.js-compatible hosting environment.
- Ensure the process manager restarts the server on crash and on deploy.
- Confirm CORS is configured to allow only the deployed frontend's origin (`CLIENT_URL`).

## Database

- Provision a managed PostgreSQL instance (or equivalent) for production.
- Apply all migrations against the production database before the first deploy.
- Run the production Super Admin bootstrap step (creating the single initial Super Admin account) — never run development seed scripts against production.
- Configure regular backups.

## Environment Variables

Production values for all variables listed in `08_SETUP.md` must be set via the hosting provider's secret/environment configuration — never committed to source control:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`
- `NODE_ENV=production`

## Production Checklist

- [ ] All migrations applied successfully against the production database.
- [ ] Initial Super Admin account created (and its default credentials rotated immediately).
- [ ] `JWT_SECRET` is a strong, unique value distinct from any development value.
- [ ] `CLIENT_URL` restricted to the production frontend domain only.
- [ ] Helmet, CORS, and Morgan middleware confirmed active in production.
- [ ] HTTPS enforced at the hosting/proxy layer.
- [ ] Database backups configured and verified.
- [ ] Audit logging confirmed functional end-to-end in the production environment.
- [ ] No development/seed data present in the production database.

## Prototype deployment (free tier)

The repo root contains a `render.yaml` Blueprint for the API and the static client, with a free Neon Postgres database (Render's own free Postgres expires after ~30 days). The full step-by-step walkthrough, including troubleshooting, is in [`10_FREE_DEPLOYMENT.md`](10_FREE_DEPLOYMENT.md).

On each API start, `npm run setup-db` (`server/scripts/setup-database.js`) applies pending migrations and one-time seeds, and creates the Super Admin if missing. It is idempotent and tracks progress in `schema_migrations`. In production the API refuses to start if `DATABASE_URL`, `JWT_SECRET` or `CLIENT_URL` is missing.

Known prototype limits: the free API instance sleeps when idle (first request is slow); login lockout (FR-1.5) is not implemented.

## One-time launch reset

To start production clean (zero every wallet, and clear the point ledger, game history, notifications and audit log while keeping all user accounts), set the environment variable `RESET_LAUNCH_DATA` on the API service to any new value (for example `launch-2026-10-05`) and redeploy. `npm run setup-db` runs the reset once, inside a single transaction: it lifts the delete protection on the ledger, audit log and game sessions only for that transaction, restores it before committing, and writes one `launch_data_reset` audit entry recording what was removed. The value is recorded in `schema_migrations`, so redeploying with the same value does nothing; remove the variable afterwards. This cannot be undone. Accounts, the game catalog and settings are never touched.
