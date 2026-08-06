# 04 — API Specification

This document describes the expected REST API structure by module. It does not define implementation — only the contract each endpoint is expected to fulfill.

---

## Authentication Module

### POST /api/auth/login
- **Purpose:** Authenticate a user and issue a JWT.
- **Method:** POST
- **Authentication:** None
- **Expected Request:** `{ username, password }`
- **Expected Response:** `{ token, user: { id, role, ... } }`
- **Possible Errors:** 400 invalid input, 401 invalid credentials, 403 account frozen, 429 too many attempts (lockout)

### GET /api/auth/me
- **Purpose:** Retrieve the authenticated user's own account information.
- **Method:** GET
- **Authentication:** Required (any authenticated role)
- **Expected Request:** none (token in header)
- **Expected Response:** `{ user: { id, username, email, role, status } }`
- **Possible Errors:** 401 missing/invalid/expired token, 404 user not found

### POST /api/auth/logout
- **Purpose:** Invalidate the current session.
- **Method:** POST
- **Authentication:** Required (any role)
- **Expected Request:** none (token in header)
- **Expected Response:** `{ success: true }`
- **Possible Errors:** 401 unauthorized

### POST /api/auth/password-reset/request
- **Purpose:** Request a password reset.
- **Method:** POST
- **Authentication:** None
- **Expected Request:** `{ username or email }`
- **Expected Response:** `{ success: true }` (generic, to avoid account enumeration)
- **Possible Errors:** 400 invalid input

### POST /api/auth/password-reset/confirm
- **Purpose:** Complete a password reset using a reset token.
- **Method:** POST
- **Authentication:** None (token-based)
- **Expected Request:** `{ token, newPassword }`
- **Expected Response:** `{ success: true }`
- **Possible Errors:** 400 invalid/expired token, 400 weak password

---

## Users Module

### POST /api/users
- **Purpose:** Create a new account exactly one tier beneath the caller. Creates the user's profile and wallet in the same transaction.
- **Method:** POST
- **Authentication:** Required (Super Admin, Level 1, Level 2, or Level 3 — not Player)
- **Expected Request:** `{ username, email, password, role, status?, fullName?, displayName? }` — `role` must equal the caller's next tier down (e.g. Level 1 must pass `"level_2"`); `status` defaults to `"active"`.
- **Expected Response:** `{ user: { id, username, email, role, status, createdBy, createdAt, updatedAt, profile: { fullName, displayName, avatarUrl } } }`
- **Possible Errors:** 400 invalid input, 401 unauthorized, 403 role not permitted to create this tier, 409 username or email already taken

### GET /api/users
- **Purpose:** List accounts the caller may view — themselves plus every user in their descendant hierarchy (not just direct children).
- **Method:** GET
- **Authentication:** Required (any authenticated role)
- **Expected Request:** none
- **Expected Response:** `{ items: [...], total }`
- **Possible Errors:** 401 unauthorized

### GET /api/users/:id
- **Purpose:** Retrieve a single account — the caller's own, or anywhere in their descendant hierarchy.
- **Method:** GET
- **Authentication:** Required (self, or an ancestor in the hierarchy)
- **Expected Request:** none
- **Expected Response:** `{ user: { id, username, email, role, status, createdBy, createdAt, updatedAt, profile } }`
- **Possible Errors:** 401 unauthorized, 403 not in caller's hierarchy, 404 not found

### PUT /api/users/:id
- **Purpose:** Update email, status, and/or profile fields (`fullName`, `displayName`, `avatarUrl`). Role can never be changed here.
- **Method:** PUT
- **Authentication:** Required (self, or an ancestor in the hierarchy)
- **Expected Request:** `{ email?, status?, fullName?, displayName?, avatarUrl? }` — a `role` field in the body is rejected outright
- **Expected Response:** `{ user: { ... } }`
- **Possible Errors:** 400 invalid input or `role` present, 401 unauthorized, 403 not permitted or self attempting a status change, 404 not found, 409 email already taken

### PATCH /api/users/:id/status
- **Purpose:** Activate or freeze an account. A user may never change their own status (BR-19) — this always requires an ancestor.
- **Method:** PATCH
- **Authentication:** Required (an ancestor of the target account — never the account itself)
- **Expected Request:** `{ status: "active" | "frozen" }`
- **Expected Response:** `{ user: { ... } }`
- **Possible Errors:** 401 unauthorized, 403 not permitted (including self), 404 not found

### DELETE /api/users/:id
- **Purpose:** Not supported. User deletion is intentionally out of scope.
- **Method:** DELETE
- **Authentication:** Required
- **Expected Request:** none
- **Expected Response:** none
- **Possible Errors:** 401 unauthorized, 405 always returned for any authenticated request

---

## Wallet Module

### GET /api/wallet
- **Purpose:** Retrieve the caller's own wallet.
- **Method:** GET
- **Authentication:** Required (any role with a wallet — not Super Admin)
- **Expected Request:** none
- **Expected Response:** `{ wallet: { id, userId, balance, createdAt, updatedAt } }`
- **Possible Errors:** 401 unauthorized, 404 this account has no wallet (Super Admin, per FR-3.1)

### POST /api/wallet/transfer
- **Purpose:** Transfer points to an account the caller directly created (one hierarchy tier down, their own child — not any user at that tier, and not a more distant descendant).
- **Method:** POST
- **Authentication:** Required (Super Admin, Level 1, Level 2, or Level 3 — not Player)
- **Expected Request:** `{ recipientId, amount }` — `amount` must be a positive integer
- **Expected Response:** `{ transaction: { id, senderId, recipientId, amount, senderBalanceAfter, recipientBalanceAfter, createdAt } }`
- **Possible Errors:** 400 invalid `recipientId`/`amount`, 401 unauthorized, 403 sender is a Player, sender or recipient frozen, self-transfer, or recipient not the sender's own child, 404 sender or recipient not found, 409 insufficient balance

### GET /api/wallet/transactions
- **Purpose:** View the caller's own transaction history (sent or received), newest first.
- **Method:** GET
- **Authentication:** Required (any role with a wallet)
- **Expected Request:** none
- **Expected Response:** `{ items: [...], total }`
- **Possible Errors:** 401 unauthorized

---

## Game Module

### GET /api/games
- **Purpose:** List active arcade games and their point cost.
- **Method:** GET
- **Authentication:** Required (Player only)
- **Expected Request:** none
- **Expected Response:** `{ items: [{ id, name, description, pointCost, category }], total }`
- **Possible Errors:** 401 unauthorized, 403 non-Player role

### POST /api/games/:id/play
- **Purpose:** Start a game session; deducts the game's point cost from the caller's wallet.
- **Method:** POST
- **Authentication:** Required (Player only)
- **Expected Request:** none
- **Expected Response:** `{ session: { id, userId, gameId, gameName, pointsSpent, score, status, startedAt, completedAt, remainingBalance } }`
- **Possible Errors:** 400 invalid `id`, 401 unauthorized, 403 non-Player role or frozen account, 404 game not found or inactive, 409 insufficient balance

### POST /api/games/sessions/:sessionId/complete
- **Purpose:** Record the result of a completed game session.
- **Method:** POST
- **Authentication:** Required (Player, own session only)
- **Expected Request:** `{ score }` — must be a non-negative integer
- **Expected Response:** `{ session: { id, userId, gameId, pointsSpent, score, status, startedAt, completedAt } }`
- **Possible Errors:** 400 invalid `sessionId`/`score`, 401 unauthorized, 403 not own session, 404 session not found, 409 session already completed or abandoned

### GET /api/games/history
- **Purpose:** View the caller's own gameplay history, newest first.
- **Method:** GET
- **Authentication:** Required (Player only)
- **Expected Request:** none
- **Expected Response:** `{ items: [...], total }`
- **Possible Errors:** 401 unauthorized

---

## Reports Module

All three reports support `?startDate=<ISO 8601>&endDate=<ISO 8601>` (both optional; omitting both returns all-time data) and `?format=json|csv` (defaults to `json`). CSV responses return only the flat `items` list (no `summary`) as `text/csv` with a `Content-Disposition: attachment` header.

### GET /api/reports/point-distribution
- **Purpose:** Report on point transfers within the caller's own hierarchy (self + every descendant, found the same way `GET /api/users` scopes visibility — not just direct children).
- **Method:** GET
- **Authentication:** Required (Super Admin, Level 1, Level 2, Level 3 — not Player)
- **Expected Request:** `?startDate?&endDate?&format?`
- **Expected Response:** `{ summary: { totalAmount, transactionCount }, items: [{ id, type, senderId, senderUsername, recipientId, recipientUsername, amount, createdAt }] }` — `type` is currently always `"transfer"` (the only kind of `wallet_transactions` row that exists today), included so a future transaction type can be added without changing this report's shape.
- **Possible Errors:** 400 invalid `startDate`/`endDate`/`format`, 401 unauthorized, 403 Player role

### GET /api/reports/player-activity
- **Purpose:** Report on game session activity within the caller's own hierarchy.
- **Method:** GET
- **Authentication:** Required (Super Admin, Level 1, Level 2, Level 3 — not Player)
- **Expected Request:** `?startDate?&endDate?&format?`
- **Expected Response:** `{ summary: { sessionCount, totalPointsSpent, completed, inProgress, abandoned }, items: [{ id, userId, username, gameId, gameName, pointsSpent, score, status, startedAt, completedAt }] }`
- **Possible Errors:** 400 invalid `startDate`/`endDate`/`format`, 401 unauthorized, 403 Player role

### GET /api/reports/login
- **Purpose:** Report on login activity, platform-wide (not hierarchy-scoped).
- **Method:** GET
- **Authentication:** Required (Super Admin only)
- **Expected Request:** `?startDate?&endDate?&format?`
- **Expected Response:** `{ summary: { successCount, failureCount }, items: [{ id, userId, username, action, reason, attemptedUsername, createdAt }] }` — `userId`/`username` are `null` for a failed attempt against a username that doesn't exist (`attemptedUsername` captures it instead); `reason` is one of `invalid_credentials` or `account_frozen` for failures, `null` for successes.
- **Possible Errors:** 400 invalid `startDate`/`endDate`/`format`, 401 unauthorized, 403 non-Super-Admin role

---

## Notifications Module

Notification types: `account_created`, `wallet_transfer`, `password_changed`, `account_status_changed`, `game_completed`. All five are defined; `password_changed` has no automatic trigger yet, since there is no password-change endpoint anywhere in the API (FR-2.3 remains unimplemented) — it will fire automatically once that endpoint exists, without further changes to this module.

### GET /api/notifications
- **Purpose:** Retrieve the caller's own notifications, newest first.
- **Method:** GET
- **Authentication:** Required (any role)
- **Expected Request:** none
- **Expected Response:** `{ items: [{ id, type, message, isRead, createdAt }], total }`
- **Possible Errors:** 401 unauthorized

### PATCH /api/notifications/:id/read
- **Purpose:** Mark one of the caller's own notifications as read.
- **Method:** PATCH
- **Authentication:** Required (owner of the notification)
- **Expected Request:** none
- **Expected Response:** `{ notification: { id, type, message, isRead, createdAt } }`
- **Possible Errors:** 400 invalid `id`, 401 unauthorized, 403 not owner, 404 not found

### PATCH /api/notifications/read-all
- **Purpose:** Mark every unread notification belonging to the caller as read. Safe to call repeatedly — returns `{ updatedCount: 0 }` if there was nothing to update.
- **Method:** PATCH
- **Authentication:** Required (any role)
- **Expected Request:** none
- **Expected Response:** `{ updatedCount }`
- **Possible Errors:** 401 unauthorized

---

## Audit Module

Read-only by design (BR-27) — there is no update or delete endpoint for audit log entries anywhere in the API. Entries are written for logins (`login_success`, `login_failed`), user management (`user_created`, `user_updated`, `account_frozen`, `account_activated`), wallet transfers (`wallet_transfer`), and game sessions (`game_started`, `game_completed`) — see BR-25/BR-26. `password_changed` is not yet written, since no password-change endpoint exists anywhere in the API (FR-2.3 is unimplemented).

### GET /api/audit
- **Purpose:** Retrieve audit log entries, platform-wide (not hierarchy-scoped).
- **Method:** GET
- **Authentication:** Required (Super Admin only)
- **Expected Request:** `?actorId?&action?&entityType?&startDate?&endDate?` — all optional; omitted filters are not applied
- **Expected Response:** `{ items: [{ id, actorId, username, action, entityType, entityId, metadata, createdAt }], total }`
- **Possible Errors:** 400 invalid filter value, 401 unauthorized, 403 non-Super-Admin role

### GET /api/audit/:id
- **Purpose:** Retrieve a single audit log entry.
- **Method:** GET
- **Authentication:** Required (Super Admin only)
- **Expected Request:** none
- **Expected Response:** `{ entry: { id, actorId, username, action, entityType, entityId, metadata, createdAt } }`
- **Possible Errors:** 400 invalid `id`, 401 unauthorized, 403 non-Super-Admin role, 404 not found
