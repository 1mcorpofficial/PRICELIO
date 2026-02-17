# API service

Responsibilities:
- Auth and guest sessions.
- Map, search, products, basket, receipts endpoints.
- Rate limiting and auth middleware.

## Local run
- Install deps: `npm install`
- Start API: `npm run dev`
- Health check: `GET http://localhost:3000/health`
- Env keys: `services/api/.env.example`

## Receipt upload flow
- `POST /receipts/upload` with `multipart/form-data` field `file`.
- API stores the file in `services/api/uploads` and publishes a queue job.

## Basket flow
- `POST /baskets` creates a guest basket.
- `POST /baskets/{id}/items` inserts items (product_id or raw_name).
- `POST /baskets/{id}/optimize` returns a single-store plan from offers.

Notes:
- API contracts are documented in `docs/spec/23-api.md`.
- OpenAPI spec lives in `services/api/openapi.yaml`.
- Alert delivery supports DB notifications and optional webhook (`ALERT_WEBHOOK_URL`).
