-- V11.132: Add research snapshots for Đại Lục Nhâm, preserving existing types.
ALTER TABLE study_entries DROP CONSTRAINT IF EXISTS study_entries_discipline_check;
ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check
 CHECK (discipline IN ('general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','phong-thuy','numerology','western-astrology','tarot'));
