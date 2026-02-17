# RC checklist (must-pass before production)

## Release gates
- Secrets rotated and removed from repo; .env files are local only.
- Docker Compose stack starts cleanly with no crash loops.
- Health endpoints return 200 for API, receipts worker, ingest, AI gateway.
- Unit + integration tests exist and pass (documented output).
- Receipt upload flow works end-to-end (upload -> queue -> DB -> report).
- Flyer ingest pipeline runs and publishes offers for at least one store.
- Basic monitoring in place (logs, alert thresholds, queue lag).

## Current blockers
- API/worker services are available in Compose via `--profile app`; validate startup in target environment.
- Root-level tests exist (`npm test`), but integration/E2E coverage is still limited.
- Some connectors still rely on heuristic parsing and need per-store hardening.
- Observability is basic (no metrics/alerts wired).

## Environment assumptions
- Default target is dev/staging; production needs hardened configs and verified monitoring.
