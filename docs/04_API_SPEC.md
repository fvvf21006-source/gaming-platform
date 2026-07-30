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
- **Purpose:** Create a new account in the tier directly beneath the caller.
- **Method:** POST
- **Authentication:** Required (Super Admin, Level 1, Level 2, or Level 3)
- **Expected Request:** `{ username, password, roleAppropriateFields }`
- **Expected Response:** `{ id, username, role, createdBy }`
- **Possible Errors:** 400 invalid input, 401 unauthorized, 403 role not permitted to create this tier, 409 username taken

### GET /api/users/:id
- **Purpose:** Retrieve a single account's profile.
- **Method:** GET
- **Authentication:** Required (self, or an ancestor in the hierarchy)
- **Expected Request:** none
- **Expected Response:** `{ id, username, role, status, createdBy, createdAt }`
- **Possible Errors:** 401 unauthorized, 403 not in caller's hierarchy, 404 not found

### GET /api/users/children
- **Purpose:** List accounts directly created by the caller.
- **Method:** GET
- **Authentication:** Required (Super Admin, Level 1, Level 2, Level 3)
- **Expected Request:** query params for pagination/filtering
- **Expected Response:** `{ items: [...], total }`
- **Possible Errors:** 401 unauthorized

### PATCH /api/users/:id
- **Purpose:** Update a profile.
- **Method:** PATCH
- **Authentication:** Required (self, or an ancestor for limited fields)
- **Expected Request:** partial profile fields
- **Expected Response:** updated profile object
- **Possible Errors:** 400 invalid input, 401 unauthorized, 403 not permitted, 404 not found

### PATCH /api/users/:id/status
- **Purpose:** Freeze or activate an account.
- **Method:** PATCH
- **Authentication:** Required (an ancestor of the target account)
- **Expected Request:** `{ status: "frozen" | "active" }`
- **Expected Response:** `{ id, status }`
- **Possible Errors:** 401 unauthorized, 403 not permitted, 404 not found

---

## Wallet Module

### GET /api/wallet/balance
- **Purpose:** Retrieve the caller's current point balance.
- **Method:** GET
- **Authentication:** Required (any role with a wallet)
- **Expected Request:** none
- **Expected Response:** `{ balance }`
- **Possible Errors:** 401 unauthorized

### POST /api/wallet/transfer
- **Purpose:** Transfer points to a direct child account.
- **Method:** POST
- **Authentication:** Required (Super Admin, Level 1, Level 2, or Level 3)
- **Expected Request:** `{ recipientId, amount }`
- **Expected Response:** `{ transactionId, senderBalance, recipientBalance }`
- **Possible Errors:** 400 invalid amount, 401 unauthorized, 403 recipient not a direct child, 409 insufficient balance

### GET /api/wallet/transactions
- **Purpose:** View the caller's transaction history.
- **Method:** GET
- **Authentication:** Required (any role with a wallet)
- **Expected Request:** query params for pagination/date range
- **Expected Response:** `{ items: [...], total }`
- **Possible Errors:** 401 unauthorized

---

## Game Module

### GET /api/games
- **Purpose:** List available arcade games and their point cost.
- **Method:** GET
- **Authentication:** Required (Player)
- **Expected Request:** none
- **Expected Response:** `{ items: [{ id, name, pointCost }] }`
- **Possible Errors:** 401 unauthorized

### POST /api/games/:id/play
- **Purpose:** Start a game session; deducts required points.
- **Method:** POST
- **Authentication:** Required (Player)
- **Expected Request:** none
- **Expected Response:** `{ sessionId, remainingBalance }`
- **Possible Errors:** 401 unauthorized, 404 game not found, 409 insufficient balance

### POST /api/games/sessions/:sessionId/complete
- **Purpose:** Record the result of a completed game session.
- **Method:** POST
- **Authentication:** Required (Player, own session only)
- **Expected Request:** `{ score }`
- **Expected Response:** `{ sessionId, score, recordedAt }`
- **Possible Errors:** 400 invalid score, 401 unauthorized, 403 not own session, 404 session not found

### GET /api/games/history
- **Purpose:** View the Player's own gameplay history.
- **Method:** GET
- **Authentication:** Required (Player)
- **Expected Request:** query params for pagination/date range
- **Expected Response:** `{ items: [...], total }`
- **Possible Errors:** 401 unauthorized

---

## Reports Module

### GET /api/reports/point-distribution
- **Purpose:** Report on point distribution within the caller's hierarchy.
- **Method:** GET
- **Authentication:** Required (Super Admin, Level 1, Level 2, Level 3)
- **Expected Request:** query params (date range, format)
- **Expected Response:** report data or file (CSV/PDF)
- **Possible Errors:** 401 unauthorized, 403 not permitted

### GET /api/reports/player-activity
- **Purpose:** Report on player activity within the caller's hierarchy.
- **Method:** GET
- **Authentication:** Required (Super Admin, Level 1, Level 2, Level 3)
- **Expected Request:** query params (date range, format)
- **Expected Response:** report data or file
- **Possible Errors:** 401 unauthorized, 403 not permitted

### GET /api/reports/login
- **Purpose:** Report on login activity.
- **Method:** GET
- **Authentication:** Required (Super Admin)
- **Expected Request:** query params (date range, format)
- **Expected Response:** report data or file
- **Possible Errors:** 401 unauthorized, 403 not permitted

---

## Notifications Module

### GET /api/notifications
- **Purpose:** Retrieve the caller's notifications.
- **Method:** GET
- **Authentication:** Required (any role)
- **Expected Request:** query params for pagination
- **Expected Response:** `{ items: [...], total }`
- **Possible Errors:** 401 unauthorized

### PATCH /api/notifications/:id/read
- **Purpose:** Mark a notification as read.
- **Method:** PATCH
- **Authentication:** Required (owner of the notification)
- **Expected Request:** none
- **Expected Response:** `{ id, read: true }`
- **Possible Errors:** 401 unauthorized, 403 not owner, 404 not found

---

## Audit Module

### GET /api/audit-logs
- **Purpose:** Retrieve audit log entries within the caller's hierarchy scope.
- **Method:** GET
- **Authentication:** Required (Super Admin, or scoped for Level 1–3 over their own hierarchy)
- **Expected Request:** query params (date range, action type, actor, pagination)
- **Expected Response:** `{ items: [...], total }`
- **Possible Errors:** 401 unauthorized, 403 not permitted
