-- Add typed natal input snapshots without changing prior migration checksums.
ALTER TABLE study_entries DROP CONSTRAINT IF EXISTS study_entries_discipline_check;
ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check
 CHECK (discipline IN ('general','mai-hoa','luc-hao','ky-mon','phong-thuy','numerology','western-astrology'));
