# BazarX

**One Marketplace. Thousands of Stores.**

BazarX is a full-stack, multi-vendor ecommerce marketplace — customers shop from thousands of independent stores, sellers run a store with their own dashboard, and platform admins moderate and operate the whole marketplace from one console.

This is a real, working application: every button in this README's feature list is backed by a database write, a server-side authorization check, and (where money or inventory is involved) a database transaction. Nothing here is a static mockup.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Notes](#architecture-notes)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Docker](#docker)
- [Demo Accounts](#demo-accounts)
- [Testing](#testing)
- [Scope: What's Real, Light, or Deferred](#scope-whats-real-light-or-deferred)

## Features

**Customer marketplace** — homepage (hero carousel, flash deals, categories, featured/best-seller/new-arrival rails, top stores, recommendations, recently viewed), full-text-ish search with filters/sort/pagination, nested category browsing, product detail (variants, gallery, reviews, related products, sticky mobile buy bar), multi-seller cart, checkout (address, delivery, coupon, COD/mock payment), order tracking timeline, wishlist, store following, addresses, reviews, notifications.

**Seller dashboard** — KPI cards + revenue/order charts with date-range filters, an 8-step product wizard (info → images → pricing → inventory → variants → shipping → SEO → review), inventory with manual stock adjustments, order management with a status pipeline (pending → confirmed → processing → packed → shipped → out for delivery → delivered) and cancellation, returns handling, coupon management, store profile/branding, shipping-zone configuration, wallet/payouts (request → admin approve/reject → paid), review replies, customer list, analytics, CSV exports.

**Admin dashboard** — marketplace-wide KPIs and growth charts, seller approval/rejection/suspension with per-seller commission overrides, product moderation (approve/reject-with-reason/archive), category & brand CRUD (nested categories), banner management, all-orders view with refunds, payments ledger, global + per-category commission configuration, payout approval pipeline, coupon management, review moderation, user management (suspend/activate; role promotion restricted to `SUPER_ADMIN`), audit log, feature flags, CSV report exports.

**Cross-cutting** — role-based access control (`CUSTOMER` / `SELLER` / `ADMIN` / `SUPER_ADMIN`) enforced server-side on every mutation (never trusted from the client), transactional inventory reservation that cannot oversell under concurrent purchases, automatic commission calculation (seller override → category override → global default), a seller wallet ledger, audit logging of sensitive admin actions, SEO metadata + sitemap/robots + JSON-LD, and consistent JSON error responses on every API route.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, TypeScript strict) |
| UI | Tailwind CSS v4, shadcn/ui, Lucide icons, Framer Motion |
| Database | PostgreSQL |
| ORM | Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg` driver adapter) |
| Auth | Auth.js (NextAuth) v5, Credentials provider, JWT sessions |
| Validation | Zod |
| Forms | React Hook Form |
| Client state | Zustand (cart badge count only — everything else is server state) |
| Charts | Recharts via shadcn's chart wrapper |
| Testing | Vitest |

## Architecture Notes

**Service layer.** Business logic lives in `src/services/*`, not in components or route handlers. Route handlers, server actions, and the seed script all call the same service functions — there is exactly one code path for "place an order," whether it's a real checkout or the seed script populating demo data.

**Swappable providers.** `ImageService`, `PaymentService`, and `EmailService` are each defined as a TypeScript interface with a dev-safe default implementation:

- **Images** — `LocalDiskImageProvider` writes to `/public/uploads` by default; setting all three `CLOUDINARY_*` env vars switches to `CloudinaryImageProvider` automatically (see `src/services/image/index.ts`).
- **Payments** — `MockPaymentProvider` (card/wallet, always succeeds) and `CashOnDeliveryProvider` implement the same `PaymentProvider` interface (`createPayment` / `verifyPayment` / `refundPayment` / `getPaymentStatus`). A real Stripe/SSLCommerz/bKash/Nagad provider drops in behind the same interface without touching checkout code.
- **Email** — `ConsoleEmailProvider` logs every transactional email to stdout in dev; setting `EMAIL_SERVER_HOST` switches to a real SMTP provider via nodemailer.
- **Search** — `src/services/search.service.ts` is Prisma/SQL-backed today (`ILIKE` + indexed columns), isolated behind one `searchProducts()` function so a real search engine (Meilisearch/Typesense/Elasticsearch) can replace the implementation later.

**Inventory & concurrency.** Stock changes never go through a plain `UPDATE ... SET stock = stock - N`. Instead, `reserveAndSell()` issues a single conditional `UPDATE ... WHERE (stock - reserved) >= N RETURNING id` — under PostgreSQL's default READ COMMITTED isolation, a second concurrent purchase for the same row blocks on that row's lock and then re-evaluates the WHERE clause against the now-committed state, so it correctly fails instead of allowing stock to go negative. This is covered by an automated concurrency test (see [Testing](#testing)).

**Commission resolution.** `getEffectiveCommissionRate()` checks, in order: a seller-specific `Commission` row → a category-level `Commission` row → the platform's global rate (`Setting` key `commission.globalRate`). The resolved rate is snapshotted onto each `OrderItem` at purchase time, so a later rate change never rewrites historical order economics.

**Wallet lifecycle.** An order's seller earning is credited to `Wallet.pendingBalance` at order placement, then moved to the withdrawable `Wallet.balance` when that seller's suborder is marked `DELIVERED`. A payout request debits `balance` immediately (so the same funds can't be requested twice); `Payout.status` (PENDING → PROCESSING → PAID, or CANCELLED) is the source of truth for money in the withdrawal pipeline.

**Authorization.** `src/lib/rbac.ts` (for Server Components/Server Actions) and `src/lib/api-auth.ts` (for Route Handlers — `forbidden()`/`unauthorized()` only work inside a rendered React tree) are the single source of truth for access control. `src/proxy.ts` (Next 16's renamed `middleware.ts`) only provides a fast redirect before a protected page renders — it is a UX convenience, not a security boundary, and every service function that touches another party's data re-checks ownership itself (e.g. a seller's suborder update requires `sellerIdForAuth` to match).

## Project Structure

```
prisma/
  schema.prisma       # 45+ models — see the file for the full ER design
  seed.ts             # realistic demo data, reuses the real checkout/order-status services
src/
  app/
    (marketing)/      # customer-facing pages (home, search, product, cart, checkout, account, orders...)
    (auth)/           # login, register, register/seller, password reset, email verify
    seller/           # seller dashboard (role-guarded layout)
    admin/            # admin dashboard (role-guarded layout)
    api/              # route handlers: NextAuth, search suggestions, CSV exports
  components/
    ui/               # shadcn primitives
    shared/            layout/            home/            product/
    cart/              checkout/          order/           account/
    address/           coupon/            seller/           admin/
    dashboard/         store/
  features/           # server actions (mutations) + queries (reads) per domain
  services/           # business logic + swappable providers (image/payment/email/search)
  lib/                # auth, prisma client, rbac, api-auth, rate-limit, slug, currency, csv...
  validations/        # Zod schemas
  config/             # site config, nav definitions
  generated/prisma/   # generated Prisma client (gitignored)
```

## Environment Variables

Copy `.env.example` to `.env` and fill in real values. Every var is documented inline; the short version:

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | `npx auth secret` or `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | yes | Used for absolute URLs (emails, sitemap, JSON-LD) |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | no | Leave blank to use local-disk image storage |
| `EMAIL_SERVER_HOST` (+ `_PORT`/`_USER`/`_PASSWORD`) | no | Leave blank to log emails to the console |
| `STRIPE_*` | no | Placeholders only — see [Scope](#scope-whats-real-light-or-deferred) |

## Getting Started

```bash
npm install

# Start Postgres — pick ONE:
docker compose up -d postgres          # option A: Docker (recommended for a real setup)
npx prisma dev                         # option B: no Docker/sudo needed — see note below

npx prisma generate
npx prisma migrate dev
npx prisma db seed

npm run dev
```

Then visit `http://localhost:3000` and sign in with one of the [demo accounts](#demo-accounts).

> **No Docker or sudo available?** `npx prisma dev` starts a local Postgres server in user space (no root/Docker needed) and prints a `DATABASE_URL` — paste it into `.env`. It's genuinely real Postgres and everything in this app works against it identically to Docker, with one caveat: its connection is proxied, and the `pg` driver's prepared-statement caching doesn't get along with that proxy under sustained concurrent load (this is what `vitest.config.mts`'s `fileParallelism: false` works around for the test suite). For anything beyond local development/demos — and especially before deploying — use Docker Postgres or a real hosted Postgres instead.

Other commands:

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # ESLint
npm run test    # Vitest (some tests need a live, migrated DATABASE_URL — see Testing)
```

## Docker

```bash
docker compose up --build
```

This starts Postgres and the app together (`docker-compose.yml`); the app image is built from the multi-stage `Dockerfile` (Next's `output: "standalone"`). Run migrations/seed against the compose Postgres the same way as above, pointing `DATABASE_URL` at `postgresql://bazarx:bazarx@localhost:5432/bazarx` from your host, or `postgres` as the hostname from inside another container.

## Demo Accounts

Seeded by `prisma/seed.ts` — **development/demo only**, never use these in a real deployment.

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@bazarx.demo` | `Demo@12345` |
| Admin | `admin@bazarx.demo` | `Demo@12345` |
| Seller (TechWorld) | `seller@bazarx.demo` | `Demo@12345` |
| Customer | `customer@bazarx.demo` | `Demo@12345` |

The seed also creates 2 admins, 10 sellers/stores, 30 customers, 100+ products across 21 categories and 15 brands, 55+ orders in various lifecycle states, reviews, returns, payouts, coupons, and banners — by calling the same `createOrder` / `updateSellerOrderStatus` / `createReview` / `requestReturn` services a real user would trigger, not a separate fake-data path.

## Testing

```bash
npm run test
```

`src/services/__tests__/commission.service.test.ts` is pure and needs no database. The rest (`inventory.service.test.ts`, `coupon.service.test.ts`, `authorization-boundary.test.ts`) run against the real `DATABASE_URL` — run `npx prisma migrate dev` first. Highlights:

- **Oversell prevention**: two simultaneous `reserveAndSell` calls for the last unit of stock — exactly one succeeds, inventory never goes negative.
- **Coupon rules**: expiry, minimum order amount, per-user usage limits, seller-scoped discount calculation.
- **Cross-seller authorization**: a seller cannot update another seller's suborder status, even calling the service function directly.

These tests create their own fixtures (via `src/services/__tests__/test-helpers.ts`) but don't delete them afterward, so they'll leave extra users/products alongside your seeded demo data. Run `npx prisma db seed` afterward to wipe and restore a clean demo dataset — don't run the test suite against a database whose extra rows you care about keeping.

## Scope: What's Real, Light, or Deferred

Given the size of this spec, this README is explicit about depth rather than silently dropping things.

**Fully real, end-to-end**: auth/RBAC, seller onboarding → admin approval, product CRUD with variants → admin moderation, catalog browse/search/filter/sort, multi-seller cart & checkout, transactional order creation & inventory, order tracking, seller/admin order management, payment abstraction (Mock + COD), commission calculation, seller wallet & payouts, coupons, wishlist, reviews (verified-purchase only) + moderation, addresses, notifications, both dashboards' KPIs/charts, banners, audit logging, CSV exports, SEO basics, and the security/authorization model described above.

**Real but intentionally lighter**: the return/refund workflow settles a refund as soon as an admin confirms an approved return rather than modeling a full courier pickup/received pipeline; store-follow, recently-viewed, and "recommended for you" use straightforward rule-based logic (`RecommendationService` is one function you can later swap for a real ranking model); feature flags are simple DB-backed booleans with a small admin toggle UI rather than a targeting/rollout system.

**Documented, not built**: real Stripe/SSLCommerz/bKash/Nagad integrations (the `PaymentProvider` interface is ready for them), a real search engine (Meilisearch/Elasticsearch — `SearchService` is isolated for this), a product-comparison UI, and PDF invoice generation. None of these have a dead button in the UI advertising them — they simply aren't in the nav.

## Security Notes

- Passwords are hashed with bcrypt; sessions are JWT-based via Auth.js.
- Every mutation re-validates input with Zod and re-checks role/ownership server-side — the client's role claim is never trusted.
- File uploads are validated by MIME type and size before hitting the image provider.
- Auth-adjacent routes (password reset requests) are rate-limited.
- `next.config.ts` sets standard security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- `npm audit` reports 4 high-severity advisories in `mysql2`/`deepmerge-ts` — these are transitive dependencies of the Prisma **CLI's** multi-database config support and are never loaded by the running application (this project only uses the PostgreSQL adapter at runtime).
# santal-mart
