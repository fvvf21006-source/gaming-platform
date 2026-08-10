# 04 — API Specification

This document describes the expected REST API structure by module. It does not define implementation — only the contract each endpoint is expected to fulfill.

---

## Authentication Module

### POST /api/auth/login
- **Purpose:** Authenticate a user and issue a JWT.
- **Method:** POST
- **Authentication:** None
- **Expected Request:** `{ username, password }`
- **Expected Response:** `{ token, user: { id, username, email, role, status, mustChangePassword } }` — `mustChangePassword` is `true` if an administrator reset this account's password (see Users Module) and the user hasn't changed it since; login succeeds either way.
- **Possible Errors:** 400 invalid input, 401 invalid credentials, 403 account frozen, 429 too many attempts (lockout)

### GET /api/auth/me
- **Purpose:** Retrieve the authenticated user's own account information.
- **Method:** GET
- **Authentication:** Required (any authenticated role)
- **Expected Request:** none (token in header)
- **Expected Response:** `{ user: { id, username, email, role, status, mustChangePassword } }`
- **Possible Errors:** 401 missing/invalid/expired token, 404 user not found

### PUT /api/auth/change-password
- **Purpose:** Change the caller's own password. Always clears `mustChangePassword`, regardless of its prior value.
- **Method:** PUT
- **Authentication:** Required (any role)
- **Expected Request:** `{ currentPassword, newPassword }` — `newPassword` must be at least 8 characters and different from `currentPassword`
- **Expected Response:** `{ message: "Password changed successfully" }`
- **Possible Errors:** 400 invalid input or new password same as current, 401 unauthorized or current password incorrect

### POST /api/auth/logout
- **Purpose:** Invalidate the current session.
- **Method:** POST
- **Authentication:** Required (any role)
- **Expected Request:** none (token in header)
- **Expected Response:** `{ success: true }`
- **Possible Errors:** 401 unauthorized

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

### POST /api/users/:id/reset-password
- **Purpose:** Reset a user's password to a freshly generated, random temporary password. The administrator never chooses the value — it is always generated server-side and returned exactly once; it is never stored in plaintext anywhere. Sets `mustChangePassword` on the target account.
- **Method:** POST
- **Authentication:** Required (an ancestor of the target account, anywhere in the hierarchy — same breadth as administrative point adjustment, not just a direct child; never the account itself — self-service password changes use `PUT /api/auth/change-password` instead)
- **Expected Request:** none
- **Expected Response:** `{ temporaryPassword: "..." }`
- **Possible Errors:** 401 unauthorized, 403 not permitted (including self or Player), 404 not found

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
- **Purpose:** Transfer points to an account the caller directly created (one hierarchy tier down, their own child — not any user at that tier, and not a more distant descendant). **Super Admin transfers are unlimited** — Super Admin has no wallet and no balance check applies; `senderBalanceAfter` is `null` in the response for these transfers, since there is no real balance to report. Every other role's balance check is unchanged.
- **Method:** POST
- **Authentication:** Required (Super Admin, Level 1, Level 2, or Level 3 — not Player)
- **Expected Request:** `{ recipientId, amount }` — `amount` must be a positive integer
- **Expected Response:** `{ transaction: { id, senderId, recipientId, amount, senderBalanceAfter, recipientBalanceAfter, transactionType, createdAt } }` — `transactionType` is `"transfer"` for every row this endpoint creates, including Super Admin's unlimited ones
- **Possible Errors:** 400 invalid `recipientId`/`amount`, 401 unauthorized, 403 sender is a Player, sender or recipient frozen, self-transfer, or recipient not the sender's own child, 404 sender or recipient not found, 409 insufficient balance (never for Super Admin)

### POST /api/wallet/adjust
- **Purpose:** Administratively add, remove, or set a user's balance, with a required reason. Not a hierarchy transfer — Super Admin may adjust anyone; Level 1–3 may only adjust someone in their own hierarchy (self or any descendant, not just a direct child).
- **Method:** POST
- **Authentication:** Required (Super Admin, Level 1, Level 2, or Level 3 — not Player)
- **Expected Request:** `{ userId, operation: "add"|"remove"|"set", amount, reason }` — `amount` must be a positive integer for `add`/`remove`, a non-negative integer for `set`; `reason` is required, max 500 characters
- **Expected Response:** `{ transaction: { ... } | null, oldBalance, newBalance }` — `transaction` is `null` only when a `set` operation didn't actually change the balance (no `wallet_transactions` row is written for a true no-op)
- **Possible Errors:** 400 invalid input, 401 unauthorized, 403 target is Super Admin, target outside caller's hierarchy, or caller is a Player, 404 user or wallet not found, 409 adjustment would make the balance negative

### GET /api/wallet/transactions
- **Purpose:** View the caller's own transaction history (sent or received), newest first.
- **Method:** GET
- **Authentication:** Required (any role with a wallet)
- **Expected Request:** none
- **Expected Response:** `{ items: [...], total }` — each item includes `transactionType`
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
- **Expected Response:** `{ summary: { totalAmount, transactionCount }, items: [{ id, type, senderId, senderUsername, recipientId, recipientUsername, amount, createdAt }] }` — `type` is `"transfer"` for ordinary hierarchy transfers (including Super Admin's unlimited ones) or `"admin_add"`/`"admin_remove"`/`"admin_set"` for administrative point adjustments (see Wallet Module).
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

Notification types: `account_created`, `wallet_transfer`, `password_changed`, `password_reset`, `account_status_changed`, `game_completed`, `points_adjusted`. All seven are wired to a real trigger.

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

Read-only by design (BR-27) — there is no update or delete endpoint for audit log entries anywhere in the API. Entries are written for logins (`login_success`, `login_failed`), user management (`user_created`, `user_updated`, `account_frozen`, `account_activated`), wallet transfers (`wallet_transfer`), administrative point adjustments (`points_adjusted`), game sessions (`game_started`, `game_completed`), and passwords (`password_changed`, `password_reset`) — see BR-25/BR-26.

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
