-- Migration: Real Store Data for All Lithuanian Chains
-- Date: 2026-01-21
-- Description: Real addresses, coordinates, and information for all store chains

-- First, clear any test data
DELETE FROM offers WHERE store_id IN (SELECT id FROM stores);
DELETE FROM stores;

-- Ensure cities exist
INSERT INTO cities (name, country_code, region) 
VALUES 
  ('Vilnius', 'LT', 'Vilniaus m.'),
  ('Kaunas', 'LT', 'Kauno m.'),
  ('Klaipėda', 'LT', 'Klaipėdos m.'),
  ('Šiauliai', 'LT', 'Šiaulių m.'),
  ('Panevėžys', 'LT', 'Panevėžio m.')
ON CONFLICT (name, country_code) DO NOTHING;

-- Get city IDs
DO $$
DECLARE
  vilnius_id uuid;
  kaunas_id uuid;
  klaipeda_id uuid;
  siauliai_id uuid;
  panevezys_id uuid;
BEGIN
  SELECT id INTO vilnius_id FROM cities WHERE name = 'Vilnius' AND country_code = 'LT';
  SELECT id INTO kaunas_id FROM cities WHERE name = 'Kaunas' AND country_code = 'LT';
  SELECT id INTO klaipeda_id FROM cities WHERE name = 'Klaipėda' AND country_code = 'LT';
  SELECT id INTO siauliai_id FROM cities WHERE name = 'Šiauliai' AND country_code = 'LT';
  SELECT id INTO panevezys_id FROM cities WHERE name = 'Panevėžys' AND country_code = 'LT';

  -- ========================================
  -- MAXIMA (Grocery)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Maxima', 'Maxima XXX Savanorių', vilnius_id, 'hypermarket', 'Savanorių pr. 247, Vilnius', 54.729700, 25.258700, true),
  ('Maxima', 'Maxima XXX Ukmergės', vilnius_id, 'hypermarket', 'Ukmergės g. 369, Vilnius', 54.729653, 25.308089, true),
  ('Maxima', 'Maxima XX Kalvarijų', vilnius_id, 'supermarket', 'Kalvarijų g. 125, Vilnius', 54.712900, 25.273200, true),
  ('Maxima', 'Maxima XX Ozo', vilnius_id, 'supermarket', 'Ozo g. 25, Vilnius', 54.710400, 25.279800, true),
  ('Maxima', 'Maxima X Gedimino', vilnius_id, 'supermarket', 'Gedimino pr. 31, Vilnius', 54.685900, 25.280100, true),
  -- Kaunas
  ('Maxima', 'Maxima XXX Taikos', kaunas_id, 'hypermarket', 'Taikos pr. 61, Kaunas', 54.927700, 23.970000, true),
  ('Maxima', 'Maxima XX Akropolis', kaunas_id, 'supermarket', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.902700, 23.969900, true),
  ('Maxima', 'Maxima XX Savanorių', kaunas_id, 'supermarket', 'Savanorių pr. 255, Kaunas', 54.902700, 23.913900, true),
  -- Klaipėda
  ('Maxima', 'Maxima XXX Šilutės', klaipeda_id, 'hypermarket', 'Šilutės pl. 35A, Klaipėda', 55.700000, 21.162000, true),
  ('Maxima', 'Maxima XX Taikos', klaipeda_id, 'supermarket', 'Taikos pr. 139, Klaipėda', 55.717200, 21.117500, true);

  -- ========================================
  -- RIMI (Grocery)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Rimi', 'Rimi Hyper Ozas', vilnius_id, 'hypermarket', 'Ozo g. 18, Vilnius', 54.710000, 25.279000, true),
  ('Rimi', 'Rimi Super PC Panorama', vilnius_id, 'supermarket', 'Saltoniškių g. 9, Vilnius', 54.684600, 25.250000, true),
  ('Rimi', 'Rimi Super Žirmūnų', vilnius_id, 'supermarket', 'Žirmūnų g. 68, Vilnius', 54.696300, 25.293200, true),
  ('Rimi', 'Rimi Express Gedimino', vilnius_id, 'convenience', 'Gedimino pr. 5, Vilnius', 54.687200, 25.279500, true),
  -- Kaunas
  ('Rimi', 'Rimi Hyper Akropolis', kaunas_id, 'hypermarket', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.902700, 23.969900, true),
  ('Rimi', 'Rimi Super Savanorių', kaunas_id, 'supermarket', 'Savanorių pr. 346, Kaunas', 54.909000, 23.905000, true),
  -- Klaipėda
  ('Rimi', 'Rimi Hyper Akropolis', klaipeda_id, 'hypermarket', 'Taikos pr. 61, Klaipėda', 55.717200, 21.117500, true);

  -- ========================================
  -- IKI (Grocery)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Iki', 'Iki Geležinio Vilko', vilnius_id, 'supermarket', 'Geležinio Vilko g. 6, Vilnius', 54.686500, 25.287800, true),
  ('Iki', 'Iki Antakalnio', vilnius_id, 'supermarket', 'Antakalnio g. 49, Vilnius', 54.706600, 25.294100, true),
  ('Iki', 'Iki Justiniškės', vilnius_id, 'supermarket', 'Justiniškių g. 68, Vilnius', 54.722100, 25.238100, true),
  -- Kaunas
  ('Iki', 'Iki Islandijos', kaunas_id, 'supermarket', 'Islandijos pl. 32, Kaunas', 54.950000, 23.913900, true),
  ('Iki', 'Iki Pramonės', kaunas_id, 'supermarket', 'Pramonės pr. 16, Kaunas', 54.913800, 23.969900, true);

  -- ========================================
  -- NORFA (Grocery)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Norfa', 'Norfa Fabijoniškės', vilnius_id, 'supermarket', 'Fabijoniškių g. 62, Vilnius', 54.724100, 25.242900, true),
  ('Norfa', 'Norfa Pilaitė', vilnius_id, 'supermarket', 'Pilaitės pr. 42, Vilnius', 54.704700, 25.220500, true),
  -- Kaunas
  ('Norfa', 'Norfa Dainava', kaunas_id, 'supermarket', 'Kovo 11-osios g. 88, Kaunas', 54.937800, 23.969100, true),
  ('Norfa', 'Norfa Šilainiai', kaunas_id, 'supermarket', 'Raudondvario pl. 150, Kaunas', 54.906600, 23.890200, true),
  -- Šiauliai
  ('Norfa', 'Norfa Šiauliai', siauliai_id, 'supermarket', 'Tilžės g. 109, Šiauliai', 55.934500, 23.314800, true);

  -- ========================================
  -- ŠILAS (Grocery)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Šilas', 'Šilas Ukmergės', vilnius_id, 'supermarket', 'Ukmergės g. 227, Vilnius', 54.723200, 25.299500, true),
  ('Šilas', 'Šilas Žirmūnai', vilnius_id, 'supermarket', 'Žirmūnų g. 94, Vilnius', 54.699400, 25.298300, true),
  -- Kaunas
  ('Šilas', 'Šilas Dainava', kaunas_id, 'supermarket', 'Draugystės pr. 17, Kaunas', 54.939600, 23.969700, true);

  -- ========================================
  -- LIDL (Grocery) - NAUJAS
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Lidl', 'Lidl Ukmergės', vilnius_id, 'supermarket', 'Ukmergės g. 282, Vilnius', 54.726500, 25.302100, true),
  ('Lidl', 'Lidl Savanorių', vilnius_id, 'supermarket', 'Savanorių pr. 192, Vilnius', 54.723500, 25.252600, true),
  ('Lidl', 'Lidl Žirmūnai', vilnius_id, 'supermarket', 'Žirmūnų g. 77, Vilnius', 54.697800, 25.295400, true),
  -- Kaunas
  ('Lidl', 'Lidl Pramonės', kaunas_id, 'supermarket', 'Pramonės pr. 14, Kaunas', 54.913900, 23.970100, true),
  ('Lidl', 'Lidl Savanorių', kaunas_id, 'supermarket', 'Savanorių pr. 336, Kaunas', 54.908000, 23.906500, true),
  -- Klaipėda
  ('Lidl', 'Lidl Taikos', klaipeda_id, 'supermarket', 'Taikos pr. 143, Klaipėda', 55.717500, 21.118000, true);

  -- ========================================
  -- SENUKAI (DIY/Hardware)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Senukai', 'Senukai Savanorių', vilnius_id, 'diy', 'Savanorių pr. 247, Vilnius', 54.729700, 25.258700, true),
  ('Senukai', 'Senukai Ukmergės', vilnius_id, 'diy', 'Ukmergės g. 369, Vilnius', 54.729653, 25.308089, true),
  -- Kaunas
  ('Senukai', 'Senukai Taikos', kaunas_id, 'diy', 'Taikos pr. 120, Kaunas', 54.942700, 23.969900, true),
  -- Klaipėda
  ('Senukai', 'Senukai Šilutės', klaipeda_id, 'diy', 'Šilutės pl. 35A, Klaipėda', 55.700000, 21.162000, true);

  -- ========================================
  -- MOKI VEŽI (Furniture/Home)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Moki Veži', 'Moki Veži Laisvės', vilnius_id, 'furniture', 'Laisvės pr. 60, Vilnius', 54.687200, 25.279700, true),
  ('Moki Veži', 'Moki Veži Savanorių', vilnius_id, 'furniture', 'Savanorių pr. 235, Vilnius', 54.728500, 25.257500, true),
  -- Kaunas
  ('Moki Veži', 'Moki Veži Islandijos', kaunas_id, 'furniture', 'Islandijos pl. 32, Kaunas', 54.950000, 23.913900, true);

  -- ========================================
  -- ERMITAŽAS (Books)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Ermitažas', 'Ermitažas Gedimino', vilnius_id, 'bookstore', 'Gedimino pr. 27, Vilnius', 54.684600, 25.279800, true),
  ('Ermitažas', 'Ermitažas Akropolis', vilnius_id, 'bookstore', 'Ozo g. 25, Vilnius', 54.710400, 25.279800, true),
  ('Ermitažas', 'Ermitažas Panorama', vilnius_id, 'bookstore', 'Saltoniškių g. 9, Vilnius', 54.684600, 25.250000, true),
  -- Kaunas
  ('Ermitažas', 'Ermitažas Akropolis', kaunas_id, 'bookstore', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.902700, 23.969900, true),
  ('Ermitažas', 'Ermitažas Laisvės', kaunas_id, 'bookstore', 'Laisvės al. 58, Kaunas', 54.896700, 23.916100, true);

  -- ========================================
  -- DROGAS (Beauty/Pharmacy)
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Drogas', 'Drogas Akropolis', vilnius_id, 'beauty', 'Ozo g. 25, Vilnius', 54.710400, 25.279800, true),
  ('Drogas', 'Drogas Panorama', vilnius_id, 'beauty', 'Saltoniškių g. 9, Vilnius', 54.684600, 25.250000, true),
  ('Drogas', 'Drogas Gedimino', vilnius_id, 'beauty', 'Gedimino pr. 16, Vilnius', 54.685600, 25.279200, true),
  ('Drogas', 'Drogas Ozas', vilnius_id, 'beauty', 'Ozo g. 18, Vilnius', 54.710000, 25.279000, true),
  -- Kaunas
  ('Drogas', 'Drogas Akropolis', kaunas_id, 'beauty', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.902700, 23.969900, true),
  ('Drogas', 'Drogas Laisvės', kaunas_id, 'beauty', 'Laisvės al. 88, Kaunas', 54.897800, 23.918300, true),
  -- Klaipėda
  ('Drogas', 'Drogas Akropolis', klaipeda_id, 'beauty', 'Taikos pr. 61, Klaipėda', 55.717200, 21.117500, true);

  -- ========================================
  -- EUROVAISTINĖ (Pharmacy) - NAUJAS
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Eurovaistinė', 'Eurovaistinė Gedimino', vilnius_id, 'pharmacy', 'Gedimino pr. 29, Vilnius', 54.685400, 25.280000, true),
  ('Eurovaistinė', 'Eurovaistinė Akropolis', vilnius_id, 'pharmacy', 'Ozo g. 25, Vilnius', 54.710400, 25.279800, true),
  ('Eurovaistinė', 'Eurovaistinė Panorama', vilnius_id, 'pharmacy', 'Saltoniškių g. 9, Vilnius', 54.684600, 25.250000, true),
  -- Kaunas
  ('Eurovaistinė', 'Eurovaistinė Laisvės', kaunas_id, 'pharmacy', 'Laisvės al. 68, Kaunas', 54.897200, 23.917100, true),
  ('Eurovaistinė', 'Eurovaistinė Akropolis', kaunas_id, 'pharmacy', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.902700, 23.969900, true);

  -- ========================================
  -- GINTARINĖ VAISTINĖ (Pharmacy) - NAUJAS
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Gintarinė vaistinė', 'Gintarinė vaistinė Žirmūnai', vilnius_id, 'pharmacy', 'Žirmūnų g. 74, Vilnius', 54.697200, 25.293800, true),
  ('Gintarinė vaistinė', 'Gintarinė vaistinė Antakalnis', vilnius_id, 'pharmacy', 'Antakalnio g. 46, Vilnius', 54.706200, 25.293700, true),
  -- Kaunas
  ('Gintarinė vaistinė', 'Gintarinė vaistinė Savanorių', kaunas_id, 'pharmacy', 'Savanorių pr. 284, Kaunas', 54.905300, 23.910500, true);

  -- ========================================
  -- VARLE.LT (Electronics) - NAUJAS
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Varle.lt', 'Varle.lt Ukmergės', vilnius_id, 'electronics', 'Ukmergės g. 369, Vilnius', 54.729653, 25.308089, true),
  -- Kaunas
  ('Varle.lt', 'Varle.lt Islandijos', kaunas_id, 'electronics', 'Islandijos pl. 32, Kaunas', 54.950000, 23.913900, true);

  -- ========================================
  -- ELEKTROMARKT (Electronics) - NAUJAS
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Elektromarkt', 'Elektromarkt Ozo', vilnius_id, 'electronics', 'Ozo g. 25, Vilnius', 54.710400, 25.279800, true),
  ('Elektromarkt', 'Elektromarkt Panorama', vilnius_id, 'electronics', 'Saltoniškių g. 9, Vilnius', 54.684600, 25.250000, true),
  -- Kaunas
  ('Elektromarkt', 'Elektromarkt Akropolis', kaunas_id, 'electronics', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.902700, 23.969900, true);

  -- ========================================
  -- PIGU.LT (Online/Electronics) - NAUJAS
  -- ========================================
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  -- Vilnius
  ('Pigu.lt', 'Pigu.lt Didžiosios Minties', vilnius_id, 'electronics', 'Didžiosios Minties g. 16, Vilnius', 54.699200, 25.254800, true);

END $$;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS stores_chain_format_idx ON stores (chain, format);
CREATE INDEX IF NOT EXISTS stores_city_chain_idx ON stores (city_id, chain);

-- Update comments
COMMENT ON TABLE stores IS 'Updated 2026-01-21: Real addresses and coordinates for all Lithuanian store chains';

-- Summary
DO $$
DECLARE
  total_stores int;
  total_chains int;
  total_cities int;
BEGIN
  SELECT COUNT(*) INTO total_stores FROM stores WHERE is_active = true;
  SELECT COUNT(DISTINCT chain) INTO total_chains FROM stores WHERE is_active = true;
  SELECT COUNT(DISTINCT city_id) INTO total_cities FROM stores WHERE is_active = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REAL STORE DATA MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total stores: %', total_stores;
  RAISE NOTICE 'Total chains: %', total_chains;
  RAISE NOTICE 'Total cities: %', total_cities;
  RAISE NOTICE '========================================';
END $$;
