# Infrastructure

Planned components:
- Postgres
- Redis
- Object storage (S3 compatible)
- Queue (BullMQ/Rabbit/Kafka)
- Monitoring stack

TODO:
- Add docker-compose and local dev config.
- Define secrets and env var layout.
- Add logging and metrics defaults.

## Local dev
- Compose file: `infra/docker-compose.yml`.
- Environment keys: `infra/.env.example`.
- Postgres init scripts live in `infra/postgres/init`.
- Redis requires `REDIS_PASSWORD` (see `.env.example`).
