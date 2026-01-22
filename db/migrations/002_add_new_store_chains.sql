-- Migration: Add new store chains to the database
-- Date: 2026-01-21
-- Description: Adds Norfa, Šilas, Senukai, Moki Veži, Ermitažas, and Drogas chains

-- Insert cities if they don't exist
INSERT INTO cities (name, country_code, region) 
VALUES 
  ('Vilnius', 'LT', 'Vilniaus m.')
ON CONFLICT (name, country_code) DO NOTHING;

INSERT INTO cities (name, country_code, region) 
VALUES 
  ('Kaunas', 'LT', 'Kauno m.')
ON CONFLICT (name, country_code) DO NOTHING;

INSERT INTO cities (name, country_code, region) 
VALUES 
  ('Klaipėda', 'LT', 'Klaipėdos m.')
ON CONFLICT (name, country_code) DO NOTHING;

-- Get city IDs for use in store insertion
DO $$
DECLARE
  vilnius_id uuid;
  kaunas_id uuid;
  klaipeda_id uuid;
BEGIN
  SELECT id INTO vilnius_id FROM cities WHERE name = 'Vilnius' AND country_code = 'LT';
  SELECT id INTO kaunas_id FROM cities WHERE name = 'Kaunas' AND country_code = 'LT';
  SELECT id INTO klaipeda_id FROM cities WHERE name = 'Klaipėda' AND country_code = 'LT';

  -- NORFA STORES (Grocery)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active)
  VALUES
    ('Norfa', 'Norfa Vilnius Akropolis', vilnius_id, 'supermarket', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
    ('Norfa', 'Norfa Kaunas', kaunas_id, 'supermarket', 'Savanorių pr. 255, Kaunas', 54.9027, 23.9139, true),
    ('Norfa', 'Norfa Klaipėda', klaipeda_id, 'supermarket', 'Taikos pr. 61, Klaipėda', 55.7172, 21.1175, true);

  -- ŠILAS STORES (Grocery)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active)
  VALUES
    ('Šilas', 'Šilas Vilnius', vilnius_id, 'supermarket', 'Ukmergės g. 369, Vilnius', 54.7297, 25.3081, true),
    ('Šilas', 'Šilas Kaunas', kaunas_id, 'supermarket', 'Pramonės pr. 16, Kaunas', 54.9138, 23.9699, true);

  -- SENUKAI STORES (DIY/Hardware)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active)
  VALUES
    ('Senukai', 'Senukai Vilnius Savanorių', vilnius_id, 'hypermarket', 'Savanorių pr. 247, Vilnius', 54.7297, 25.2587, true),
    ('Senukai', 'Senukai Kaunas Taikos', kaunas_id, 'hypermarket', 'Taikos pr. 120, Kaunas', 54.9427, 23.9699, true),
    ('Senukai', 'Senukai Klaipėda', klaipeda_id, 'hypermarket', 'Šilutės pl. 35A, Klaipėda', 55.7000, 21.1620, true);

  -- MOKI VEŽI STORES (Furniture/DIY)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active)
  VALUES
    ('Moki Veži', 'Moki Veži Vilnius', vilnius_id, 'hypermarket', 'Laisvės pr. 60, Vilnius', 54.6872, 25.2797, true),
    ('Moki Veži', 'Moki Veži Kaunas', kaunas_id, 'hypermarket', 'Islandijos pl. 32, Kaunas', 54.9500, 23.9139, true);

  -- ERMITAŽAS STORES (Books)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active)
  VALUES
    ('Ermitažas', 'Ermitažas Vilnius Gedimino', vilnius_id, 'bookstore', 'Gedimino pr. 27, Vilnius', 54.6846, 25.2798, true),
    ('Ermitažas', 'Ermitažas Vilnius Akropolis', vilnius_id, 'bookstore', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
    ('Ermitažas', 'Ermitažas Kaunas Akropolis', kaunas_id, 'bookstore', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.9027, 23.9699, true);

  -- DROGAS STORES (Pharmacy/Beauty)
  INSERT INTO stores (chain, name, city_id, format, address, lat, lon, is_active)
  VALUES
    ('Drogas', 'Drogas Vilnius Akropolis', vilnius_id, 'pharmacy', 'Ozo g. 25, Vilnius', 54.7104, 25.2798, true),
    ('Drogas', 'Drogas Vilnius Panorama', vilnius_id, 'pharmacy', 'Saltoniškių g. 9, Vilnius', 54.6846, 25.2500, true),
    ('Drogas', 'Drogas Kaunas Akropolis', kaunas_id, 'pharmacy', 'Karaliaus Mindaugo pr. 49, Kaunas', 54.9027, 23.9699, true),
    ('Drogas', 'Drogas Klaipėda Akropolis', klaipeda_id, 'pharmacy', 'Taikos pr. 61, Klaipėda', 55.7172, 21.1175, true);

END $$;

-- Create index for faster chain lookups
CREATE INDEX IF NOT EXISTS stores_chain_idx ON stores (chain);

-- Log the migration
COMMENT ON TABLE stores IS 'Updated 2026-01-21: Added Norfa, Šilas, Senukai, Moki Veži, Ermitažas, Drogas chains';
