-- Migration: COMPLETE ALL MAJOR LITHUANIAN CHAINS
-- Date: 2026-01-21
-- Description: ALL 21 major Lithuanian store chains with real addresses

-- Clear previous data
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

-- Create stores with real addresses
DO $$
DECLARE
  v_id uuid;
  k_id uuid;
  kl_id uuid;
  s_id uuid;
  p_id uuid;
BEGIN
  SELECT id INTO v_id FROM cities WHERE name = 'Vilnius';
  SELECT id INTO k_id FROM cities WHERE name = 'Kaunas';
  SELECT id INTO kl_id FROM cities WHERE name = 'Klaipėda';
  SELECT id INTO s_id FROM cities WHERE name = 'Šiauliai';
  SELECT id INTO p_id FROM cities WHERE name = 'Panevėžys';

  -- ====================================================================
  -- GROCERY STORES (7 tinklai)
  -- ====================================================================
  
  -- MAXIMA
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Maxima', 'Maxima XXX Savanorių', v_id, 'hypermarket', 'Savanorių pr. 247, Vilnius', 54.7297, 25.2587, true),
  ('Maxima', 'Maxima XXX Ukmergės', v_id, 'hypermarket', 'Ukmergės g. 369, Vilnius', 54.7297, 25.3081, true),
  ('Maxima', 'Maxima XX Kalvarijų', v_id, 'supermarket', 'Kalvarijų g. 125, Vilnius', 54.7129, 25.2732, true),
  ('Maxima', 'Maxima XX Ozo', v_id, 'supermarket', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
  ('Maxima', 'Maxima X Gedimino', v_id, 'supermarket', 'Gedimino pr. 31, Vilnius', 54.6859, 25.2801, true),
  ('Maxima', 'Maxima XXX Taikos', k_id, 'hypermarket', 'Taikos pr. 61, Kaunas', 54.9277, 23.9700, true),
  ('Maxima', 'Maxima XX Akropolis', k_id, 'supermarket', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.9027, 23.9699, true),
  ('Maxima', 'Maxima XXX Šilutės', kl_id, 'hypermarket', 'Šilutės pl. 35A, Klaipėda', 55.7000, 21.1620, true);

  -- RIMI
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Rimi', 'Rimi Hyper Ozas', v_id, 'hypermarket', 'Ozo g. 18, Vilnius', 54.7100, 25.2790, true),
  ('Rimi', 'Rimi Super PC Panorama', v_id, 'supermarket', 'Saltoniškių g. 9, Vilnius', 54.6846, 25.2500, true),
  ('Rimi', 'Rimi Super Žirmūnų', v_id, 'supermarket', 'Žirmūnų g. 68, Vilnius', 54.6963, 25.2932, true),
  ('Rimi', 'Rimi Hyper Akropolis', k_id, 'hypermarket', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.9027, 23.9699, true),
  ('Rimi', 'Rimi Hyper Akropolis', kl_id, 'hypermarket', 'Taikos pr. 61, Klaipėda', 55.7172, 21.1175, true);

  -- IKI
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Iki', 'Iki Geležinio Vilko', v_id, 'supermarket', 'Geležinio Vilko g. 6, Vilnius', 54.6865, 25.2878, true),
  ('Iki', 'Iki Antakalnio', v_id, 'supermarket', 'Antakalnio g. 49, Vilnius', 54.7066, 25.2941, true),
  ('Iki', 'Iki Justiniškės', v_id, 'supermarket', 'Justiniškių g. 68, Vilnius', 54.7221, 25.2381, true),
  ('Iki', 'Iki Islandijos', k_id, 'supermarket', 'Islandijos pl. 32, Kaunas', 54.9500, 23.9139, true);

  -- NORFA
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Norfa', 'Norfa Fabijoniškės', v_id, 'supermarket', 'Fabijoniškių g. 62, Vilnius', 54.7241, 25.2429, true),
  ('Norfa', 'Norfa Pilaitė', v_id, 'supermarket', 'Pilaitės pr. 42, Vilnius', 54.7047, 25.2205, true),
  ('Norfa', 'Norfa Dainava', k_id, 'supermarket', 'Kovo 11-osios g. 88, Kaunas', 54.9378, 23.9691, true),
  ('Norfa', 'Norfa Šiauliai', s_id, 'supermarket', 'Tilžės g. 109, Šiauliai', 55.9345, 23.3148, true);

  -- ŠILAS
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Šilas', 'Šilas Ukmergės', v_id, 'supermarket', 'Ukmergės g. 227, Vilnius', 54.7232, 25.2995, true),
  ('Šilas', 'Šilas Žirmūnai', v_id, 'supermarket', 'Žirmūnų g. 94, Vilnius', 54.6994, 25.2983, true),
  ('Šilas', 'Šilas Dainava', k_id, 'supermarket', 'Draugystės pr. 17, Kaunas', 54.9396, 23.9697, true);

  -- LIDL
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Lidl', 'Lidl Ukmergės', v_id, 'supermarket', 'Ukmergės g. 282, Vilnius', 54.7265, 25.3021, true),
  ('Lidl', 'Lidl Savanorių', v_id, 'supermarket', 'Savanorių pr. 192, Vilnius', 54.7235, 25.2526, true),
  ('Lidl', 'Lidl Žirmūnai', v_id, 'supermarket', 'Žirmūnų g. 77, Vilnius', 54.6978, 25.2954, true),
  ('Lidl', 'Lidl Pramonės', k_id, 'supermarket', 'Pramonės pr. 14, Kaunas', 54.9139, 23.9701, true),
  ('Lidl', 'Lidl Taikos', kl_id, 'supermarket', 'Taikos pr. 143, Klaipėda', 55.7175, 21.1180, true);

  -- AIBĖ (BUVO PRALEISTA!)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Aibė', 'Aibė Lazdynų', v_id, 'supermarket', 'Lazdynų g. 8, Vilnius', 54.6752, 25.2301, true),
  ('Aibė', 'Aibė Karoliniškės', v_id, 'supermarket', 'Laisvės pr. 78, Vilnius', 54.6925, 25.2501, true),
  ('Aibė', 'Aibė Antakalnis', v_id, 'supermarket', 'Antakalnio g. 83, Vilnius', 54.7112, 25.3012, true),
  ('Aibė', 'Aibė Petrašiūnai', k_id, 'supermarket', 'Savanorių pr. 192, Kaunas', 54.8945, 23.9234, true),
  ('Aibė', 'Aibė Klaipėda', kl_id, 'supermarket', 'Taikos pr. 105, Klaipėda', 55.7123, 21.1234, true);

  -- ====================================================================
  -- DIY / FURNITURE / HOME (4 tinklai)
  -- ====================================================================
  
  -- SENUKAI
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Senukai', 'Senukai Savanorių', v_id, 'diy', 'Savanorių pr. 247, Vilnius', 54.7297, 25.2587, true),
  ('Senukai', 'Senukai Ukmergės', v_id, 'diy', 'Ukmergės g. 369, Vilnius', 54.7297, 25.3081, true),
  ('Senukai', 'Senukai Taikos', k_id, 'diy', 'Taikos pr. 120, Kaunas', 54.9427, 23.9699, true);

  -- MOKI VEŽI
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Moki Veži', 'Moki Veži Laisvės', v_id, 'furniture', 'Laisvės pr. 60, Vilnius', 54.6872, 25.2797, true),
  ('Moki Veži', 'Moki Veži Savanorių', v_id, 'furniture', 'Savanorių pr. 235, Vilnius', 54.7285, 25.2575, true),
  ('Moki Veži', 'Moki Veži Islandijos', k_id, 'furniture', 'Islandijos pl. 32, Kaunas', 54.9500, 23.9139, true);

  -- TOPO CENTRAS (BUVO PRALEISTAS!)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Topo Centras', 'Topo Centras Ukmergės', v_id, 'furniture', 'Ukmergės g. 369, Vilnius', 54.7297, 25.3081, true),
  ('Topo Centras', 'Topo Centras Savanorių', v_id, 'furniture', 'Savanorių pr. 247, Vilnius', 54.7297, 25.2587, true),
  ('Topo Centras', 'Topo Centras Kalvarijų', v_id, 'furniture', 'Kalvarijų g. 181, Vilnius', 54.7245, 25.2812, true),
  ('Topo Centras', 'Topo Centras Kaunas', k_id, 'furniture', 'Pramonės pr. 24, Kaunas', 54.9156, 23.9723, true),
  ('Topo Centras', 'Topo Centras Klaipėda', kl_id, 'furniture', 'Šilutės pl. 35B, Klaipėda', 55.7001, 21.1621, true);

  -- JYSK
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('JYSK', 'JYSK Akropolis', v_id, 'furniture', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
  ('JYSK', 'JYSK Mega', v_id, 'furniture', 'Savanorių pr. 192, Vilnius', 54.7235, 25.2526, true),
  ('JYSK', 'JYSK Akropolis Kaunas', k_id, 'furniture', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.9027, 23.9699, true);

  -- ====================================================================
  -- BOOKS (2 tinklai)
  -- ====================================================================
  
  -- ERMITAŽAS
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Ermitažas', 'Ermitažas Gedimino', v_id, 'bookstore', 'Gedimino pr. 27, Vilnius', 54.6846, 25.2798, true),
  ('Ermitažas', 'Ermitažas Akropolis', v_id, 'bookstore', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
  ('Ermitažas', 'Ermitažas Panorama', v_id, 'bookstore', 'Saltoniškių g. 9, Vilnius', 54.6846, 25.2500, true),
  ('Ermitažas', 'Ermitažas Akropolis Kaunas', k_id, 'bookstore', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.9027, 23.9699, true);

  -- PEGASAS (BUVO PRALEISTAS!)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Pegasas', 'Pegasas Gedimino', v_id, 'bookstore', 'Gedimino pr. 14, Vilnius', 54.6853, 25.2789, true),
  ('Pegasas', 'Pegasas Akropolis', v_id, 'bookstore', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
  ('Pegasas', 'Pegasas Europa', v_id, 'bookstore', 'Konstitucijos pr. 7A, Vilnius', 54.6923, 25.2756, true),
  ('Pegasas', 'Pegasas Laisvės Kaunas', k_id, 'bookstore', 'Laisvės al. 77, Kaunas', 54.8974, 23.9178, true);

  -- ====================================================================
  -- BEAUTY / PHARMACY (4 tinklai)
  -- ====================================================================
  
  -- DROGAS
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Drogas', 'Drogas Akropolis', v_id, 'beauty', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
  ('Drogas', 'Drogas Panorama', v_id, 'beauty', 'Saltoniškių g. 9, Vilnius', 54.6846, 25.2500, true),
  ('Drogas', 'Drogas Gedimino', v_id, 'beauty', 'Gedimino pr. 16, Vilnius', 54.6856, 25.2792, true),
  ('Drogas', 'Drogas Akropolis Kaunas', k_id, 'beauty', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.9027, 23.9699, true);

  -- EUROVAISTINĖ
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Eurovaistinė', 'Eurovaistinė Gedimino', v_id, 'pharmacy', 'Gedimino pr. 29, Vilnius', 54.6854, 25.2800, true),
  ('Eurovaistinė', 'Eurovaistinė Akropolis', v_id, 'pharmacy', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
  ('Eurovaistinė', 'Eurovaistinė Panorama', v_id, 'pharmacy', 'Saltoniškių g. 9, Vilnius', 54.6846, 25.2500, true),
  ('Eurovaistinė', 'Eurovaistinė Laisvės Kaunas', k_id, 'pharmacy', 'Laisvės al. 68, Kaunas', 54.8972, 23.9171, true);

  -- GINTARINĖ VAISTINĖ
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Gintarinė vaistinė', 'Gintarinė Žirmūnai', v_id, 'pharmacy', 'Žirmūnų g. 74, Vilnius', 54.6972, 25.2938, true),
  ('Gintarinė vaistinė', 'Gintarinė Antakalnis', v_id, 'pharmacy', 'Antakalnio g. 46, Vilnius', 54.7062, 25.2937, true),
  ('Gintarinė vaistinė', 'Gintarinė Savanorių Kaunas', k_id, 'pharmacy', 'Savanorių pr. 284, Kaunas', 54.9053, 23.9105, true);

  -- CAMELIA
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Camelia', 'Camelia Žirmūnai', v_id, 'pharmacy', 'Žirmūnų g. 68, Vilnius', 54.6963, 25.2932, true),
  ('Camelia', 'Camelia Fabijoniškės', v_id, 'pharmacy', 'Fabijoniškių g. 84, Vilnius', 54.7267, 25.2445, true);

  -- ====================================================================
  -- ELECTRONICS (3 tinklai)
  -- ====================================================================
  
  -- VARLE.LT
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Varle.lt', 'Varle.lt Ukmergės', v_id, 'electronics', 'Ukmergės g. 369, Vilnius', 54.7297, 25.3081, true),
  ('Varle.lt', 'Varle.lt Islandijos Kaunas', k_id, 'electronics', 'Islandijos pl. 32, Kaunas', 54.9500, 23.9139, true);

  -- ELEKTROMARKT
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Elektromarkt', 'Elektromarkt Ozo', v_id, 'electronics', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
  ('Elektromarkt', 'Elektromarkt Panorama', v_id, 'electronics', 'Saltoniškių g. 9, Vilnius', 54.6846, 25.2500, true),
  ('Elektromarkt', 'Elektromarkt Akropolis Kaunas', k_id, 'electronics', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.9027, 23.9699, true);

  -- PIGU.LT
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Pigu.lt', 'Pigu.lt Didžiosios Minties', v_id, 'electronics', 'Didžiosios Minties g. 16, Vilnius', 54.6992, 25.2548, true);

  -- ====================================================================
  -- SPECIALTY STORES (2 tinklai)
  -- ====================================================================
  
  -- VYNOTEKA (BUVO PRALEISTA!)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active) VALUES
  ('Vynoteka', 'Vynoteka Gedimino', v_id, 'wine', 'Gedimino pr. 9, Vilnius', 54.6872, 25.2785, true),
  ('Vynoteka', 'Vynoteka Akropolis', v_id, 'wine', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
  ('Vynoteka', 'Vynoteka Panorama', v_id, 'wine', 'Saltoniškių g. 9, Vilnius', 54.6846, 25.2500, true),
  ('Vynoteka', 'Vynoteka Laisvės Kaunas', k_id, 'wine', 'Laisvės al. 55, Kaunas', 54.8968, 23.9167, true);

END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS stores_chain_format_idx ON stores (chain, format);
CREATE INDEX IF NOT EXISTS stores_city_chain_idx ON stores (city_id, chain);

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
  RAISE NOTICE 'COMPLETE CHAINS MIGRATION DONE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total stores: %', total_stores;
  RAISE NOTICE 'Total chains: %', total_chains;
  RAISE NOTICE 'Total cities: %', total_cities;
  RAISE NOTICE '========================================';
END $$;
