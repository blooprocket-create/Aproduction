Patch 15 — Fix Bad JSON: remove jsonwebtoken, add custom JWT, add /api/health

WHAT'S IN
- lib/jwt.js : tiny HS256 JWT signer/verifier (no deps)
- lib/auth.js : uses that JWT + cookie helpers (no 'Secure' for localhost)
- lib/db.js, lib/owned.js included for safety
- api/[...all].js : updated to use new auth helpers + adds GET /api/health

HOW TO APPLY
1) Ensure your repo has /lib/ with db.js, auth.js, owned.js, jwt.js from this patch.
2) Replace api/[...all].js with the one in this patch.
3) Commit & deploy.

TEST QUICKLY
- Open /api/health in the browser -> should return {"ok":true,"data":{"up":true}}
- Try /api/auth/register and /api/auth/login via the site.
