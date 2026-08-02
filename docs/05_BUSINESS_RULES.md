# 05 — Business Rules

This is the authoritative list of business rules for the platform. Every service-layer implementation must enforce these rules. This document should be updated whenever a new rule is introduced or an existing rule is clarified.

## Account Creation & Hierarchy

- BR-1: Only a parent (the tier directly above) may create a child account.
- BR-2: Super Admin creates Level 1 accounts only.
- BR-3: Level 1 creates Level 2 accounts only.
- BR-4: Level 2 creates Level 3 accounts only.
- BR-5: Level 3 creates Player accounts only.
- BR-6: Players cannot create accounts of any kind.
- BR-7: There is no public self-registration for any role.
- BR-8: A user may only view, manage, or act upon accounts within their own descendant hierarchy.
- BR-9: Nothing bypasses the hierarchy — no level may skip a tier or act on a non-descendant account.

## Wallet & Point Transfers

- BR-10: Virtual points move only downward through the hierarchy.
- BR-11: Points cannot skip hierarchy levels (e.g. Level 1 cannot transfer directly to a Player).
- BR-12: No account may ever hold a negative point balance.
- BR-13: A transfer may not exceed the sender's current balance.
- BR-14: Every point transfer creates a permanent, immutable transaction record.
- BR-15: Players consume points only by starting a game session; they cannot transfer points to any other account.
- BR-16: Virtual points carry no real-world monetary value and cannot be purchased with, or exchanged for, real currency at any point in the system.
- BR-31: A transfer's recipient must be an account the sender directly created (i.e. the sender is that account's immediate parent) — not merely any user at the tier below, and not a more distant descendant.

## Account Status

- BR-17: Frozen users cannot log in.
- BR-18: Frozen users cannot perform any action, including receiving or sending points.
- BR-19: Only an ancestor in the hierarchy may freeze or reactivate an account.

## Game Access

- BR-20: A Player may start a game session only if their wallet balance meets or exceeds the game's point cost.
- BR-21: Required points are deducted at the start of the game session, not at completion.
- BR-22: Every completed game session records the resulting score.
- BR-32: A frozen account cannot start a game session (extends BR-18); the player's status is re-checked fresh from the database on every request, never trusted from the JWT alone.
- BR-33: A session can only be completed while it is still in_progress — a session that is already completed or abandoned cannot be completed again.

## Permissions & Authorization

- BR-23: Every action is permission-checked against the acting user's role before execution.
- BR-24: Authorization checks occur server-side on every request; client-side checks are convenience only and never authoritative.

## Auditability

- BR-25: Every transaction creates an audit log entry.
- BR-26: Every account creation, status change, login, password reset, and game session creates an audit log entry.
- BR-27: Audit logs are immutable — no update or delete operation may ever be performed on an audit log entry.

## Notifications

- BR-28: Users are notified of account creation, point transfers, password changes, account status updates, and game completion events that concern them.

## Account Integrity

- BR-29: Usernames and email addresses must be unique across all accounts.
- BR-30: Creating a user account also creates that user's profile and wallet in the same transaction — all three rows are committed together or none are (Super Admin is the sole exception, per FR-3.1, and is bootstrapped without a wallet).
