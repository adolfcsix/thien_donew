-- V11.133: authorise persisted Taiyi input-only snapshots, preserving existing study disciplines.
ALTER TABLE study_entries DROP CONSTRAINT IF EXISTS study_entries_discipline_check;
ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check
 CHECK (discipline IN ('general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','numerology','western-astrology','tarot'));
