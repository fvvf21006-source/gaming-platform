# 03 — Database Documentation

This document describes the as-implemented database design at a conceptual level. Implementation SQL lives in `server/database/schema.sql` and the migration files, per the Repository Pattern. See [`ER_DIAGRAM.md`](ER_DIAGRAM.md) for the full entity-relationship diagram.

## Tables

| Table | Purpose |
|---|---|
| `roles` | Fixed reference set of the five hierarchy tiers (Super Admin, Level 1, Level 2, Level 3, Player) and their ordering |
| `users` | All accounts across all roles, with hierarchy reference (`created_by`) |
| `user_profiles` | Optional profile data (name, display name, avatar), one-to-one with `users` |
| `wallets` | One virtual point balance per user |
| `wallet_transactions` | Every downward point transfer between a user and a direct child |
| `game_categories` | Grouping for the arcade game catalog |
| `games` | Catalog of available arcade games and their point cost |
| `game_sessions` | Each instance of a player accessing/playing a game, including points spent and score |
| `notifications` | Per-user notification records for significant events |
| `audit_logs` | Immutable record of all sensitive actions across the system |
| `system_settings` | Key-value platform configuration, editable without a code deployment |

Note: point consumption for game access (`game_sessions.points_spent`) is tracked separately from hierarchy transfers (`wallet_transactions`), since Players can spend points but never transfer them onward (BR-15). There are no separate `login_history` or `password_resets` tables — those requirements (FR-1.2, FR-1.5) are not yet implemented as of P03 and will be scheduled against a future milestone.

## Relationships

- `users.role_id` references `roles.id`.
- `users.created_by` references `users.id` — self-referencing, models the hierarchy (each user, except the initial Super Admin, has exactly one creator).
- `user_profiles.user_id` references `users.id` — one-to-one.
- `wallets.user_id` references `users.id` — one-to-one.
- `wallet_transactions.sender_id` and `wallet_transactions.recipient_id` both reference `users.id`.
- `games.category_id` references `game_categories.id` — nullable.
- `game_sessions.user_id` references `users.id`; `game_sessions.game_id` references `games.id`.
- `notifications.user_id` references `users.id`.
- `audit_logs.actor_id` references `users.id` — nullable, so a log entry survives if the acting account is later deleted.
- `system_settings` has no foreign key relationships to any other table.

## Primary Keys

Every table uses a UUID surrogate primary key (`id`), generated with `gen_random_uuid()` via the `pgcrypto` extension.

## Foreign Keys

- `ON DELETE RESTRICT` on `users.role_id`, `users.created_by`, `wallet_transactions.sender_id`/`recipient_id`, and `game_sessions.game_id` — prevents orphaning the hierarchy, the transaction ledger, or session history.
- `ON DELETE CASCADE` on `user_profiles.user_id`, `wallets.user_id`, `game_sessions.user_id`, `notifications.user_id` — dependent, per-user records that should not outlive the user.
- `ON DELETE SET NULL` on `games.category_id` and `audit_logs.actor_id` — the referencing row should survive even if the category or acting user is removed.

## CHECK Constraints

- `roles.hierarchy_level` must be between 0 and 4.
- `users.status` must be `active` or `frozen`; `created_by` cannot equal a user's own `id`.
- `wallets.balance` must never be negative (BR-12).
- `wallet_transactions.amount` must be positive; both post-transfer balances must be non-negative where present (`sender_balance_after` is nullable as of P08 — `NULL` for Super Admin's unlimited transfers and administrative adjustments, which have no real sender-side wallet); `sender_id` cannot equal `recipient_id`; `transaction_type` (added P08) must be one of `transfer`, `admin_add`, `admin_remove`, `admin_set`.
- `games.point_cost` must be non-negative.
- `game_sessions.points_spent` must be non-negative; `status` must be `in_progress`, `completed`, or `abandoned`; `completed_at` cannot precede `started_at`.
- `users.must_change_password` (added P08) is a plain boolean, no CHECK — defaults to `false` for every existing and new row.

## Indexes

- `users.created_by` and `users.role_id` (hierarchy and role lookups).
- `wallet_transactions.sender_id` and `wallet_transactions.recipient_id` (transaction history lookups).
- `games.category_id` (catalog filtering).
- `game_sessions.user_id` and `game_sessions.game_id` (gameplay history lookups).
- `notifications.user_id` and the composite `(user_id, is_read)` (unread-notification lookups).
- `audit_logs.actor_id` and `audit_logs.created_at` (audit review and reporting).
- Unique constraints double as indexes on `users.username`, `users.email`, `roles.name`, `roles.hierarchy_level`, `wallets.user_id`, `user_profiles.user_id`, `game_categories.name`, `games.name`, and `system_settings.key`.

## Naming Conventions

- Tables: plural, `snake_case` (e.g. `game_sessions`).
- Columns: `snake_case` (e.g. `created_at`, `sender_id`).
- Primary key column: `id`.
- Foreign key columns: `<singular_referenced_table>_id` (e.g. `user_id`, `role_id`), except `wallet_transactions.sender_id`/`recipient_id` and `audit_logs.actor_id`, which are named for their role rather than the referenced table.
- Timestamps: `created_at` on every table; `updated_at` additionally on tables that are mutated after creation (`users`, `user_profiles`, `wallets`, `games`, `system_settings`).
- Migration files: prefixed with a sequential number (e.g. `002_create_users.sql`).

## Migration Strategy

- Every schema change is a new, additive migration file — existing, already-applied migrations are never edited.
- Migrations are numbered and applied in strict order (`000_enable_extensions.sql` through `013_alter_users_must_change_password.sql` as of P08). `012` and `013` are the first two `ALTER TABLE` migrations in the project — both additive and backward-compatible (a new nullable/defaulted column, never a change to an existing row's meaning).
- Applied via plain `psql -f` in sequence (`for f in server/database/migrations/*.sql; do psql ... -f "$f"; done`) — no separate migration-runner tool is in use.
- `schema.sql` reflects the cumulative result of all applied migrations, for reference and fresh local setup; regenerate it after adding a new migration.

## Seed Strategy

- `001_seed_roles.sql` populates the five fixed hierarchy roles.
- `002_seed_admin_user.sql` bootstraps the single initial Super Admin account, with a real bcrypt hash as of P03 (username `super_admin`, documented default password in `README.md`).
- `003_seed_system_settings.sql` populates baseline platform configuration.
- `004_seed_game_categories.sql` and `005_seed_games.sql` (P06) populate a minimal, active game catalog — there is no admin catalog-management endpoint, so a fresh clone would otherwise have no games to play.
- Seed scripts are for local/development use only and must never run against production; production is bootstrapped only with the initial Super Admin account, whose password must be rotated immediately (see `09_DEPLOYMENT.md`).
