# Flyer ingest

## Connector model
Each store/source has its own connector with a contract:
- fetch(): download and store RAW.
- detect_version(): identify template version.
- extract_pages(): parse items from HTML/PDF/image pages.
- normalize(): units, currency, dates, conditions.
- publish(): write offers and status.

## Extraction modes
- HTML text parsing.
- PDF text extraction.
- Image pages with OCR/AI.

## Quality checks
- Expected item count vs history.
- Price sanity bounds.
- Validity date sanity.
- Admin spot checks with source pointer.

## Flyer diff
- New offers, ended offers, changed offers.
