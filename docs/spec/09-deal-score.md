# Deal Score and true discount logic

## Score components
- Savings in EUR vs median or prior price.
- Discount percent when provided.
- Unit price comparison.
- Proof level (receipt confirmations).
- Expiry urgency.
- Price stability over time.

## Package size trap detection
- Detect when a smaller pack looks cheaper but unit price is worse.
- Show a clear warning message.

## Bundles and conditional promos
- Recalculate effective unit price for 2-for-1, 3-for-2, etc.
- If condition is unclear, mark as requires condition and exclude from auto optimize.

## Verified logic
- Flyer to verified when confirmed by N receipts.
- Online to verified when it matches real paid.
- If conflict appears, mark as disputed.
