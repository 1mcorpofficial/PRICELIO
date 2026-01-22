# Risks and mitigations

## Data reliability
- Risk: AI extraction errors.
- Mitigation: two-stage extraction, schema validation, confidence and minimal user confirmation.

- Risk: name chaos and wrong matching.
- Mitigation: barcode priority, alias table, admin merge/split, exclude low confidence from auto optimize.

## Connector failures
- Risk: flyer format changes break extractors.
- Mitigation: expected count tests, alerts, versioned extractors, fast re-run.

## Legal and reputation
- Risk: wrong prices damage trust.
- Mitigation: always show source/date, proof for "price drop", dispute status, report flow.

- Risk: scraping conflict.
- Mitigation: caching, rate limits, official feeds, stored source_url.

## Privacy
- Risk: PII on receipts.
- Mitigation: mask before storage, minimize data, delete/export features.
