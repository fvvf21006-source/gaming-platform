# 00 — Project Overview

## Business Overview

Gaming Platform is a hierarchical, role-based web application that manages controlled account creation, virtual point distribution, and gated access to simple arcade games. It follows a strict organizational model: only authorized users may create accounts beneath them, and virtual points flow through that hierarchy until they reach Players, who use those points to access games within the platform. Every activity in the system is recorded to ensure transparency and accountability.

This is an academic project. Virtual points carry no real-world monetary value, cannot be purchased with real currency, and cannot be exchanged or cashed out for real currency at any point in the system.

## Project Objective

To build a secure web application that demonstrates hierarchical management of users and virtual points, gated arcade game access, and complete auditability — implemented with a clean layered backend architecture (Controller → Service → Repository) and role-based access control throughout.

## Scope

**In scope:**
- Controlled (non-public) account creation across four hierarchy levels
- Secure authentication and role-based authorization
- Virtual point wallet and downward-only transfer system
- Simple arcade game access gated by wallet balance
- Administrative reporting (daily/weekly/monthly, point distribution, player activity, login reports)
- Notification system for significant account/wallet events
- Immutable audit logging across all sensitive actions

**Out of scope:**
- Any real-money payment processing, deposits, or withdrawals
- Public self-registration for any role
- Game-specific assets/rules beyond what the client (in this case, the course/project stakeholder) provides
- Hosting infrastructure and domain registration, unless separately agreed

## Users

| Role | Description |
|---|---|
| Super Admin | Unrestricted platform access; creates Level 1 accounts; owns configuration, reporting, and security |
| Level 1 | Creates Level 2 accounts; transfers points downward; monitors assigned Level 2 users |
| Level 2 | Creates Level 3 accounts; transfers points downward; manages assigned Level 3 users |
| Level 3 | Creates Player accounts; allocates points; monitors player activity |
| Player (Level 4) | Logs in, views wallet, accesses games, views gameplay history; cannot create accounts or transfer points |

## Hierarchy

```
Super Admin
     │
     ▼
  Level 1
     │
     ▼
  Level 2
     │
     ▼
  Level 3
     │
     ▼
Player (Level 4)
```

Each role may only create, view, and manage accounts in the tier directly beneath it. No level may act on an account that is not its direct descendant.

## Platform Workflow

1. Super Admin creates a Level 1 account.
2. Level 1 creates Level 2 accounts and transfers points to them.
3. Level 2 creates Level 3 accounts and transfers points to them.
4. Level 3 creates Player accounts and allocates points to them.
5. A Player logs in, and their wallet balance is verified.
6. Required points are deducted when the Player starts a game session.
7. Score and gameplay information are recorded; reports update automatically.
8. Every step above generates an audit log entry.

## Project Goals

- Demonstrate a secure, maintainable, layered backend architecture.
- Demonstrate correct implementation of role-based access control across a multi-level hierarchy.
- Demonstrate accurate, race-condition-safe virtual point transfers with full traceability.
- Produce documentation thorough enough that a new developer (or a future AI session) can onboard without additional context.

## Success Criteria

- All user roles function strictly according to their defined permissions.
- Virtual point transfers are accurate, downward-only, and fully recorded.
- Only authorized Players can access games, and only with sufficient wallet balance.
- Administrative reporting is accurate and complete.
- All critical actions are fully auditable.
- The platform operates reliably under expected academic-project usage.
