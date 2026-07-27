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

## Why Raw SQL

Raw SQL (via `pg`) over a full ORM keeps query behavior explicit and transparent, which matters for a project centered on strict, auditable balance/transaction rules where implicit ORM behavior (lazy loading, auto-generated joins) could obscure correctness issues.

## Why React

React's component model and large ecosystem (React Router, TanStack Query, React Hook Form) make it straightforward to build a role-aware, multi-view administrative and player-facing interface efficiently.

## Why Tailwind

Tailwind's utility-first approach speeds up building a consistent, responsive UI across the many distinct views this platform requires (dashboards per role, wallet views, game views) without maintaining a large separate CSS codebase.

## Why Express

Express is a minimal, well-understood Node.js framework that imposes little structure of its own, which pairs well with this project's explicit, self-imposed layered architecture (Controller → Service → Repository) rather than a more opinionated framework's conventions.