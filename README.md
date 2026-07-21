# CreditPlum

A credit-education and product-comparison site for people rebuilding credit.
Node.js + Express + MongoDB backend, a static frontend, and an AI assistant
("Plum") powered by the Anthropic API.

This is a **working foundation**, not a finished product. See "What's built" and
"Next steps" below so you know exactly where the edges are.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# then edit .env and set:
#   MONGO_URI, JWT_SECRET, FIELD_ENCRYPTION_KEY, ANTHROPIC_API_KEY

# generate secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # FIELD_ENCRYPTION_KEY

# 3. Seed sample products + articles
npm run seed

# 4. Run
npm run dev      # or: npm start
# open http://localhost:4000
```

You need MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB
Atlas connection string.

### Making yourself an admin
1. Register an account in the UI with the email you set as `ADMIN_EMAIL`.
2. Re-run `npm run seed` — it promotes that account to `admin`.
3. Admin endpoints live under `/api/admin/*` (send your JWT as a Bearer token).

---

## Architecture

```
server.js            Express app: security middleware, routes, static hosting
config/db.js         Mongoose connection
middleware/auth.js   JWT issue/verify, requireAuth / requireAdmin guards
utils/crypto.js      AES-256-GCM field encryption for sensitive at-rest data
models/              User, Product, Article, AffiliateEvent
routes/
  auth.js            register / login / profile / favorites
  products.js        filter + rank products by score & category
  articles.js        blog list + detail
  affiliate.js       /go/:slug tracked redirect + conversion postback
  chatbot.js         /api/chat -> Anthropic API, grounded on live catalog
  admin.js           manage products/articles + conversion analytics
seed/seed.js         sample products + original credit-education articles
public/              static frontend (HTML/CSS/JS) + robots.txt + sitemap.xml
```

### How key pieces work

**Score matching.** `GET /api/products?score=560&category=secured-card` returns
products annotated with an `estimatedApprovalOdds` value. The frontend renders
these as a plum "ripeness" meter (green = likely, amber = maybe, red = long shot).
Odds are editorial estimates and the UI always labels them as such.

**Affiliate tracking.** Product links point at `/go/:slug`, which logs a click
with a random `clickId`, then 302-redirects to the partner with that id appended
as `subid`. When the partner fires a server-to-server postback to
`/api/affiliate/postback?subid=...&payout=...`, the matching click is marked
converted. `/api/admin/analytics` aggregates clicks, conversions, and revenue.

**The chatbot.** `POST /api/chat` sends the running transcript plus a system
prompt (in `routes/chatbot.js`) to the Anthropic API. Before each call it loads a
short summary of the current product catalog and articles as grounding context,
so answers reflect real CreditPlum inventory. The system prompt sets the voice
and hard safety rules: no guaranteed approvals, no illegal/deceptive tactics,
no collecting SSNs or card numbers, and referral to nonprofit counseling for
crises. Model is set via `CHATBOT_MODEL` (default `claude-sonnet-5`).

---

## Security notes

- Passwords are bcrypt-hashed (cost 12), never stored or logged in plaintext.
- JWTs for auth; helmet for security headers + CSP; rate limits on `/api` and a
  tighter one on `/api/chat`.
- `utils/crypto.js` gives AES-256-GCM encryption for genuinely sensitive fields.
- We deliberately **do not** store raw IPs (only a salted, truncated hash) and
  **do not** collect card numbers, SSNs, or bank credentials anywhere. Anything
  like that must live with a PCI/SOC2-compliant processor — not this app.

Before going live you'll want: httpOnly cookie sessions (or refresh tokens),
email verification + password reset, CSRF protection if you move off Bearer
tokens, secret management, and a security review. This scaffold is a strong
start, not a substitute for that review.

---

## Content

All seeded articles are original, written for CreditPlum in plain language.
The sample **products** are placeholders with `example.com` affiliate links so the
app runs end-to-end — replace them (via the admin API or the seed file) with real,
disclosed partner offers before launch.

---

## What's built

- [x] Express API with security middleware and rate limiting
- [x] MongoDB models for users, products, articles, affiliate events
- [x] JWT auth: register, login, profile, saved favorites
- [x] Product filtering + approval-odds ranking by credit score
- [x] Affiliate click tracking + conversion postback + admin analytics
- [x] Blog API + 3 original seed articles
- [x] AI chatbot grounded on the live catalog, with safety guardrails
- [x] Mobile-friendly, SEO-structured landing page with the ripeness meter
- [x] Admin API for products/articles/analytics

## Next steps (good candidates for our next iteration)

- [ ] Full admin **UI** (right now admin is API-only)
- [ ] Article detail pages with server-rendered Markdown for SEO
- [ ] Email verification + password reset flows
- [ ] Pre-qualification / soft-pull integrations with real networks
- [ ] Streaming responses for the chatbot
- [ ] Automated tests + CI
- [ ] Dockerfile + deployment config
```
