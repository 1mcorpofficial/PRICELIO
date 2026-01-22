# Receipt pipeline

## Upload and validation
- File size/format limits and conversion.
- Rate limits by IP/device/user.
- Server-side crop/contrast/rotation.
- PII masking before storage.

## AI extraction (two-stage)
- Stage A: detect store, date/time, line candidates.
- Stage B: strict JSON output validated by schema.

## Confidence handling
- Per-line confidence; low confidence requires confirmation.
- Ask users only for minimal fixes.

## Product matching
- Priority: barcode -> brand+pack+variant -> semantic match.
- Output: matched product, candidate list, or unmatched.

## User-facing output
- Overpaid items vs best available price.
- Cheaper plan now.
- Next-time suggestions (opt-in).
- Savings summaries over time (opt-in).
