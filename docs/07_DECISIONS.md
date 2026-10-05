# 07 — Architectural Decisions

This is a living log of architectural decisions and their rationale. New decisions should be appended as they are made — never delete or rewrite prior entries; add a note if a decision is later superseded.

## Why PostgreSQL

PostgreSQL offers strong relational integrity guarantees (foreign keys, constraints, transactions) that suit a hierarchy-and-ledger-style domain where correctness of balances and relationships matters more than flexible/unstructured storage. It's free, well-documented, and has first-class Node.js support via `pg`.

## Why Repository Pattern

Isolating all SQL behind repository modules keeps business logic (services) independent of data-access details, makes the codebase easier to reason about and test, and confines the impact of any future schema or query changes to a single layer.

## Why Service Layer

Separating business rules from HTTP handling (controllers) and data access (repositories) keeps each layer single-purpose. It also makes the business rules in `05_BUSINESS_RULES.md` directly traceable to service-layer functions, rather than scattered across controllers or embedded in SQL.

## Why JWT

JWTs allow stateless authentication — the server doesn't need to persist session state to verify a request, which simplifies horizontal scaling and keeps the auth flow straightforward for an academic-scope project.

## Why bcrypt

bcrypt is a widely-used, purpose-built password hashing algorithm with a tunable, deliberately slow cost factor, which resists brute-force and rainbow-table attacks far better than a general-purpose hash. Paired with JWT, it keeps the authentication strategy to exactly two well-understood, single-purpose libraries (P03) rather than pulling in a broader auth framework (e.g. Passport), consistent with CLAUDE.md's "authentication must use bcrypt and JWT only."

## Why Raw SQL

Raw SQL (via `pg`) over a full ORM keeps query behavior explicit and transparent, which matters for a project centered on strict, auditable balance/transaction rules where implicit ORM behavior (lazy loading, auto-generated joins) could obscure correctness issues.

## Why React

React's component model and large ecosystem (React Router, TanStack Query, React Hook Form) make it straightforward to build a role-aware, multi-view administrative and player-facing interface efficiently.

## Why Tailwind

Tailwind's utility-first approach speeds up building a consistent, responsive UI across the many distinct views this platform requires (dashboards per role, wallet views, game views) without maintaining a large separate CSS codebase.

## Why Express

Express is a minimal, well-understood Node.js framework that imposes little structure of its own, which pairs well with this project's explicit, self-imposed layered architecture (Controller → Service → Repository) rather than a more opinionated framework's conventions.

## P09: Discarding the "Online Casino Night" prototype data model

An earlier, unrelated prototype session had generated a `client/` scaffold using its own invented data model — a 3-tier role system, USD-formatted dual "actual"/"bonus" wallets, and simulated win/loss/payout gambling mechanics — none of which match `01_REQUIREMENTS.md`, `04_API_SPEC.md`, or the real 5-tier hierarchy the backend already implements through P08. That model directly contradicted `CLAUDE.md`'s explicit "no real money, no betting/wagering/odds" rule. It has been fully removed rather than patched, since it wasn't a variant of the correct model — it was answering a different (unapproved) product brief. The frontend was rebuilt from `docs/04_API_SPEC.md` and `docs/05_BUSINESS_RULES.md` directly, reusing the one part of the old scaffold that was already correct: `client/src/api/client.ts`'s typed request functions.

## P09: Axios + TanStack Query + React Hook Form + Zod

`docs/02_ARCHITECTURE.md` specifies this stack for the frontend; it was adopted as-is rather than hand-rolling fetch/state plumbing, since every screen needs consistent loading/error/caching behavior against a real backend and the project's own architecture doc already made this call.

## P09: A real mini-game instead of simulated win/loss

The backend has no win/loss/payout concept — `POST /api/games/:id/play` deducts a fixed `pointCost` and `POST /api/games/sessions/:id/complete` just records an arbitrary non-negative integer `score`. Rather than fabricate a client-side random outcome (which is exactly the kind of "odds-based outcome" `CLAUDE.md` prohibits, and which nothing on the server would back), `GameAccess.tsx` now launches a small genuinely-playable reaction-time mini-game (`components/game/ReflexGame.tsx`) whose real score is what gets submitted.

## Strict immediate-child scope and an immutable ledger

Visibility, reports, admin actions, and transaction-history access were narrowed from "all descendants" to "self + direct children" (Super Admin remains global), per the access-control requirements: no level reaches past its immediate child tier. `wallet_transactions` now also records `sender_balance_before`, `recipient_balance_before`, and `performed_by` (migration 014), and a database trigger rejects any UPDATE/DELETE on it, so transaction history can never be deleted in a way that reverses or duplicates points — balances live only in `wallets` and change solely through transfer/adjust. `GET /api/wallet/transactions?userId=` lets a parent view a direct child's history.

## Casino games: server-validated scores and supervisor-preset outcomes

The casino mini-games (Lucky Wheel, Slot Machine, Mines Field, Crash Rocket) pay virtual points only, with no real-money value. This supersedes the earlier "no odds-based outcomes" stance for these four games; points remain non-monetary. Their payout tables were rebalanced to a house edge (about 93-96% return) because the original multipliers returned far more than the buy-in.

Two server-side rules back them. First, `completeSession` rejects a casino score above buy-in x the game's maximum multiplier. Second, a Level 3 user (own descendants only) or Super Admin can preset the final score of a player's in-progress session with `PUT /api/games/sessions/:sessionId/outcome` (migration 019, `forced_score`). `utils/casinoOutcomes.js` limits a preset to results the game can actually show. The player's game reads its own preset through `GET /api/games/sessions/:sessionId/outcome` and plays out to it, and `completeSession` records the preset whatever the client reports. Each preset is written to the audit log (`game_outcome_set`). Players are not shown that a preset exists, and the preset is never included in a player's own session responses. This is only acceptable because points have no monetary value; it must never be used with real money.

## Game economy: the Super Admin house wallet

Super Admin now has a wallet that acts as the house. When a player starts a game, the buy-in moves from the player's wallet to the house wallet (ledger type `game_buy_in`); when a round ends, a casino game's score is paid back to the player from the house wallet (`game_payout`). Whatever players lose therefore stays with Super Admin. Arcade games (`games.pays_out = false`) report a plain score rather than points, so their buy-ins are simply kept and nothing is paid back.

Super Admin is still an unlimited issuer, so a win larger than the house balance is paid in full and the house wallet is floored at zero rather than going negative. Ordinary transfers from Super Admin are unchanged. Buy-in, payout and session completion happen in one database transaction.

`GET /api/reports/game-results` (Super Admin only, JSON/CSV, optional date range) reports players' total won and lost per game, the house net and the house balance; the Reports page has a Win / Loss tab with Today, This week, This month and a custom range. Game ledger rows are excluded from the transfer history and the point-distribution report so those stay about hierarchy transfers.

## Points are never removed, history is never deleted

Super Admin can create points without limit but cannot remove them: `POST /api/wallet/adjust` refuses `remove` and any `set` that would lower a balance for Super Admin. User deletion is already unsupported. At the database level `wallet_transactions` rejects UPDATE, DELETE and TRUNCATE, and `audit_logs` and `game_sessions` reject DELETE and TRUNCATE (migrations 014 and 020), so transactions and history cannot be erased even by a direct query.
