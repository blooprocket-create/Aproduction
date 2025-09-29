# High‑Class Services & Digital Products — Starter (Neon + Vercel)

Dark, sleek storefront for services, courses, and downloads. Vanilla HTML/CSS/JS + Vercel Serverless (Node) + Neon Postgres. Roles: admin, editor, customer.

## Quick Start
1. Create Neon DB; copy connection with `sslmode=require`.
2. Set Vercel ENV: `DATABASE_URL`, `JWT_SECRET` (64-char hex), `COOKIE_NAME=auth`.
3. Run `db/schema.sql` then `db/seed.sql` in Neon SQL editor.
4. `vercel dev` locally or deploy; open `/pages/index.html`.
5. Login (seed admin) or register; use Control Panel to add items.

## Notes
- Pseudo-checkout grants entitlements; swap with Stripe later.
- Keep visuals minimal and classy via `styles/base.css`.
