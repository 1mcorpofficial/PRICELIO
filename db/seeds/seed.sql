-- Seed data for local development

INSERT INTO cities (name, country_code)
VALUES
  ('Vilnius', 'LT'),
  ('Kaunas', 'LT'),
  ('Klaipeda', 'LT'),
  ('Siauliai', 'LT')
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, slug)
VALUES
  ('Grocery', 'grocery'),
  ('DIY', 'diy'),
  ('Beauty', 'beauty'),
  ('Pharmacy', 'pharmacy'),
  ('Pets', 'pets'),
  ('Baby', 'baby')
ON CONFLICT DO NOTHING;

INSERT INTO stores (chain, name, city_id, format, address, lat, lon)
VALUES
  (
    'Maxima',
    'Maxima X - Naujamiestis',
    (SELECT id FROM cities WHERE name = 'Vilnius' AND country_code = 'LT' LIMIT 1),
    'X',
    'Naugarduko g. 1, Vilnius',
    54.676,
    25.267
  ),
  (
    'Rimi',
    'Rimi Hyper - Ozas',
    (SELECT id FROM cities WHERE name = 'Vilnius' AND country_code = 'LT' LIMIT 1),
    'Hyper',
    'Ozo g. 18, Vilnius',
    54.714,
    25.286
  ),
  (
    'Iki',
    'Iki Express - Senamiestis',
    (SELECT id FROM cities WHERE name = 'Vilnius' AND country_code = 'LT' LIMIT 1),
    'Express',
    'Pilies g. 7, Vilnius',
    54.682,
    25.289
  )
ON CONFLICT DO NOTHING;

INSERT INTO products (name, brand, variant, category_id, pack_size_value, pack_size_unit, unit_price_basis, ean)
VALUES
  (
    'Greek yogurt',
    'Demo',
    '400g',
    (SELECT id FROM categories WHERE slug = 'grocery' LIMIT 1),
    400,
    'g',
    'kg',
    '0001112223334'
  ),
  (
    'Arabica coffee',
    'Demo',
    '1kg',
    (SELECT id FROM categories WHERE slug = 'grocery' LIMIT 1),
    1,
    'kg',
    'kg',
    '0001112223335'
  ),
  (
    'Fresh salmon',
    'Demo',
    '300g',
    (SELECT id FROM categories WHERE slug = 'grocery' LIMIT 1),
    300,
    'g',
    'kg',
    '0001112223336'
  )
ON CONFLICT DO NOTHING;

INSERT INTO offers (
  product_id,
  source_type,
  store_id,
  store_chain,
  city_id,
  price_value,
  old_price_value,
  discount_percent,
  unit_price_value,
  unit_price_unit,
  valid_from,
  valid_to,
  status,
  is_verified
)
VALUES
  (
    (SELECT id FROM products WHERE name = 'Greek yogurt' LIMIT 1),
    'flyer',
    (SELECT id FROM stores WHERE name = 'Maxima X - Naujamiestis' LIMIT 1),
    'Maxima',
    (SELECT id FROM cities WHERE name = 'Vilnius' AND country_code = 'LT' LIMIT 1),
    1.19,
    1.79,
    33.5,
    2.97,
    'EUR/kg',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    'active',
    false
  ),
  (
    (SELECT id FROM products WHERE name = 'Arabica coffee' LIMIT 1),
    'online',
    (SELECT id FROM stores WHERE name = 'Rimi Hyper - Ozas' LIMIT 1),
    'Rimi',
    (SELECT id FROM cities WHERE name = 'Vilnius' AND country_code = 'LT' LIMIT 1),
    9.49,
    12.99,
    27,
    9.49,
    'EUR/kg',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days',
    'active',
    true
  ),
  (
    (SELECT id FROM products WHERE name = 'Fresh salmon' LIMIT 1),
    'online',
    (SELECT id FROM stores WHERE name = 'Iki Express - Senamiestis' LIMIT 1),
    'Iki',
    (SELECT id FROM cities WHERE name = 'Vilnius' AND country_code = 'LT' LIMIT 1),
    4.99,
    6.49,
    23.1,
    16.63,
    'EUR/kg',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '5 days',
    'active',
    false
  )
ON CONFLICT DO NOTHING;
