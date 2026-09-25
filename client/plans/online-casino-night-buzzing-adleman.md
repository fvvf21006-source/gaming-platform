# Online Casino Night — Multi-Level Virtual Points Gaming Platform

## Context

The user wants a full frontend UI for a Multi-Level Virtual Points Gaming Platform (described in the attached SRS) with a **night Vegas / neon casino shop vibe**. This is a visual prototype/demo — no real backend needed, all state lives in React. The deliverable is a polished, immersive UI that showcases every major screen from the SRS.

## Aesthetic Stance

**Dark Vegas Kinetic** — committed fully, no hedging.

- **Ground**: Near-black `#07070D` (casino floor at midnight)
- **Primary accent**: Rich casino gold `#C9993A` / `#FFD166`
- **Neon accents**: Electric cyan `#00D4FF`, hot magenta `#FF2D78`, neon green `#3DFF9A` (used sparingly for status/highlights)
- **Cards**: `#0F0F1A` with `1px` gold-tinted borders at low opacity
- **Typography**:
  - Display/headings: **Cinzel** (Google Font — Roman luxury, casino signage feel)
  - Body: **Outfit** (clean, modern, readable at small sizes)
  - Data/numbers: **JetBrains Mono** (tables, balances, audit logs)
- **Radius**: `8px` default, `4px` tight for table rows
- **Subtle glow effects** on cards and key stats via `box-shadow` with accent colors

## App Structure

Single-page React app with simulated multi-role views. No router needed — state-driven view switching.

### Views / Screens

1. **Login Screen** — full-screen dark with neon card, role selector dropdown (Super Admin / Level 1 / Level 2 / Level 3 / Player), username/password fields, "Enter the Casino" CTA
2. **Dashboard** (role-aware) — sidebar nav + main content area
3. **Super Admin Dashboard** — stats cards (total users, active players, points in circulation, transactions today), hierarchy tree visualization, recent audit log feed
4. **User Management** — table of users with role badges, freeze/activate toggle, create user modal, search/filter
5. **Wallet / Points** — wallet balance card, transfer points form, transaction history table
6. **Game Access** (Player view) — wallet display, "Play Now" button, game session history table
7. **Reports** — tab switcher (Daily / Weekly / Monthly), bar chart (recharts), export buttons (CSV / PDF placeholders)
8. **Audit Logs** — immutable log table with event type, user, timestamp, action detail; color-coded event types

### Navigation

- **Sidebar** (collapsible): Logo + "LUCKY CROWN" casino brand, nav links with neon icons, current user role badge, logout button
- **Topbar**: Current view title, notification bell (mock count), user avatar

## Files to Create / Modify

### `src/index.css`
- Add `@import` for Google Fonts (Cinzel, Outfit, JetBrains Mono) — first line
- Add CSS custom properties (design tokens) for dark casino palette
- Scrollbar hiding

### `src/App.tsx`
- Complete rewrite: login screen → role-aware dashboard shell with sidebar + all views as components

### New component files (all in `src/components/`):
- `LoginScreen.tsx`
- `Sidebar.tsx`
- `Topbar.tsx`
- `DashboardHome.tsx` — stats + hierarchy tree + audit feed
- `UserManagement.tsx` — table + create modal
- `WalletPanel.tsx` — balance + transfer + history
- `GameAccess.tsx` — player view
- `Reports.tsx` — recharts bar chart + tabs
- `AuditLogs.tsx` — log table

### `src/data/mockData.ts`
- Mock users, transactions, audit logs, game sessions — realistic names and numbers

## Key Implementation Details

- Install `recharts` for the reports chart
- All mock data in `src/data/mockData.ts` — realistic casino-style usernames and numbers
- Role-based nav: Super Admin sees all tabs; Level 1-3 see subset; Player sees only Wallet + Game + History
- Freeze/activate users via local React state toggle
- Transfer points form validates sender has sufficient balance (mock validation)
- Neon glow on primary stat cards using `box-shadow: 0 0 20px rgba(201,153,58,0.3)`
- Subtle animated gradient on login background (CSS keyframe, no library needed)
- Hierarchy tree in Super Admin dashboard rendered as nested flex boxes with connecting lines

## Verification

1. App renders login screen with no errors
2. Each role login shows the correct role-scoped navigation and dashboard
3. User management table renders with freeze/activate toggles working
4. Wallet transfer updates balances in local state
5. Reports tab shows recharts bar chart
6. Audit log table renders with color-coded event type badges
7. Responsive: sidebar collapses on narrow viewport (~1000px breakpoint)
