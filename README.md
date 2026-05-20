# Finance — Personal Finance Command Center

A self-hosted personal finance dashboard that gives you instant clarity on your complete financial life. Track net worth, assets, liabilities, cash flow, goals, and get intelligent insights — all in one glance.

Built with **Next.js 16**, **TypeScript**, **PostgreSQL**, **Drizzle ORM**, and **Better Auth**.

![Dashboard](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-private-blue)

---

## Features

### 📊 Dashboard
- **Net worth hero card** with sparkline chart and month-over-month change indicator
- **Quick stats grid** — Liquidity, Monthly Burn, Savings Rate, Runway
- **Goals preview** with progress rings
- **Monthly spend breakdown** with color-coded category bars
- **Recent transactions** list
- **Insights** preview (top 3)

### 💼 Portfolio
- **Total Assets / Liabilities / Net Worth** summary cards with animated numbers
- **Allocation donut chart** grouped by asset category (Cash, Bank, Investment, Property, Vehicle)
- **Holdings list** with expandable category accordions
- **Asset value change tracking** — shows ±value and ±% change from last snapshot using `ChangeIndicator` badges
- **Asset snapshots** — automatically recorded when values change, with full history
- **Liabilities tracking** with EMI, interest rate, and institution info
- **Add/Edit/Delete** modals for both assets and liabilities

### 💰 Cash Flow
- **Monthly income vs expenses** tracking
- **Transaction management** — add, categorize, and filter transactions
- **Category-based breakdown** with visual bars

### 🎯 Goals
- **Financial goal tracking** — set targets, deadlines, and monthly contributions
- **Progress visualization** with rings and percentages
- **Goal categories** — Emergency, Retirement, Purchase, Travel, Education

### 💡 Insights (AI-Powered)
- **Auto-generated insights** — triggered whenever you add/update assets, transactions, or goals
- **15+ insight types**:
  - Net worth status (positive/negative)
  - Debt-to-asset ratio warnings
  - Liquidity analysis
  - Spending spike detection (month-over-month comparison)
  - Savings rate tracking
  - Overspending alerts
  - Goal milestones (50%, 75%, 100%)
  - Goal deadline warnings
  - Emergency fund status
  - Asset diversification suggestions
- **Priority-based UI** — "Needs Attention" (high priority) separated from other insights
- **Type badges** — Celebration, Milestone, Suggestion, Warning, Anomaly
- **Dismiss & Refresh** — dismiss individual insights or regenerate all
- **Manual regeneration** via Refresh button

### 🛡️ Emergency Fund
- **Target months** configuration
- **Coverage calculation** based on essential monthly expenses
- **Linked asset tracking**

### 📅 Calendar
- **Financial calendar** view for upcoming payments and deadlines

### ⚙️ Settings
- **Currency** configuration (default: INR)
- **Theme** — Light, Dark, System
- **Financial month start day**
- **Weekly review day**

### 📱 PWA (Progressive Web App)
- **Installable** on mobile and desktop — add to home screen
- **Offline support** — cached pages and API responses via service worker
- **Network-first** strategy for API data, **cache-first** for static assets
- **App shell** pre-cached for instant loading
- **Standalone display** — runs without browser chrome

### 🔐 Authentication
- **Dual auth mode** — choose via `AUTH_MODE` env variable:
  - **`better-auth`** (default) — Full Better Auth with email/password login & registration
  - **`simple`** — Zero-login mode; a default user is auto-created on first boot. Perfect for personal/family use.
- **Session-based** security — all API routes are user-scoped
- **Onboarding flow** for new users

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| Styling | Tailwind CSS 4 + custom design system |
| State | React hooks + Zustand |
| Package Manager | pnpm |
| Fonts | Outfit (sans) + JetBrains Mono (mono) |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                  # Authenticated app pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── portfolio/          # Assets & liabilities
│   │   ├── cashflow/           # Income & expenses
│   │   ├── goals/              # Financial goals
│   │   ├── insights/           # AI-generated insights
│   │   ├── calendar/           # Financial calendar
│   │   ├── settings/           # User settings
│   │   └── onboarding/         # New user setup
│   ├── (auth)/                 # Login & register pages
│   └── api/                    # API routes
│       ├── assets/             # CRUD + snapshots
│       ├── liabilities/        # CRUD
│       ├── transactions/       # CRUD
│       ├── goals/              # CRUD
│       ├── insights/           # GET, POST (regenerate), PATCH (dismiss)
│       ├── dashboard/          # Aggregated dashboard data
│       ├── categories/         # Transaction categories
│       ├── emergency-fund/     # Emergency fund config
│       ├── settings/           # User settings
│       └── onboarding/         # Onboarding state
├── components/
│   ├── layout/                 # AppShell, Sidebar, BottomNav
│   └── ui/                     # Reusable UI components
├── lib/
│   ├── auth.ts                 # Better Auth configuration
│   ├── calculations.ts         # Financial calculation functions
│   ├── insights.ts             # Insight generation engine
│   ├── utils.ts                # Formatting utilities (INR, dates, etc.)
│   └── db/
│       ├── index.ts            # Database connection
│       ├── schema.ts           # Drizzle schema (all tables)
│       └── seed.ts             # Database seeding script
├── types/
│   └── index.ts                # TypeScript type definitions
└── proxy.ts                    # Dev proxy configuration

public/
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker
├── favicon.ico
└── icons/
    ├── icon.svg                # Source icon
    ├── icon-192.png            # PWA icon 192x192
    └── icon-512.png            # PWA icon 512x512

drizzle/
└── migrations/                 # Database migrations
```

---

## Self-Hosting Guide

### Prerequisites

- **Node.js** 20+ 
- **pnpm** (recommended) or npm
- **PostgreSQL** 14+ (local, Docker, or managed like Supabase/Neon)

### 1. Clone the Repository

```bash
git clone https://github.com/ashzero2/finance.git
cd finance
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# ── Database ──
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/finance"

# ── Better Auth ──
# Secret key for signing sessions (generate with: openssl rand -hex 32)
BETTER_AUTH_SECRET="your-secret-key-here"

# Base URL of your app (used for auth callbacks)
BETTER_AUTH_URL="http://localhost:3000"
```

#### Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Secret for session signing. Generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | ✅ | Full URL where the app is hosted (e.g., `https://finance.example.com`) |
| `AUTH_MODE` | ❌ | `"better-auth"` (default) or `"simple"` — see Auth Modes below |
| `NEXT_PUBLIC_AUTH_MODE` | ❌ | Must match `AUTH_MODE` (needed for client-side) |
| `DEFAULT_USER_NAME` | ❌ | Display name for simple-auth default user (default: `"User"`) |
| `DEFAULT_USER_EMAIL` | ❌ | Email for simple-auth default user (default: `"user@localhost"`) |
| `SIMPLE_AUTH_PASSWORD` | ❌ | Password gate for simple mode. If set, users must enter this password once before accessing the app. Cookie lasts 30 days. |

### 4. Choose Auth Mode

**For personal / family use (no login):**
```env
AUTH_MODE=simple
NEXT_PUBLIC_AUTH_MODE=simple
# Optionally customize:
# DEFAULT_USER_NAME=Rahul
# DEFAULT_USER_EMAIL=rahul@home
```
A default user is auto-created on first boot. Add a password gate to protect your instance:
```env
SIMPLE_AUTH_PASSWORD=your-secret-password
```
Users will see a simple password prompt on first visit. The session cookie lasts 30 days. If you omit `SIMPLE_AUTH_PASSWORD`, there's no login at all.

**For multi-user / shared hosting:**
```env
AUTH_MODE=better-auth
NEXT_PUBLIC_AUTH_MODE=better-auth
```
This is the default. Users sign up and log in with email/password via Better Auth.

### 5. Set Up the Database

#### Option A: Using Drizzle Push (Development / Quick Setup)

```bash
pnpm db:push
```

This pushes the schema directly to your database without creating migration files.

#### Option B: Using Migrations (Production)

```bash
# Generate migrations from schema
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

#### Option C: Using Docker for PostgreSQL

```bash
docker run -d \
  --name finance-db \
  -e POSTGRES_USER=finance \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=finance \
  -p 5432:5432 \
  postgres:16-alpine
```

Then set `DATABASE_URL="postgresql://finance:your_password@localhost:5432/finance"`.

### 6. (Optional) Seed Sample Data

```bash
pnpm db:seed
```

### 7. Run the App

#### Development

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

#### Production

```bash
# Build
pnpm build

# Start
pnpm start
```

The production server runs on port 3000 by default.

---

## Production Deployment

### Using a Reverse Proxy (Caddy)

A `Caddyfile.example` is included:

```caddy
finance.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Caddy automatically provisions TLS certificates via Let's Encrypt.

```bash
# Install Caddy
brew install caddy  # macOS
# or: sudo apt install caddy  # Ubuntu/Debian

# Copy and edit the Caddyfile
cp Caddyfile.example Caddyfile
# Edit 'finance.yourdomain.com' to your domain

# Run Caddy
caddy run
```

### Using Nginx

```nginx
server {
    listen 80;
    server_name finance.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

> **Note:** For Docker standalone output, add `output: "standalone"` to `next.config.ts`.

```bash
docker build -t finance .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e BETTER_AUTH_SECRET="..." \
  -e BETTER_AUTH_URL="https://finance.yourdomain.com" \
  finance
```

### Using Docker Compose

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: finance
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: finance
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://finance:changeme@db:5432/finance
      BETTER_AUTH_SECRET: your-secret-key-here
      BETTER_AUTH_URL: https://finance.yourdomain.com
    depends_on:
      - db

volumes:
  pgdata:
```

### Using systemd (Linux)

```ini
# /etc/systemd/system/finance.service
[Unit]
Description=Finance Dashboard
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/finance
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/finance/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable finance
sudo systemctl start finance
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:push` | Push schema directly to database (dev) |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm db:seed` | Seed database with sample data |

---

## Database Schema

The app uses the following main tables:

| Table | Purpose |
|-------|---------|
| `user` / `session` / `account` / `verification` | Better Auth tables |
| `assets` | Financial assets (cash, bank, investments, property, etc.) |
| `asset_snapshots` | Historical value snapshots for change tracking |
| `liabilities` | Loans, credit cards, personal debts |
| `categories` | Transaction categories (income/expense) |
| `transactions` | Income and expense transactions |
| `recurring_transactions` | Auto-recurring transaction templates |
| `goals` | Financial goals with targets and deadlines |
| `emergency_fund` | Emergency fund configuration per user |
| `financial_snapshots` | Periodic net worth / financial health snapshots |
| `insights` | Auto-generated financial insights |
| `user_settings` | Per-user preferences (currency, theme, etc.) |

Use `pnpm db:studio` to explore the database visually.

---

## API Reference

All API routes require authentication via session cookie. Unauthorized requests return `401`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Full aggregated dashboard data |
| `GET` | `/api/assets` | List all user assets |
| `POST` | `/api/assets` | Create asset (+ initial snapshot + insight refresh) |
| `PUT` | `/api/assets/[id]` | Update asset (+ snapshot + insight refresh) |
| `DELETE` | `/api/assets/[id]` | Delete asset |
| `GET` | `/api/assets/snapshots` | Asset value history & change data |
| `GET` | `/api/liabilities` | List all user liabilities |
| `POST` | `/api/liabilities` | Create liability |
| `PUT` | `/api/liabilities/[id]` | Update liability |
| `DELETE` | `/api/liabilities/[id]` | Delete liability |
| `GET` | `/api/transactions` | List transactions (filterable by type, month) |
| `POST` | `/api/transactions` | Create transaction (+ insight refresh) |
| `PUT` | `/api/transactions/[id]` | Update transaction |
| `DELETE` | `/api/transactions/[id]` | Delete transaction |
| `GET` | `/api/goals` | List all user goals |
| `POST` | `/api/goals` | Create goal |
| `PUT` | `/api/goals/[id]` | Update goal (+ insight refresh) |
| `DELETE` | `/api/goals/[id]` | Delete goal |
| `GET` | `/api/insights` | List active insights (non-dismissed) |
| `POST` | `/api/insights` | Regenerate all insights |
| `PATCH` | `/api/insights` | Dismiss or mark insight as read |
| `GET` | `/api/categories` | List transaction categories |
| `GET/PUT` | `/api/emergency-fund` | Emergency fund configuration |
| `GET/PUT` | `/api/settings` | User settings |
| `POST` | `/api/onboarding` | Complete onboarding |

---

## Configuration

### next.config.ts

The Next.js configuration is minimal:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Add for Docker deployments:
  // output: "standalone",
};

export default nextConfig;
```

### Customization

- **Currency**: Change default in `src/lib/db/schema.ts` (`userSettings.currency` default) and formatting in `src/lib/utils.ts`
- **Theme colors**: Edit CSS variables in `src/app/globals.css`
- **Insight rules**: Modify thresholds and add new rules in `src/lib/insights.ts`
- **Asset categories**: Edit enums in `src/lib/db/schema.ts` (requires migration)

---

## PWA Configuration

The app is a Progressive Web App with:

- **`public/manifest.json`** — App name, icons, display mode, theme
- **`public/sw.js`** — Service worker with caching strategies
- **Icons** — 192x192 and 512x512 PNG icons in `public/icons/`

To customize:
1. Replace icons in `public/icons/` with your own (keep the same filenames)
2. Edit `public/manifest.json` for app name, colors, etc.
3. Update cache version in `public/sw.js` (`CACHE_NAME`) when deploying updates

---

## License

Private — see repository for details.
