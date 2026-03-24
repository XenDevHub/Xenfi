# XenFi — Private Wealth Management OS

## Overview

A premium mobile fintech application for High-Net-Worth Individuals (HNWIs) to manage complex multi-asset portfolios. Built as a pnpm monorepo with Expo (React Native) mobile app and an Express API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Mobile**: Expo SDK 54 / React Native
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Charts**: react-native-svg (custom SVG donut chart)
- **State**: TanStack Query (React Query)

## Design System

- **Primary**: Deep Navy Blue (#0B1F3A)
- **Secondary**: Rich Charcoal (#1C1C1E)
- **Accent (Gold)**: #D4AF37
- **Highlight (Emerald)**: #1ABC9C
- **Background**: #070D18 (near black)
- **Font**: Inter (400, 500, 600, 700)
- Theme: Glassmorphism-inspired dark mode, luxury fintech feel

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── xenfi/              # Expo React Native mobile app
├── lib/
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/                # Utility scripts
```

## Mobile Screens (6 tabs)

- **Dashboard**: Net worth, HealthScoreCard gauge, Xeni insight card, market ticker
- **Portfolio**: Assets (Stocks, Crypto, Real Estate, Cash) with gain/loss tracking
- **Xeni**: AI assistant (chat, insights, monthly report tabs)
- **Expenses**: Monefy-style radial donut chart with:
  - 16 expense + 4 income preset categories arranged radially around SVG donut
  - Period filter: Day / Week / Month / Year / All with date navigation
  - Balance bar + red minus (expense) / green plus (income) buttons
  - Add transaction modal with numpad, category selector, date
  - Sidebar with Categories manager, Currencies manager, Period picker
  - List view: grouped by category, expandable transactions, delete
  - Custom categories (name, icon, color, type)
  - 12 preset + custom currencies, persistent default via AsyncStorage + DB
- **Loans**: Given/received loans with status and overdue detection
- **Settings**: Role badges, business mode toggle, admin panel, Xeni card

## Database Schema

- `users` — id, name, email, password_hash, business_mode, created_at
- `roles` — id, user_id, role (FREE/PRO/ADMIN)
- `assets` — id, user_id, type, name, value, purchase_value
- `expenses` — id, user_id, tx_type (income/expense), amount, category (text), currency, description, date
- `loans` — id, user_id, name, type (given/received), amount, due_date, status
- `categories` — id, user_id, name, icon, color, tx_type, is_custom
- `currencies` — id, user_id, code, symbol, name, is_default
- `market_cache` — id, symbol, price, change_24h, data, updated_at
- `ai_insights` — id, user_id, content, type, created_at
- `businesses` — id, user_id, name, type, created_at

## API Endpoints

- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login, returns JWT
- `GET /api/auth/me` — Get current user
- `GET/POST /api/assets` — List/create assets
- `PUT/DELETE /api/assets/:id` — Update/delete asset
- `GET/POST /api/expenses` — List/create transactions (income + expense)
- `DELETE /api/expenses/:id` — Delete transaction
- `GET/POST /api/loans` — List/create loans
- `PUT/DELETE /api/loans/:id` — Update/delete loan
- `GET /api/market` — Live crypto + mock stocks/gold/forex
- `GET /api/insights` — AI-generated financial insights
- `GET/PATCH /api/business/mode` — Business mode toggle
- `GET/POST/DELETE /api/categories` — Custom categories CRUD
- `GET/POST/PATCH/DELETE /api/currencies` — Currencies CRUD + set default

## Development

```bash
# Run API server
pnpm --filter @workspace/api-server run dev

# Run Expo app
pnpm --filter @workspace/xenfi run dev

# Push database schema
pnpm --filter @workspace/db run push-force
```
