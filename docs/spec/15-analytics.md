# Analytics without tracking

## Event model
- view_product, view_store, view_deal
- add_to_basket, remove_from_basket
- optimize_basket_run, optimize_basket_accept
- receipt_upload, receipt_processed, receipt_confirmed
- shelf_snap_upload (optional)

## What we learn
- Trending deals from basket adds.
- Verified hot offers from confirmations.
- Low trust items with high views but low proof.
- Category demand per city.

## City indexes
- Use aggregated real paid data to publish price indexes.
- Must be anonymized and statistically safe.
