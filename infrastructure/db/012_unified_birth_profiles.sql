-- V11.138: append-only private birth profiles; no old charts/study rows are rewritten.
CREATE TABLE IF NOT EXISTS birth_profiles (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name VARCHAR(70) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 70),
 birth_date DATE NOT NULL,
 hour SMALLINT CHECK (hour BETWEEN 0 AND 23),
 minute SMALLINT CHECK (minute BETWEEN 0 AND 59),
 calendar VARCHAR(5) NOT NULL CHECK (calendar IN ('solar','lunar')),
 leap BOOLEAN NOT NULL DEFAULT FALSE,
 gender VARCHAR(3) CHECK (gender IN ('Nam','Nữ')),
 time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
 birth_place VARCHAR(120) NOT NULL DEFAULT '',
 latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
 longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
 time_accuracy VARCHAR(10) NOT NULL CHECK (time_accuracy IN ('exact','estimated','unknown')),
 notes VARCHAR(1000) NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT birth_profiles_time_pair CHECK ((hour IS NULL) = (minute IS NULL)),
 CONSTRAINT birth_profiles_coords_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
 CONSTRAINT birth_profiles_accuracy CHECK ((time_accuracy = 'unknown') = (hour IS NULL)),
 CONSTRAINT birth_profiles_lunar_leap CHECK (calendar <> 'solar' OR leap = FALSE),
 CONSTRAINT birth_profiles_owner_unique UNIQUE (id,user_id)
);
CREATE INDEX IF NOT EXISTS birth_profiles_owner_recent_idx ON birth_profiles(user_id,updated_at DESC,id);
-- Existing journals remain detached until the owner explicitly associates a profile.
ALTER TABLE study_entries ADD COLUMN IF NOT EXISTS birth_profile_id UUID;
ALTER TABLE study_entries ADD CONSTRAINT study_entries_owner_birth_profile_fk
 FOREIGN KEY (birth_profile_id,user_id) REFERENCES birth_profiles(id,user_id) ON DELETE SET NULL (birth_profile_id);
CREATE INDEX IF NOT EXISTS study_entries_owner_profile_idx ON study_entries(user_id,birth_profile_id);
-- Retain all disciplines previously enabled in server validation; older migrations omitted three.
ALTER TABLE study_entries DROP CONSTRAINT IF EXISTS study_entries_discipline_check;
ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check
 CHECK (discipline IN ('general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','ha-lac','thiet-ban','lich-phap','numerology','western-astrology','tarot'));

-- A newly saved Tử Vi chart may be linked to the same owner’s birth profile.
-- Older charts stay unlinked until an explicit user action.
ALTER TABLE charts ADD COLUMN IF NOT EXISTS birth_profile_id UUID;
ALTER TABLE charts ADD CONSTRAINT charts_owner_birth_profile_fk
 FOREIGN KEY (birth_profile_id,user_id) REFERENCES birth_profiles(id,user_id) ON DELETE SET NULL (birth_profile_id);
CREATE INDEX IF NOT EXISTS charts_owner_birth_profile_idx ON charts(user_id,birth_profile_id);
