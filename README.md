# PRICELIO (ReceiptRadar)

Truth-first project status for this repository.

Last verified: 2026-02-17

## What this project is
PRICELIO is a price-intelligence platform for Lithuania (EUR) that combines:
- Receipt ingestion and analysis
- Store offer ingestion/connectors
- Basket optimization
- Gamification + points + rank ecosystem
- Family workflows, missions, kids mode, plus entitlements
- Admin moderation tools

## Current Status (verified in code)

### Done
1. Multi-service monorepo with working scripts (`npm run doctor`, `npm run install:all`, `npm run dev:infra`, `npm run dev:services`).
2. API with broad surface (66 routes in `services/api/src/index.js`) including auth, receipts, baskets, map/search, alerts, project baskets, missions, kids, plus, points, leaderboard.
3. Ecosystem backend implemented:
   - points wallet + immutable ledger
   - 20-rank model support
   - premium entitlements + points redemption
   - family households/lists/events
   - mission submission/verification/consensus/trust
   - kids mode parent-controlled flows
   - feature flags
4. Database migrations present through `013_feature_flags.sql`.
5. Ingest connectors present for 21 chains (`services/ingest/src/connectors`, 21 files).
6. Modernized web UI (`index.html`, `styles.css`, `app.js`) with ecosystem screens, onboarding guide, contextual tips, and responsive layout.
7. Modernized admin UI (`apps/admin/public/index.html`) with receipt review and mapping flows.
8. Automated tests currently present and passing (`npm test` => 8/8 pass).

### Partially done / implemented but not fully wired
1. Two-store optimizer logic exists in `services/api/src/optimizer.js` (`optimizeTwoStores`), but basket API currently calls single-store route flow (`optimizeSingleStore`) by default.
2. Several advanced flows rely on data quality and real production traffic (missions consensus/trust/weighted truth price) and are functionally coded, but not production-validated in this repo session.
3. Some docs in repository still contain older “100% complete/production ready” wording and may overstate readiness.

### Not done or not verified in this audit
1. Production deployment and long-run operational validation.
2. Real external API provider reliability validation (OpenAI/Anthropic live behavior) in this session.
3. End-to-end load/security/performance test suite (beyond current unit tests).
4. Native mobile app.

## Reality check vs older claims
Older documentation claimed files like:
- `IMPLEMENTATION_COMPLETE.md`
- `ALL_15_CHAINS_COMPLETE.md`
- `NEW_FEATURES_SUMMARY.md`
- `STORE_CHAINS_COMPLETE.md`
- `docs/ALL_STORE_CHAINS.md`

These references are not present in the repository at the time of this verification.

## Quick start (current)
1. `npm run doctor`
2. `npm run install:all`
3. `npm run dev:infra`
4. Configure required `.env` files (see `ENV_TEMPLATES.md` and service README files)
5. `npm run dev:services`

Run tests:
- `npm test`

## Main paths
- Web app: `index.html`, `app.js`, `styles.css`
- Admin app: `apps/admin/public/index.html`
- API: `services/api/src/index.js`
- Ecosystem logic: `services/api/src/ecosystem.js`
- DB migrations: `db/migrations/`
- Tests: `tests/`

## Security note
Do not commit secrets. Use environment files and secret management per environment.
