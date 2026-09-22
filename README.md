# Aurevia

A storefront for selling a small catalogue of physical products to customers in
**India and the United States**, with prices shown in the right currency and
payments taken through the right gateway in each market.

Built on Next.js 16 (App Router) + Tailwind v4.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in at least ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000. The catalogue seeds itself with eight placeholder
products the first time it runs, so there is something to look at immediately.
Delete them from `/admin` when you add your own.

---

## How it fits together

```
src/
  app/
    (storefront)/        Public site — home, shop, product, checkout success
    admin/               Password-gated catalogue management
    api/                 Checkout, payment confirmation, webhooks, uploads
  components/            UI, split server/client by what needs interactivity
  lib/
    brand.ts             Name, tagline, contact email — change branding here
    money.ts             Per-currency formatting and minor-unit maths
    region.ts            Country → currency
    repository/          Data access behind a swappable interface
    storage/             Media uploads behind a swappable interface
    payments/            Razorpay + Stripe behind one gateway interface
  proxy.ts               Resolves the visitor's currency at the edge
```

### Currency

Visitors in **India see ₹ INR**; everyone else sees **$ USD**. `src/proxy.ts`
reads the hosting platform's geo header (`x-vercel-ip-country`, `cf-ipcountry`,
and others), picks the currency and stores it in a cookie. The switcher in the
header lets anyone override that, and their choice wins from then on.

Prices are **not converted at runtime**. Every product carries a real, separate
price in each currency, set by you, so customers see round numbers and your
margins don't drift with the exchange rate. The admin form will *suggest* a USD
price from the rupee one, but it's only a starting point.

Locally there is no geo header, so set `DEV_COUNTRY=IN` in `.env.local` to see
the site the way a visitor in India would.

### Payments

| Currency | Gateway  | Why |
| -------- | -------- | --- |
| INR      | Razorpay | UPI, netbanking, RuPay — what Indian customers actually use |
| USD      | Stripe   | Best card acceptance and lowest friction outside India |

Both sit behind one `PaymentGateway` interface (`src/lib/payments/`), and
`/api/checkout` picks the right one from the currency. The browser gets either a
Razorpay modal or a Stripe redirect without the rest of the app caring which.

Set `GATEWAY_INR` / `GATEWAY_USD` if you later consolidate onto one provider.

**Before you can take money:**

1. Add the keys from `.env.example` to `.env.local`.
2. Register both webhooks (URLs and events are listed in `.env.example`).
3. In Razorpay, enable **International Payments** only if you also want to
   charge non-Indian cards through it.

Until keys are present, checkout is *honestly* disabled — the Buy button
explains that and offers an email fallback rather than failing at the last step.

Order totals are always recomputed on the server from the stored price. Nothing
the browser sends about money is trusted. Webhook signatures are verified before
any order is marked paid, and an unsigned or wrongly-signed webhook is rejected.

### Data and media

Two backends, chosen automatically:

| | Products & orders | Images & video |
| --- | --- | --- |
| **Supabase** (when its keys are set) | Postgres | Supabase Storage |
| **Local** (no keys — laptop only) | JSON files in `data/` | `public/uploads/` |

Everything goes through two small interfaces — `ProductRepository` /
`OrderRepository` in `src/lib/repository/contracts.ts`, and `StorageAdapter`
in `src/lib/storage/` — so no page or component knows which backend is live.
The admin shows which one it's saving to.

The local backend exists so the app runs with zero setup. **It cannot save
anything on Netlify or Vercel**, whose servers can't write files; there the
site falls back to read-only sample data and the admin says so.

#### Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql),
   **Run**. Creates the tables, indexes, the `product-media` storage bucket and
   the payment function. Safe to re-run.
3. **Project Settings → API**: copy the project URL, the *publishable* key and
   the *secret* key into `.env.local` (names are in `.env.example`).
4. `npm run db:import` — copies your local products, orders and uploaded media
   into Supabase. Safe to re-run.
5. Add the same three variables in **Netlify → Site configuration →
   Environment variables**, then redeploy.

What the database adds beyond "it persists":

- **Stock goes down when something sells.** `mark_order_paid` locks the order,
  marks it paid and reduces inventory in one transaction, exactly once — even
  when the browser, success page and webhook all confirm the same payment.
- **Deleting a product never deletes its sales history** (`ON DELETE SET NULL`),
  and orders keep the title and price as they were at purchase.
- **Nothing is readable with the public key.** Row Level Security is on with no
  policies; only the server, holding the secret key, can touch the tables.
- **Uploads go straight from the browser to storage** via short-lived signed
  URLs, after the server checks the admin session, file type and size. Netlify
  rejects function request bodies over ~6 MB, so video couldn't go through our
  server anyway.

Limits: Supabase's free plan caps a single file at **50 MB**, which is the video
limit in production (100 MB locally).

Remote image hosts must be allowlisted in `next.config.ts` before `next/image`
will render them; Supabase Storage already is.

### Admin

`/admin` is locked until `ADMIN_PASSWORD` is set — it is never open by default.
Sessions are HMAC-signed, httpOnly cookies lasting 12 hours, and every Server
Action re-checks authorisation itself, because Server Actions are reachable by
direct POST and guarding the layout alone would not be enough.

This is intentionally minimal single-operator auth. If more than one person
needs access, or you need audit trails, replace it with a real auth provider.

### Pagination

`/products?page=2`, six per page (`PRODUCTS_PER_PAGE` in
`src/lib/repository/products.ts`). Rendered on the server from `searchParams`,
so pages are linkable, shareable and crawlable. Out-of-range pages clamp to the
last valid one instead of 404-ing.

### Categories

Not modelled yet, as you asked. Products have an optional `category` string, and
filter chips appear on the shop page automatically as soon as any product has
one. When you're ready for real categories, that field is the seam to build on.

---

## Branding

Everything customer-facing lives in `src/lib/brand.ts` — name, wordmark,
tagline, contact email, social links. The palette and type scale are tokens at
the top of `src/app/globals.css`.

The contact address is a placeholder (`hello@aurevia.com`). Set
`NEXT_PUBLIC_CONTACT_EMAIL` to a real inbox before launch — it's used in the
footer and every "email us" link on the site.

The design is light-only by intent: the brand reads as printed matter, and a
dark inversion of a cream-and-brass system loses what makes it work.

---

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint
```
