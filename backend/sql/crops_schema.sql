-- ============================================================
-- AgriChain: Crop Tables, RLS Policies & Indexes
-- Run this in Supabase SQL Editor once.
-- ============================================================

-- ─── 1. Master Crop Table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS crops (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    crop_name     TEXT NOT NULL UNIQUE,
    suitable_soil_types   TEXT[]   NOT NULL DEFAULT '{}',
    min_temperature       REAL     NOT NULL DEFAULT 0,
    max_temperature       REAL     NOT NULL DEFAULT 50,
    min_area_required     REAL     NOT NULL DEFAULT 0,
    ideal_sowing_months   INT[]    NOT NULL DEFAULT '{}',
    growth_duration_days  INT      NOT NULL DEFAULT 90,
    water_requirement     TEXT     NOT NULL DEFAULT 'Medium',
    region_tags           TEXT[]   NOT NULL DEFAULT '{}',
    created_at            TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE crops IS 'Read-only master crop catalog with growing conditions.';

-- ─── 2. User Selected Crops Table ───────────────────────────

CREATE TABLE IF NOT EXISTS user_selected_crops (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_phone            TEXT         NOT NULL,
    crop_id               UUID         NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    sowing_date           DATE         NOT NULL,
    predicted_harvest_date DATE,
    irrigation_type       TEXT         NOT NULL DEFAULT 'Drip',
    last_irrigation_date  DATE,
    created_at            TIMESTAMPTZ  DEFAULT now(),

    -- One user cannot select the same crop twice
    UNIQUE (user_phone, crop_id)
);

COMMENT ON TABLE user_selected_crops IS 'Per-user crop selections with sowing/harvest tracking.';

-- ─── 3. Indexes ─────────────────────────────────────────────

-- Fast lookup of user's crops
CREATE INDEX IF NOT EXISTS idx_usc_user_phone
    ON user_selected_crops (user_phone);

-- FK lookup
CREATE INDEX IF NOT EXISTS idx_usc_crop_id
    ON user_selected_crops (crop_id);

-- Master table: sowing month array search (GIN)
CREATE INDEX IF NOT EXISTS idx_crops_sowing_months
    ON crops USING GIN (ideal_sowing_months);

-- Master table: soil types array search (GIN)
CREATE INDEX IF NOT EXISTS idx_crops_soil_types
    ON crops USING GIN (suitable_soil_types);

-- ─── 4. RLS Policies ───────────────────────────────────────

-- crops: public read, no insert/update/delete from client
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crops_read_all"
    ON crops FOR SELECT
    USING (true);

-- user_selected_crops: open for phone-based auth (no Supabase Auth)
-- Since this app uses anon key + phone matching, allow full access via anon key.
ALTER TABLE user_selected_crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usc_select_own"
    ON user_selected_crops FOR SELECT
    USING (true);

CREATE POLICY "usc_insert_own"
    ON user_selected_crops FOR INSERT
    WITH CHECK (true);

CREATE POLICY "usc_update_own"
    ON user_selected_crops FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "usc_delete_own"
    ON user_selected_crops FOR DELETE
    USING (true);

-- ─── 5. Seed Data (Indian Crops) ────────────────────────────

INSERT INTO crops (crop_name, suitable_soil_types, min_temperature, max_temperature, min_area_required, ideal_sowing_months, growth_duration_days, water_requirement, region_tags)
VALUES
    ('Wheat',      '{"Alluvial Soil","Loamy","Black Cotton Soil","Clay Soil"}',     10, 25, 0.1, '{10,11,12}',       120, 'Medium',  '{"North India","Central India","Punjab","Haryana","UP","MP"}'),
    ('Rice',       '{"Alluvial Soil","Clay Soil","Loamy","Black Cotton Soil"}',     20, 37, 0.1, '{6,7}',            150, 'High',    '{"South India","East India","West Bengal","AP","TN","Kerala"}'),
    ('Tomato',     '{"Loamy","Sandy Soil","Red Soil","Alluvial Soil"}',             18, 30, 0.05, '{1,6,7,9,10}',     75, 'Medium',  '{"Maharashtra","Karnataka","AP","TN","MP"}'),
    ('Cotton',     '{"Black Cotton Soil","Alluvial Soil","Loamy"}',                 21, 35, 0.2, '{4,5,6}',          180, 'Medium',  '{"Gujarat","Maharashtra","Telangana","AP","Rajasthan","MP"}'),
    ('Sugarcane',  '{"Alluvial Soil","Loamy","Black Cotton Soil","Clay Soil"}',     20, 35, 0.2, '{1,2,3,10}',       360, 'High',    '{"UP","Maharashtra","Karnataka","TN","Gujarat"}'),
    ('Maize',      '{"Loamy","Alluvial Soil","Sandy Soil","Red Soil"}',             18, 32, 0.1, '{6,7}',            100, 'Medium',  '{"Bihar","UP","MP","Rajasthan","Karnataka"}'),
    ('Soybean',    '{"Black Cotton Soil","Loamy","Alluvial Soil"}',                 20, 30, 0.1, '{6,7}',            100, 'Medium',  '{"MP","Maharashtra","Rajasthan","Karnataka"}'),
    ('Groundnut',  '{"Sandy Soil","Red Soil","Loamy","Laterite Soil"}',             22, 33, 0.1, '{6,7,1,2}',        120, 'Low',     '{"Gujarat","AP","TN","Rajasthan","Karnataka"}'),
    ('Mustard',    '{"Loamy","Alluvial Soil","Sandy Soil"}',                        10, 25, 0.1, '{10,11}',          120, 'Low',     '{"Rajasthan","UP","MP","Haryana","Gujarat"}'),
    ('Chickpea',   '{"Black Cotton Soil","Loamy","Alluvial Soil"}',                 10, 25, 0.1, '{10,11}',          110, 'Low',     '{"MP","Rajasthan","Maharashtra","UP","Karnataka"}'),
    ('Onion',      '{"Loamy","Alluvial Soil","Sandy Soil","Red Soil"}',             13, 30, 0.05, '{10,11,12,1}',     150, 'Medium',  '{"Maharashtra","Karnataka","Gujarat","MP","Rajasthan"}'),
    ('Potato',     '{"Loamy","Alluvial Soil","Sandy Soil"}',                        15, 25, 0.05, '{10,11,12}',       90, 'Medium',  '{"UP","West Bengal","Bihar","Punjab","Gujarat"}'),
    ('Chilli',     '{"Loamy","Sandy Soil","Red Soil","Black Cotton Soil"}',         20, 35, 0.05, '{1,2,6,7}',        120, 'Medium',  '{"AP","Telangana","Karnataka","Maharashtra","TN"}'),
    ('Turmeric',   '{"Loamy","Alluvial Soil","Red Soil","Laterite Soil"}',          20, 35, 0.05, '{5,6,7}',          270, 'High',    '{"AP","Telangana","TN","Karnataka","Maharashtra"}'),
    ('Ginger',     '{"Loamy","Red Soil","Laterite Soil","Alluvial Soil"}',          20, 32, 0.05, '{4,5,6}',          240, 'High',    '{"Kerala","Karnataka","AP","Meghalaya","Sikkim"}'),
    ('Bajra',      '{"Sandy Soil","Loamy","Alluvial Soil","Red Soil"}',             25, 35, 0.1, '{6,7}',             90, 'Low',     '{"Rajasthan","Gujarat","Haryana","UP","Maharashtra"}'),
    ('Jowar',      '{"Black Cotton Soil","Red Soil","Loamy","Laterite Soil"}',      25, 35, 0.1, '{6,7,9,10}',       110, 'Low',     '{"Maharashtra","Karnataka","MP","Rajasthan","AP"}'),
    ('Sunflower',  '{"Black Cotton Soil","Loamy","Alluvial Soil","Red Soil"}',      20, 30, 0.1, '{1,2,6,7}',        100, 'Medium',  '{"Karnataka","AP","Maharashtra","TN","Haryana"}'),
    ('Lentil',     '{"Loamy","Alluvial Soil","Clay Soil"}',                         15, 25, 0.1, '{10,11}',          120, 'Low',     '{"MP","UP","Bihar","West Bengal","Rajasthan"}')
ON CONFLICT (crop_name) DO NOTHING;
