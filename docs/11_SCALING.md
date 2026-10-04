# Scaling & deployment notes

Target: ~1000 concurrent users.

## What the app does per user
- Heartbeat: 1 request / 30 s (all roles). ~33 req/s at 1000 users — a single indexed `UPDATE`.
- Notifications poll: 1 request / 30 s.
- Level 3 / Super Admin Game Control: live sessions every 5 s, online players every 10 s (paused while the tab is hidden).
- Auth is a stateless JWT check, so no DB hit per request except where a service re-reads the user.

## Changes made for load
- DB pool: `DB_POOL_MAX` (default 20), idle/connect/statement timeouts so a stuck query or exhausted pool fails fast.
- Migration `018_add_performance_indexes.sql` for sessions, reports, audit, notifications and presence.
- gzip compression, 100 kb JSON body limit, proxy-aware rate limiting (generous API limit; login limiter counts failures only).
- Graceful shutdown on SIGTERM, keep-alive timeouts aligned with Render's proxy.
- Client: route-level code splitting, hashed assets cached for a year, gentler polling.

## Known limits / next steps
- Render **free** plan sleeps and has a fraction of a CPU: use `starter` or above for real concurrency.
- Use Neon's **pooled** connection string (host contains `-pooler`).
- `GET /api/reports/player-activity` and `GET /api/users` return everything in scope (no pagination). Fine for hundreds of players with limited history; add pagination/aggregation in SQL before history grows large.
- bcrypt login bursts are CPU-bound; `UV_THREADPOOL_SIZE=8` helps only with more than one core.
- Presence and rate-limit state are per-instance/in the DB; running several API instances needs a shared store for rate limits (e.g. Redis).
- Not load-tested: no database was available in the dev environment. Run a test (e.g. `npx autocannon`) against staging before launch.
