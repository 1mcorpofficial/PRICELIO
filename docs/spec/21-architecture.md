# High-level architecture

## Core services
- Web/PWA frontend (mobile-first).
- API backend (auth, baskets, map, search, profiles).
- Ingestion service (flyers + online connectors + scheduler).
- Receipt processing pipeline (queue + workers).
- AI gateway (provider cascade).
- Analytics service (event ingestion + KPI aggregates).

## Infrastructure
- Postgres as primary database.
- Redis cache for online prices, map responses, rate limits.
- Object storage for receipt and flyer files.
- Queue for ingest and receipt jobs.
- Monitoring for errors, queue lag, and connector health.
