-- Permit versioned Tarot RWS snapshots in the existing user-owned study library.
ALTER TABLE study_entries DROP CONSTRAINT IF EXISTS study_entries_discipline_check;
ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check
 CHECK (discipline IN ('general','mai-hoa','luc-hao','ky-mon','phong-thuy','numerology','western-astrology','tarot'));
