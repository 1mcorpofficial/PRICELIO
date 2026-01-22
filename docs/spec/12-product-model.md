# Product model

## Canonical product
- product_id, brand, name, variant.
- pack_size_value + pack_size_unit.
- unit_price_basis.
- barcode (EAN/GTIN) when available.
- category_id and spec_attributes (JSON).

## Category specs
- Grocery: fat %, flavor, origin (optional).
- DIY: dimensions, capacity, use case, color, material.
- Pharmacy: active ingredient, mg, dose form.
- Beauty: type, ml, line, variant.

## Alias handling
- Map raw names from receipts/flyers to canonical products.
- Improve matching over time.

## Unit price everywhere
- Always compute and display unit price (EUR/kg, EUR/l, EUR/unit).
