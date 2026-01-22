# Architecture map

## Service map
- `apps/web`: user-facing PWA (future production app).
- `apps/admin`: admin console for data quality and ops.
- `services/api`: public API and auth.
- `services/ingest`: flyers and online connectors.
- `services/receipts`: receipt processing pipeline.
- `services/ai-gateway`: AI provider abstraction.
- `services/analytics`: event ingestion and KPIs.
- `db`: schema, migrations, and seeds.
- `infra`: local dev and deployment config.

## High-level data flow
1) Ingest service pulls flyers/online offers -> normalizes -> publishes offers.
2) Receipt service accepts uploads -> preprocess -> AI extraction -> matching -> price stats.
3) API serves map/search/basket/report from DB + cache.
4) Analytics consumes aggregated events and computes KPIs.
