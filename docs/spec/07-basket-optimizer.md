# Basket optimizer

## Inputs
- Basket items with quantities.
- City and store preferences.
- Loyalty card preferences (no secrets stored).
- Priority: cheapest, fewer stops, or verified-only.

## Price lookup order
- Active flyer offer.
- Active online offer.
- Receipt median.
- Substitution if needed.

## Optimization modes
- Cheapest 1 store.
- Cheapest 2 stores.
- Min travel cost tradeoff.
- Verified-only.
- Card-only compatibility.

## Travel cost
- Apply time/distance cost threshold to avoid absurd routes.

## Result presentation
- Plan grouped by store with source badges and validity.
- If coverage < 70%, show partial plan and missing items.
