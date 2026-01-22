# Data model (minimal core)

## Core tables
- users or guest_sessions: accounts, consents, limits.
- stores: store locations, city, format, geo.
- categories: category tree and spec schema.
- products: canonical products.
- product_aliases: raw name -> product mapping.
- offers: flyer/online offers with validity and conditions.
- receipts: receipt metadata.
- receipt_items: line items with raw and matched data.
- price_stats: median/min/max/count by product/city/time.
- events: aggregated usage events.

## Status fields
- offer_status: active, ended, disputed, hidden.
- receipt_status: uploaded, processing, processed, needs_confirmation, finalized.
- match_status: matched, candidates, unmatched.
