# Principles and rules

## Source separation (anti-chaos)
- FLYER: official store offer with validity and conditions.
- ONLINE: e-shop price with last updated time and region/format constraints.
- RECEIPT: real paid price with confidence level.

## When we can claim a price drop
- Only if we have a previous price (flyer/online) or receipt history median.
- If no previous price, show only "current price" without interpretation.
- Card-only promos are shown only when the condition is explicit or receipt-proven.

## Confidence rules
- Low match confidence is visible but not used for automatic basket optimization.
- Price anomalies are marked unverified until more proof arrives.
- Every user-facing price shows date, source, and expiry when available.

## Mobile-first
- Heavy processing happens on the server.
- Phone UI shows only a simple, clear "truth" result.
