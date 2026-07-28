# 01 — Requirements

Structured requirements derived from the Software Requirements Proposal (v1.0, 18 July 2026).

## Functional Requirements

### Authentication
- FR-1.1: Users must log in securely with credentials (JWT-based session).
- FR-1.2: Users must be able to reset their password.
- FR-1.3: The system must manage sessions, including timeout.
- FR-1.4: All actions must be authorized based on the user's role.
- FR-1.5: The system must track login history and support account lockout protection.

### User Management
- FR-2.1: Each role (except Player) can create accounts only in the tier directly beneath it.
- FR-2.2: Users can manage their own profile.
- FR-2.3: Users can change their own password.
- FR-2.4: Administrators (Super Admin and above the target account) can freeze or activate an account.
- FR-2.5: The system must maintain and expose hierarchy relationships (who created whom).
- FR-2.6: There is no public self-registration for any role.

### Wallet Management
- FR-3.1: Every account (except Super Admin, which configures balances directly) has a virtual point wallet.
- FR-3.2: Points can only be transferred from a user to a direct child account.
- FR-3.3: A transfer must never cause the sender's balance to go negative.
- FR-3.4: Every transfer is permanently recorded in transaction history.
- FR-3.5: Users can view their current balance and transaction history.

### Game Management
- FR-4.1: Players can access a game only if their wallet balance meets the required point cost.
- FR-4.2: Required points are deducted at the start of a game session.
- FR-4.3: Game scores and gameplay information are recorded per session.
- FR-4.4: Players can view their own gameplay history.

### Reporting
- FR-5.1: The system generates daily, weekly, and monthly reports.
- FR-5.2: The system generates point distribution and player activity reports.
- FR-5.3: The system generates login reports.
- FR-5.4: Reports must be exportable to CSV and PDF.

### Notifications
- FR-6.1: Users are notified of account creation, point transfers, password changes, account status changes, and game completion.

### Audit Logging
- FR-7.1: The system maintains immutable logs for user creation, point transfers, administrative actions, login activity, password resets, and game sessions.
- FR-7.2: Audit logs must be reviewable by authorized administrators.

### Administrative Dashboard
- FR-8.1: The dashboard shows user statistics, active user monitoring, hierarchy visualization, point distribution tracking, transaction monitoring, and audit log access.

## Non-Functional Requirements

- NFR-1: **Secure** — RBAC, password hashing (bcrypt), JWT authentication, permission validation on every operation.
- NFR-2: **Scalable** — architecture must support future growth without significant redesign.
- NFR-3: **Responsive** — usable across common device/screen sizes.
- NFR-4: **Maintainable** — clean separation of concerns (Controller/Service/Repository).
- NFR-5: **Reliable** — the platform must operate correctly under expected usage.
- NFR-6: **Modular** — features should be addable/removable with minimal cross-impact.
- NFR-7: **Extensible** — architecture should support future enhancements without significant redesign.

## Modules

1. Authentication
2. User Management
3. Wallet Management
4. Game Management
5. Reporting
6. Notification System
7. Audit Logging
8. Administrative Dashboard

## Roles

- Super Admin
- Level 1
- Level 2
- Level 3
- Player (Level 4)

## Deliverables

- Responsive web application
- Administrative dashboard
- Role-based authentication
- User management system
- Virtual wallet
- Point transfer system
- Game integration (simple arcade games)
- Reporting module
- Notification module
- Audit logging
- API documentation
- Deployment support
- Source code

## Future Enhancements

- Additional game types/integrations
- Advanced analytics on the administrative dashboard
- Configurable notification channels (email/SMS/push)
- Multi-language support
- Expanded export formats for reporting
