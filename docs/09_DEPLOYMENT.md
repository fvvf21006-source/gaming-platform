# 09 — Deployment

This document describes the future deployment process. No deployment has occurred yet (see `06_PROJECT_STATUS.md`); this is a plan to be executed in Phase 7.

## Frontend

- Build the React (Vite) app into static assets (`vite build`).
- Serve the static build via a static hosting provider or a lightweight static file server, configured to point at the deployed backend's API URL.

## Backend

- Deploy the Express application to a Node.js-compatible hosting environment.
- Ensure the process manager restarts the server on crash and on deploy.
- Confirm CORS is configured to allow only the deployed frontend's origin.

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
- `BCRYPT_SALT_ROUNDS`
- `CORS_ORIGIN`
- `NODE_ENV=production`

## Production Checklist

- [ ] All migrations applied successfully against the production database.
- [ ] Initial Super Admin account created (and its default credentials rotated immediately).
- [ ] `JWT_SECRET` is a strong, unique value distinct from any development value.
- [ ] `CORS_ORIGIN` restricted to the production frontend domain only.
- [ ] Helmet, CORS, and Morgan middleware confirmed active in production.
- [ ] HTTPS enforced at the hosting/proxy layer.
- [ ] Database backups configured and verified.
- [ ] Audit logging confirmed functional end-to-end in the production environment.
- [ ] No development/seed data present in the production database.