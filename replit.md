# XenFi — Private Wealth OS

## Overview

XenFi is a premium mobile finance app (Expo/React Native) with a dark gold theme. It tracks personal and multi-business expenses/income, manages a portfolio of assets, tracks loans, and features Xeni — an AI financial advisor.

## Stack

- **Monorepo**: pnpm workspaces
- **Mobile**: Expo (React Native) — `artifacts/mobile`
- **API**: Express 5 + PostgreSQL (raw pg queries) — `artifacts/api-server`
- **Auth**: JWT (stored in AsyncStorage); `JWT_SECRET` env var
- **Build**: esbuild with `pg` and `bcrypt` in externals
- **Port**: API on 8080, Expo dev server auto-assigned

## Theme

- Background: `#070D18`, Card: `#0B1F3A`, Accent (gold): `#D4AF37`
- Green highlight: `#2ECC71`, Error red: `#E74C3C`, Blue: `#3498DB`

## Demo Credentials

- Email: `demo@xenfi.app` / Password: `XenFi2024!` (userId = 1)

## Database Tables

- `users` — id, email, password_hash, name, created_at
- `assets` — portfolio assets (stocks, crypto, real estate, etc.)
- `expenses` — transactions with `tx_type` (expense/income), `entity_type` (personal/business), `entity_id`
- `categories` — custom categories with `entity_type` + `entity_id`
- `loans` — loan tracking (given/received, status)
- `businesses` — id, user_id, name, type, color, icon, description

## Key Files

- `artifacts/mobile/app/(tabs)/expenses.tsx` — multi-entity expense tracker with business tabs, donut chart, 40+ category library
- `artifacts/mobile/app/(tabs)/xeni.tsx` — AI advisor: Chat, Insights, Full Report (per-entity) tabs
- `artifacts/mobile/services/insightsService.ts` — useInsights, useMonthlyReport, useFullReport hooks
- `artifacts/api-server/src/routes/insights.ts` — computeInsights(), /insights, /insights/report, /insights/full-report
- `artifacts/api-server/src/routes/businesses.ts` — CRUD + summary for business entities
- `artifacts/api-server/src/routes/expenses.ts` — entity-filtered expenses API
- `artifacts/api-server/build.mjs` — esbuild config; pg/bcrypt must stay in externals
- `artifacts/mobile/constants/colors.ts` — XenFi dark gold theme constants
- `artifacts/mobile/context/AuthContext.tsx` — JWT auth + AsyncStorage persistence

## Features

- **Multi-business entity support**: Personal + unlimited business entities, each tracked separately
- **Expenses**: Entity switcher tabs, 6 preset categories, 40+ library categories, donut chart
- **Portfolio**: Asset tracking with gain/loss, net worth
- **Loans**: Given/received loan tracking with status
- **Xeni AI**: Rule-based chat + Insights tab + Full Report tab (per-entity breakdown)
- **Full Report**: Consolidated view of all entities — revenue, expenses, profit margin, health score, recommendations
- **Market data**: Simulated real-time ticker

## API Routes

- `/api/auth` — login, register
- `/api/expenses` — entity-filtered CRUD
- `/api/categories` — entity-filtered custom categories
- `/api/assets` — portfolio management
- `/api/loans` — loan tracking
- `/api/businesses` — business entity CRUD + summary
- `/api/insights` — personal financial insights
- `/api/insights/report` — monthly report
- `/api/insights/full-report` — full multi-entity report

## Important Notes

- `pg` must remain in esbuild externals in `artifacts/api-server/build.mjs`
- All DB queries use raw SQL (not Drizzle) via `pg` Pool
- Expo app uses `@/` alias pointing to `artifacts/mobile/`
