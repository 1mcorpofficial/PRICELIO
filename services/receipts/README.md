# Receipt processing service

Responsibilities:
- Receipt upload validation and preprocessing.
- Queue workers for extraction and matching.
- Confidence scoring and user confirmation flow.

## Local run (stub)
- Start worker: `npm run dev`
- Env keys: `services/receipts/.env.example`

## Queue
- Consumes jobs from `receipt_jobs` on RabbitMQ.

TODO:
- Implement two-stage extraction pipeline.
- Add PII masking and malware scan.
- Integrate with AI gateway and matching logic.
