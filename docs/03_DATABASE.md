# 03 — Database Documentation

This document describes the expected database design at a conceptual level. No SQL is included here — implementation SQL belongs in `server/database/schema.sql` and the migration files, per the Repository Pattern.

## Expected Tables

| Table | Purpose |
|---|---|
| `users` | All accounts across all roles (Super Admin, Level 1, Level 2, Level 3, Player), with hierarchy reference |
| `roles` | Reference table of role names/permissions (or an enum, depending on final design) |
| `wallets` | One virtual point balance per user |
| `transactions` | Every point transfer between users |
| `games` | Catalog of available arcade games and their point cost |
| `game_sessions` | Each instance of a player accessing/playing a game, including score |
| `audit_logs` | Immutable record of all sensitive actions across the system |
| `notifications` | Per-user notification records for significant events |
| `login_history` | Record of login attempts and outcomes |
| `password_resets` | Password reset request/token tracking |

## Relationships

- `users.created_by` references `users.id` — self-referencing, models the hierarchy (each user, except Super Admin, has exactly one creator).
- `users.role_id` references `roles.id`.
- `wallets.user_id` references `users.id` — one-to-one.
- `transactions.sender_id` and `transactions.recipient_id` both reference `users.id`.
- `game_sessions.user_id` references `users.id`; `game_sessions.game_id` references `games.id`.
- `audit_logs.actor_id` references `users.id` (the user who performed the action).
- `notifications.user_id` references `users.id` (the recipient).
- `login_history.user_id` references `users.id`.
- `password_resets.user_id` references `users.id`.

## Primary Keys

Every table uses a surrogate primary key (`id`), expected to be a UUID or auto-incrementing integer — final type to be confirmed in the schema design phase.

## Foreign Keys

Foreign key constraints should be enforced at the database level for all relationships listed above, with `ON DELETE` behavior decided per table (e.g. `RESTRICT` on `users.created_by` to prevent orphaning the hierarchy; `CASCADE` may be appropriate for dependent records like `notifications`).

## Indexes

- Index `users.created_by` (frequent hierarchy lookups: "get all children of this user").
- Index `users.role_id` (frequent role-based filtering).
- Index `transactions.sender_id` and `transactions.recipient_id` (transaction history lookups).
- Index `game_sessions.user_id` (gameplay history lookups).
- Index `audit_logs.actor_id` and `audit_logs.created_at` (audit review and reporting).
- Unique index on `users.username`/`users.email`.

## Naming Conventions

- Tables: plural, `snake_case` (e.g. `game_sessions`).
- Columns: `snake_case` (e.g. `created_at`, `sender_id`).
- Primary key column: `id`.
- Foreign key columns: `<singular_referenced_table>_id` (e.g. `user_id`, `role_id`).
- Timestamps: `created_at`, `updated_at` on every table where applicable.
- Migration files: prefixed with a sequential number or timestamp (e.g. `001_create_users_table.sql`).

## Migration Strategy

- Every schema change is a new, additive migration file — existing, already-applied migrations are never edited.
- Migrations are numbered/timestamped and applied in strict order.
- Each migration should be reversible where practical (up/down or documented rollback steps).
- `schema.sql` reflects the cumulative result of all applied migrations, for reference and fresh local setup.

## Seed Strategy

- Seed scripts populate a baseline Super Admin account for initial platform access.
- Optional seed scripts may populate sample hierarchy/test data for local development.
- Seed data is never used in production; production is bootstrapped only with the initial Super Admin account.