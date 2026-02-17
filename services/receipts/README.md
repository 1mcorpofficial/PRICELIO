# Receipt processing service

Responsibilities:
- Receipt upload validation and preprocessing.
- Queue workers for extraction and matching.
- Confidence scoring and user confirmation flow.

## Local run
- Start worker: `npm run dev`
- Env keys: `services/receipts/.env.example`
- Health: `GET http://localhost:4002/health` (configurable via `HEALTH_PORT`)

## Queue
- Consumes jobs from `receipt_jobs` on RabbitMQ.

Implemented:
- AI gateway extraction integration (`AI_GATEWAY_URL`).
- Product matching + confidence scoring.
- Report builder with overpaid-item comparison against active offers.
