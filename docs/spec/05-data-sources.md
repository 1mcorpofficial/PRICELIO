# Data sources and lifecycle

## Flyers
- Official store promises with price, old price, discount, validity, conditions.
- Formats: HTML, PDF text, scanned image pages.
- Extracted fields: name, brand, pack, price, old price, discount, valid dates, conditions, source pointer.

## Online offers
- Public e-shop prices with update time and source URL.
- Always labeled ONLINE and never shown as real paid.

## Receipts (real paid)
- Store chain and location when possible.
- Date/time, line items, quantities, totals, taxes/discounts.
- Confidence score per field and per receipt.

## Lifecycle stages
- RAW -> EXTRACTED -> NORMALIZED -> MATCHED -> PUBLISHED -> VERIFIED.
