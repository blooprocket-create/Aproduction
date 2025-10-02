# High-Class Services & Digital Products - Starter (Neon + Vercel)

Dark, sleek storefront for services, courses, and downloads. Vanilla HTML/CSS/JS + Vercel Serverless (Node) + Neon Postgres. Roles: admin, editor, customer.

## Quick Start
1. Create a Neon database; copy the connection string with `sslmode=require`.
2. Copy `.env.example` to `.env.local` (or your deployment target) and fill in `DATABASE_URL`, `JWT_SECRET` (64-char hex), and optionally override `COOKIE_NAME`.
3. Set the same env vars in Vercel.
4. Run `db/schema.sql` then `db/seed.sql` in the Neon SQL editor.
5. Run `vercel dev` locally or deploy; open `/public/index.html`.
6. Login (seed admin credentials) or register; use the Control Panel to add items.

## Notes
- Pseudo-checkout grants entitlements; swap with Stripe later.
- Keep visuals minimal and classy via `styles/base.css`.
- Service requests, deliverables, and course content depend on the new tables in `db/schema.sql` - re-run migrations if you pulled an older clone.

Currently: Stable-ish
