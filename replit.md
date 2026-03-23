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
- **API codegen**: Orval (from OpenAPI spec)
- **Mobile**: Expo SDK 54 / React Native
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Charts**: react-native-svg (custom donut chart)

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
│   ├── api-server/         # Express API server (auth, assets, expenses, loans)
│   └── xenfi/              # Expo React Native mobile app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/                # Utility scripts
```

## Features

- **Auth**: Email/password registration and login with JWT sessions
- **Dashboard**: Net worth overview, asset allocation donut chart, recent activity
- **Portfolio**: Add/edit/delete assets (Stocks, Crypto, Real Estate, Cash) with gain/loss tracking
- **Expenses**: Track spending with categories (Travel, Dining, Shopping, Bills, Investment)
- **Loans**: Track given and received loans with status (Pending/Paid) and overdue detection
- **Tax Module**: Premium-locked feature in Settings
- **Subscription Plans**: Free ($3 asset limit), Pro $19/month, $99/year, $249 lifetime

## Database Schema

- `users` — id, name, email, password_hash, is_premium, created_at
- `assets` — id, user_id, type (stocks/crypto/real_estate/cash), name, value, purchase_value
- `expenses` — id, user_id, amount, category, description, date
- `loans` — id, user_id, name, type (given/received), amount, due_date, status

## API Endpoints

- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login, returns JWT
- `GET /api/auth/me` — Get current user (auth required)
- `GET/POST /api/assets` — List/create assets (free plan limited to 3)
- `PUT/DELETE /api/assets/:id` — Update/delete asset
- `GET/POST /api/expenses` — List/create expenses
- `DELETE /api/expenses/:id` — Delete expense
- `GET/POST /api/loans` — List/create loans
- `PUT/DELETE /api/loans/:id` — Update/delete loan

## Development

```bash
# Run API server
pnpm --filter @workspace/api-server run dev

# Run Expo app
pnpm --filter @workspace/xenfi run dev

# Push database schema
pnpm --filter @workspace/db run push-force

# Run codegen after OpenAPI changes
pnpm --filter @workspace/api-spec run codegen
```
