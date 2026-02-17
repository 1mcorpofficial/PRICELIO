# PRICELIO / ReceiptRadar

Status: Active development repository with production-oriented architecture and broad feature coverage.

Last verified against code: 2026-02-17

Repository: `1mcorpofficial/PRICELIO`

---

## 1. Executive Overview

PRICELIO (also called ReceiptRadar in parts of the codebase/docs) is a price intelligence platform focused on Lithuania and EUR.

Core purpose:
- Help users understand if they overpaid after shopping.
- Help users plan where to shop cheaper next time.
- Build a stronger price truth model over time from receipts, offers, and user verification.

The project is not a single script or demo.
It is a multi-service system with:
- API backend.
- Receipt processing pipeline.
- AI extraction gateway.
- Ingest/scraping connectors.
- Analytics service.
- Admin moderation dashboard.
- Web PWA frontend.

This README is intentionally long and explicit.
It is designed to be the source of truth for product scope, implementation state, operations, and architecture.

---

## 2. Product Vision

### 2.1 Problem

Users struggle with price fragmentation:
- Different stores have different prices for the same product.
- Flyers and online prices are hard to compare manually.
- Receipt data is underused after purchase.
- People rarely know if they overpaid.

### 2.2 Product promise

PRICELIO aims to answer three practical questions:
1. What did I overpay on this receipt?
2. Where should I buy these items next time?
3. How do I systematically reduce shopping spend over time?

### 2.3 Value loop

The intended loop is:
1. User uploads receipt.
2. System extracts line items and matches products.
3. System compares receipt prices against offer truth model.
4. User gets overpay report and recommendations.
5. User contributes new data and improves future recommendations.

### 2.4 Strategic differentiation

Compared to pure cashback/reward apps:
- PRICELIO emphasizes optimization intelligence over loyalty points.
- PRICELIO uses receipt reality + offer ingestion + verification workflows.
- PRICELIO introduces family collaboration, missions, trust, and consensus mechanisms.

---

## 3. Scope boundary for this repository

### 3.1 In scope

- Lithuania-oriented data model and store connectors.
- EUR price model in ecosystem components.
- Receipt upload/processing/reporting pipeline.
- Basket planning and single-store optimization flow.
- Broad ecosystem APIs (gamification, plus, families, missions, kids, trust).
- Admin moderation flows for quality control.

### 3.2 Out of scope (currently)

- Native iOS/Android app.
- Full enterprise-grade production hardening.
- Fully validated real-time scale/performance profile.
- Final legal/compliance package for commercial launch.

---

## 4. Truth-first implementation status

This section is strict.
Claims are aligned to code in repository, not aspiration.

### 4.1 Implemented in code

- Multi-service repository with runnable scripts.
- API with broad route set (auth, receipts, baskets, map/search, alerts, ecosystem).
- Ecosystem service module (`services/api/src/ecosystem.js`) including:
  - Points wallet and immutable ledger logic.
  - Rank lookup and rank snapshots.
  - Leaderboards.
  - Premium entitlements and points redemption.
  - Family household workflows.
  - Mission submission + verification + trust adjustments.
  - Kids mode session workflows.
  - Feature flag checks.
- Database migrations up to `013_feature_flags.sql`.
- 21 ingest connectors present.
- Modernized main web UI (`index.html`, `styles.css`, `app.js`).
- Modernized admin UI (`apps/admin/public/index.html`).
- Root tests in `tests/` currently passing.

### 4.2 Implemented but partially wired/validated

- Two-store optimization logic exists in `services/api/src/optimizer.js`.
- Main basket optimize API route currently calls single-store optimizer by default.
- Advanced trust/consensus flows are coded and testable but require production traffic validation.
- Some operational docs still contain older inflated claims outside this README.

### 4.3 Not yet verified in this repository session

- Production deployment validation.
- High-load benchmarking and distributed resilience under real traffic.
- Full red-team security audit.
- End-to-end legal readiness for commercial release.

---

## 5. High-level architecture

System shape:
- Frontend PWA + Admin UI.
- API orchestrator service.
- Asynchronous processing and ingestion services.
- Postgres + Redis + RabbitMQ + MinIO stack via Docker infra.

Conceptual flow:
1. Frontend calls API.
2. API writes/reads Postgres and enqueues tasks.
3. Workers/ingest process tasks and update data.
4. Frontend renders current state and recommendations.
5. Admin reviews low-confidence and data quality items.

---

## 6. Repository map

Top-level important paths:
- `index.html` - Main web app shell.
- `app.js` - Main web client logic.
- `styles.css` - Main web styles.
- `apps/admin/` - Admin service and UI.
- `services/api/` - API service.
- `services/receipts/` - Receipt worker/pipeline.
- `services/ai-gateway/` - Extraction providers.
- `services/ingest/` - Store offer connectors and scheduler.
- `services/analytics/` - Event tracking/aggregation.
- `db/` - Schema, migrations, seeds.
- `infra/` - Docker Compose and DB init files.
- `tests/` - Root test suite.
- `docs/` - Internal project docs/specs.

---

## 7. Service-by-service detailed breakdown

### 7.1 API service (`services/api`)

Responsibilities:
- Authentication and user context.
- Core product APIs (map/search/baskets/receipts).
- Ecosystem APIs (points/ranks/plus/family/missions/kids/proof).
- Alert and project-basket supporting routes.
- Integration glue for optimizer/report logic.

Key source files:
- `services/api/src/index.js`
- `services/api/src/queries.js`
- `services/api/src/optimizer.js`
- `services/api/src/ecosystem.js`
- `services/api/src/ecosystem-algorithms.js`
- `services/api/src/auth.js`
- `services/api/src/alerts.js`

Notes:
- API route surface is broad.
- Some routes are marked as feature-flag gated.
- Authentication supports required and optional middleware patterns.

### 7.2 Receipts service (`services/receipts`)

Responsibilities:
- Receipt pipeline orchestration.
- Parsing, matching, and confidence scoring stages.
- Worker processing with queue integration.
- Nutritional analysis linkage.

Key source files:
- `services/receipts/src/pipeline.js`
- `services/receipts/src/worker.js`
- `services/receipts/src/matcher.js`
- `services/receipts/src/nutritional-analyzer.js`

Notes:
- Pipeline and tests are present.
- Worker health/ops were improved during recent phases.

### 7.3 AI gateway (`services/ai-gateway`)

Responsibilities:
- Provider abstraction for extraction.
- Multi-provider fallback behavior.
- OCR/extraction support for receipts.

Key source files:
- `services/ai-gateway/src/index.js`
- `services/ai-gateway/src/providers.js`
- `services/ai-gateway/src/extractor.js`
- `services/ai-gateway/src/ai-helper.js`

Notes:
- Real provider behavior still depends on valid environment config and quotas.

### 7.4 Ingest service (`services/ingest`)

Responsibilities:
- Offer scraping/normalization from many chains.
- Scheduler for connector runs.
- Chain-specific extraction logic.

Key source files:
- `services/ingest/src/index.js`
- `services/ingest/src/scheduler.js`
- `services/ingest/src/normalizer.js`
- `services/ingest/src/connectors/*.js`

Notes:
- 21 connector files currently present.
- Real connector reliability varies by external site stability.

### 7.5 Analytics service (`services/analytics`)

Responsibilities:
- Event queue handling.
- Metrics aggregation and reporting support.

Key source files:
- `services/analytics/src/index.js`
- `services/analytics/src/tracker.js`
- `services/analytics/src/queue.js`

Notes:
- Present and wired in workspace scripts.

### 7.6 Admin service (`apps/admin`)

Responsibilities:
- Admin authentication/session handling.
- Dashboard stats.
- Low-confidence receipt review flow.
- Unmatched product mapping.
- Connector health view.

Key source files:
- `apps/admin/server.js`
- `apps/admin/public/index.html`
- `apps/admin/db.js`

Notes:
- UI significantly modernized.
- Functionality is centered on moderation/data quality operations.

---

## 8. Frontend UX overview (main app)

Main UX views in `index.html`:
- Overview
- Market
- Basket
- Receipts
- Family
- Missions
- Leaderboard
- Plus
- Kids
- Profile

### 8.1 Overview

Contains:
- Register/login/logout flows.
- Basic gamification KPI panel.
- Recent points preview.

### 8.2 Market

Contains:
- Leaflet map integration.
- Filter chips (category/verified/distance).
- Product search and compare panel.

### 8.3 Basket

Contains:
- Text-based basket input parser.
- Basket creation and optimization buttons.
- Plan rendering UI.

### 8.4 Receipts

Contains:
- Receipt file upload + preview.
- Polling status.
- Overpay report rendering.

### 8.5 Family

Contains:
- Household creation.
- Invite/join actions.
- Shared lists loading/adding.
- Event polling.

### 8.6 Missions

Contains:
- Nearby missions query.
- Mission start/submit/verify flows.
- Proof status querying.

### 8.7 Leaderboard

Contains:
- Global leaderboard panel.
- Friends/household leaderboard panel.

### 8.8 Plus

Contains:
- Feature list and status retrieval.
- Subscribe/unlock actions.
- Premium insights actions.

### 8.9 Kids

Contains:
- Parent-PIN activation/deactivation.
- Kids mission list and submit actions.

### 8.10 Profile

Contains:
- Basic user profile data.
- Rank catalog panel.

### 8.11 UX enhancements added

- Contextual tip strip per active view.
- Guided onboarding modal with progress.
- Reopenable guide action.
- Smooth view and panel entrance animation.
- Responsive layout behavior across desktop/mobile.

---

## 9. API inventory (generated from route declarations)

Count in `services/api/src/index.js`: 66 route declarations.

### 9.1 Route list
- [61] get /health
- [95] post /auth/guest
- [110] post /auth/register
- [143] post /auth/login
- [171] post /auth/refresh
- [193] post /auth/logout
- [198] get /me
- [218] get /ranks
- [227] get /me/gamification
- [236] get /leaderboard/global
- [245] get /leaderboard/friends
- [254] get /points/ledger
- [263] get /points/redeem/options
- [271] post /points/redeem
- [287] get /plus/features
- [295] get /plus/status
- [303] post /plus/subscribe
- [315] post /plus/unlock-with-points
- [327] get /map/stores
- [380] get /stores/:id
- [393] get /city/:city/feed
- [402] get /search
- [416] get /products/:id
- [429] post /baskets
- [460] post /baskets/:id/items
- [496] post /baskets/:id/optimize
- [510] post /families
- [519] post /families/:id/invite
- [534] post /families/:id/join
- [556] get /families/:id/lists
- [568] post /families/:id/lists/:listId/items
- [580] post /families/:id/events/poll
- [597] post /receipts/upload
- [649] get /receipts/:id/status
- [666] get /receipts/:id/report
- [699] post /receipts/:id/confirm
- [739] get /receipts/:id/nutrition
- [774] get /chains
- [794] get /stores
- [836] get /offers
- [906] post /alerts/price
- [917] get /alerts
- [926] delete /alerts/:id
- [935] get /notifications
- [944] post /notifications/:id/read
- [954] get /project-baskets/templates
- [963] post /project-baskets/create/:templateId
- [973] get /project-baskets/recommended
- [983] get /products/barcode/:ean
- [1001] get /products/:id/prices
- [1019] post /shelfsnap/submit
- [1039] get /package-traps
- [1063] post /warranty/add
- [1111] get /warranty/list
- [1130] get /missions/nearby
- [1144] post /missions/:id/start
- [1156] post /missions/:id/submit
- [1172] post /missions/:id/verify
- [1189] get /proof/:id/status
- [1201] post /proof/:id/dispute
- [1210] post /kids/activate
- [1222] get /kids/missions
- [1238] post /kids/missions/:id/submit
- [1254] post /kids/deactivate
- [1270] get /insights/time-machine/:productId
- [1279] get /insights/analytics/spending

Notes:
- Some routes require auth middleware.
- Some routes are feature-flag gated.
- Some routes require plus entitlement checks.

---

## 10. Ecosystem design and behavior

### 10.1 Points and XP

Model characteristics:
- User wallet tracks spendable points and lifetime XP.
- Ledger table records immutable events.
- Rank progression tied to lifetime XP.
- Spending points does not reduce rank XP.

Award examples implemented in API/ecosystem code:
- Receipt upload award.
- Mission verification award.
- First-discovery award.
- High-savings award.

### 10.2 Ranks

Rank levels are represented in DB (`rank_levels`) and exposed via `/ranks`.
Frontend can load full catalog in Profile view.

### 10.3 Premium/Plus

Current concepts in code:
- Plan and feature mapping (`plans`, `plan_features`).
- Active entitlement records (`user_entitlements`).
- Points-based redemption (`point_redemptions`).

Plus feature keys used in code:
- `time_machine`
- `advanced_analytics`
- `multi_baskets`
- `priority_scan`
- `family_plus`

### 10.4 Families

Family data model includes:
- Households.
- Members and roles.
- Lists and list items.
- Event stream for polling sync.
- Invite token flow.

Sync approach currently used:
- Polling endpoint with cursor (`/families/:id/events/poll`).

### 10.5 Missions and consensus

Mission flow includes:
- Nearby mission retrieval.
- Start task.
- Submit proof payload.
- Verification voting.
- Consensus state transitions.

Trust and anti-cheat behaviors in code:
- Foreground flag checks.
- Duplicate hash checks.
- Rate-limit style checks.
- Geofence checks using store zones.
- Impossible-speed check between submissions.
- Shadow-ban logic from conflict patterns.

### 10.6 Kids mode

Kids mode characteristics in code:
- Parent-controlled activation via PIN hash.
- Active session required for kids mission actions.
- Adult categories blocked in kids mission flow.
- Parent account remains source of mission submission.

### 10.7 Feature flags

Feature gates used for staged rollout:
- `gamification`
- `premium_redeem`
- `family_core`
- `bounty`
- `kids_mode`

---

## 11. Optimization logic

### 11.1 Single-store optimization

Implemented and used by basket optimize route.
Behavior:
- Chooses store with best combination of coverage and total cost.
- Computes line totals by quantity.
- Returns missing item list.
- Compares with median receipt references when available.

### 11.2 Two-store optimization

Implemented in `services/api/src/optimizer.js` as `optimizeTwoStores`.
Behavior includes:
- Travel distance and cost considerations.
- Store-pair partitioning.
- Better-than-single-store decision rule.

Current route usage status:
- Main route currently invokes single-store path by default.

---

## 12. Data model and migrations

Migration files currently present:
- 0001_init.sql
- 002_add_new_store_chains.sql
- 003_real_stores_all_chains.sql
- 004_complete_all_chains.sql
- 005_alerts_and_features.sql
- 006_admin_users.sql
- 007_gamification_core.sql
- 008_premium_entitlements.sql
- 009_family_households.sql
- 010_bounty_missions.sql
- 011_trust_and_quality.sql
- 012_kids_mode.sql
- 013_feature_flags.sql

Important migration themes:
- Initial schema bootstrap.
- Store-chain expansion and real-store additions.
- Alerts/features support.
- Admin users support.
- Gamification wallet/ledger/rank snapshots.
- Premium entitlements and redemptions.
- Family household model.
- Bounty mission + trust + quality controls.
- Kids mode structures.
- Feature flag control tables.

---

## 13. Connector inventory

Connector files currently present (`services/ingest/src/connectors`):
- aibe.js
- camelia.js
- drogas.js
- elektromarkt.js
- ermitazas.js
- eurovaistine.js
- gintarine.js
- iki.js
- jysk.js
- lidl.js
- maxima.js
- mokiveži.js
- norfa.js
- pegasas.js
- pigu.js
- rimi.js
- senukai.js
- silas.js
- topocentras.js
- varle.js
- vynoteka.js

Operational reality:
- Connector presence does not automatically imply 100% scrape stability.
- External websites change frequently.
- Monitoring and fallback behavior are required for production reliability.

---

## 14. Security posture summary

Implemented/visible controls:
- JWT auth and protected middleware patterns.
- Password hashing path in auth service.
- Guest session support for anonymous flows.
- Moderation/trust controls in ecosystem logic.
- PII masking support in receipt pipeline documentation/code areas.

Still recommended before true production launch:
- Dedicated secrets management.
- Rotating credentials and strict vault policy.
- Penetration test and endpoint hardening review.
- Comprehensive audit logging strategy.

---

## 15. Testing status

Current root command:
- `npm test`

Current test files in root `tests/`:
- `tests/ecosystem-algorithms.test.js`
- `tests/ingest-maxima-normalize.test.js`
- `tests/receipts-pipeline.test.js`

At verification time:
- Root tests passing.
- Core JS syntax checks passing for key services.

Gaps to close over time:
- Wider integration test matrix across services.
- Contract validation for all route payload variants.
- Load/perf testing.
- Chaos/failure-mode testing.

---

## 16. Local development setup

### 16.1 Recommended commands

1. `npm run doctor`
2. `npm run install:all`
3. `npm run dev:infra`
4. Configure `.env` files as required.
5. `npm run dev:services`

Infra stop:
- `npm run dev:infra:down`

Infra logs:
- `npm run dev:infra:logs`

### 16.2 Manual service startup (if needed)

- API: `npm -w services/api run dev`
- AI Gateway: `npm -w services/ai-gateway run dev`
- Receipts: `npm -w services/receipts run dev`
- Ingest: `npm -w services/ingest run dev`
- Analytics: `npm -w services/analytics run dev`
- Admin: `npm -w apps/admin run dev`

### 16.3 Static frontend

If needed for direct static serving:
- `python3 -m http.server 8000`

---

## 17. Environment and configuration

See:
- `ENV_TEMPLATES.md`
- Service-level README files
- `.env.example` files where present

General guidance:
- Never commit API secrets.
- Use different credentials per environment.
- Keep production and development configs isolated.

---

## 18. Operational runbook

### 18.1 Health checks

Minimum checks:
- API health endpoint.
- Worker process alive.
- Queue connectivity.
- DB connectivity.
- Connector scheduler activity.

### 18.2 Incident triage order

1. Confirm infra components are alive.
2. Confirm API auth and DB access paths.
3. Confirm queue state and worker logs.
4. Confirm external connector/source availability.
5. Confirm recent deploy/config changes.

### 18.3 Data quality triage

1. Inspect low-confidence receipts in admin.
2. Map recurring unmatched raw product names.
3. Review trust flags and mission conflict trends.
4. Validate outlier prices before promoting data truth.

---

## 19. Product capability matrix

Legend:
- Implemented = coded and present.
- Partial = coded but not fully wired/validated in flow.
- Planned = concept or next step.

### 19.1 Core user capabilities

- Receipt upload and status tracking: Implemented
- Receipt report with overpay line logic: Implemented
- Product search: Implemented
- Map store listing/filtering: Implemented
- Basket creation and optimize call: Implemented
- Two-store optimize in active route flow: Partial

### 19.2 Ecosystem capabilities

- Points wallet and ledger: Implemented
- Rank catalog/load: Implemented
- Global leaderboard: Implemented
- Friends/household leaderboard: Implemented
- Plus subscription and points unlock: Implemented
- Family create/invite/join/list/events: Implemented
- Mission lifecycle + verification: Implemented
- Consensus and trust penalties: Implemented
- Kids mode parent-controlled flow: Implemented

### 19.3 Admin capabilities

- Dashboard KPI cards: Implemented
- Low-confidence list: Implemented
- Receipt review modal: Implemented
- Manual mapping flow: Implemented
- Connector health view: Implemented

### 19.4 Platform and ops

- Docker infra definition: Implemented
- Root multi-workspace scripts: Implemented
- Basic automated tests: Implemented
- Production-ready SLO/SLA instrumentation: Partial

---

## 20. Known limitations and caveats

1. Documentation spread across historical files can be inconsistent.
2. Some legacy docs include inflated completion wording.
3. External source scraping reliability depends on source website changes.
4. Feature flags can hide endpoints if disabled by config.
5. Some advanced flows require richer real-world data volume to shine.

---

## 21. Why the README was rewritten

This README replaces inflated claim patterns with explicit verification language.
Goal:
- Avoid ambiguity for founders, engineers, and stakeholders.
- Separate what is coded from what is fully production-validated.
- Make audits and handoff easier.

---

## 22. Suggested near-term roadmap

### 22.1 Product polish

- Finalize which optimize mode is default for basket API.
- Add explicit UX messaging for feature-flag-disabled sections.
- Improve onboarding copy for first-session success.

### 22.2 Quality and reliability

- Add integration tests for family and mission flows.
- Add route-level contract tests against OpenAPI schemas.
- Add load testing for report and search endpoints.

### 22.3 Security and compliance

- Formalize secrets and key rotation process.
- Add security event logging policy.
- Perform vulnerability and dependency audit cycle.

### 22.4 Launch readiness

- Define pilot city rollout checklist.
- Define operational KPI dashboard thresholds.
- Finalize support/moderation runbook and escalation policy.

---

## 23. Contributor guide

### 23.1 Branching and commits

Recommended:
- Keep commits scoped by domain (web/admin/platform/docs).
- Prefer small, reviewable commits.
- Include clear commit subjects with intent.

### 23.2 Testing before push

Minimum local gate:
- `npm test`
- Syntax check for touched JS files when relevant.

### 23.3 No secret policy

- Do not commit tokens/keys.
- Do not embed credentials in scripts/docs.

---

## 24. FAQ

Q: Is this project fully production ready right now?
A: It has broad implementation coverage, but full production validation/hardening is still a separate step.

Q: Are all 21 connectors guaranteed stable all the time?
A: No. Connector presence is implemented; runtime stability depends on external source changes and monitoring.

Q: Is two-store optimization fully active in API response path?
A: Single-store is currently the default route behavior; two-store logic exists but is not default-wired.

Q: Are missions/trust/family/kids only UI mockups?
A: No. They have backend routes and service logic; production validation depth still depends on deployment traffic.

Q: Is this README aligned with current code?
A: Yes, this version was generated and cross-checked against repository state on 2026-02-17.

---

## 25. Glossary

- Offer truth model: Aggregated price signal from multiple sources.
- Consensus proof: Verified product identity proof from multiple contributors.
- Spendable points: Wallet balance that can be redeemed.
- Lifetime XP: Rank progression metric.
- Entitlement: Active access right for premium feature.
- Feature flag: Runtime switch controlling feature visibility/activation.
- Geofence: Store area used for mission validation.
- Shadow ban: Contribution suppression based on trust/fraud signals.
- Receipt confidence: Matching/extraction confidence score.
- Low-confidence review: Manual moderation queue flow.

---

## 26. Appendix A - Route quick groups

Auth/profile:
- `/auth/guest`
- `/auth/register`
- `/auth/login`
- `/auth/refresh`
- `/auth/logout`
- `/me`

Market/search/product:
- `/map/stores`
- `/stores/:id`
- `/search`
- `/products/:id`
- `/products/barcode/:ean`
- `/products/:id/prices`

Baskets/receipts:
- `/baskets`
- `/baskets/:id/items`
- `/baskets/:id/optimize`
- `/receipts/upload`
- `/receipts/:id/status`
- `/receipts/:id/report`
- `/receipts/:id/confirm`
- `/receipts/:id/nutrition`

Ecosystem:
- `/ranks`
- `/me/gamification`
- `/leaderboard/global`
- `/leaderboard/friends`
- `/points/ledger`
- `/points/redeem/options`
- `/points/redeem`
- `/plus/features`
- `/plus/status`
- `/plus/subscribe`
- `/plus/unlock-with-points`

Family:
- `/families`
- `/families/:id/invite`
- `/families/:id/join`
- `/families/:id/lists`
- `/families/:id/lists/:listId/items`
- `/families/:id/events/poll`

Missions/trust/kids:
- `/missions/nearby`
- `/missions/:id/start`
- `/missions/:id/submit`
- `/missions/:id/verify`
- `/proof/:id/status`
- `/proof/:id/dispute`
- `/kids/activate`
- `/kids/missions`
- `/kids/missions/:id/submit`
- `/kids/deactivate`

Alerts/extra:
- `/alerts/price`
- `/alerts`
- `/notifications`
- `/project-baskets/templates`
- `/project-baskets/create/:templateId`
- `/project-baskets/recommended`
- `/shelfsnap/submit`
- `/package-traps`
- `/warranty/add`
- `/warranty/list`

---

## 27. Appendix B - Verification checklist used for this README

Checklist items used during rewrite:
- Confirm route count and route names from `services/api/src/index.js`.
- Confirm optimizer capabilities from `services/api/src/optimizer.js`.
- Confirm connector count from `services/ingest/src/connectors`.
- Confirm migration files from `db/migrations`.
- Confirm test pass at root (`npm test`).
- Confirm syntax validity of key JS entry files.
- Confirm local/remote git sync state.

All of the above were executed during this rewrite cycle.

---

## 28. Appendix C - Line budget note

This README was intentionally expanded for deep operational and product clarity.
It is designed for:
- founders,
- engineers,
- QA,
- operators,
- and onboarding collaborators.

If you want a short version for external audiences, create `README_PUBLIC.md` as a condensed profile.

---

## 29. License and usage

Current repository positioning:
- Proprietary project context.
- Internal/owner-controlled development.

Adjust license section if public open-source model is chosen.

---

## 30. Final statement

This document should be treated as the current truth baseline.
If code changes, update this README in the same PR/commit cycle.

---

## 31. Mobile Production Checklist (VPS + PWA)

Before sharing with larger user groups, run this exact checklist:

1. HTTPS is enabled (required for geolocation on mobile browsers).
2. PWA install prompt works (Android Chrome baseline).
3. Service worker updates correctly after deployment (new version visible after refresh/reopen).
4. `manifest.webmanifest` branding is correct (`PRICELIO` name/theme/icon).
5. API base URL in frontend points to production API host.
6. CORS allows only expected frontend origins (no wide-open `*` in production).
7. Geolocation permission flow is validated on real phone:
   - allow once,
   - deny,
   - deny permanently.
8. Nearby price compare fallback works when geolocation denied (shows non-nearby global list).
9. Receipt upload persists after server restart (uploads volume mounted).
10. Auth flow tested on mobile:
   - register,
   - login,
   - logout,
   - token expiration behavior.
11. Family invite tested end-to-end with token copy/paste.
12. Critical error surfaces are user-readable (no blank screens).
13. Basic rate limiting is active for auth and upload endpoints.
14. Logs are centralized and searchable (API + workers).
15. Nightly DB backup and restore drill are configured.

Recommended smoke-test scenarios for each release:
- Search `Twix` and verify cheapest nearby store appears with distance.
- Press `Vesti į pigiausią` and verify Google Maps opens destination.
- Upload one receipt and verify report generation path.
- Create family, generate token invite, join from second account.
