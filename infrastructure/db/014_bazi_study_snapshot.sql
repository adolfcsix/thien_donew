-- V11.142: Add a distinct BaZi study type without rewriting any existing journal.
-- PostgreSQL CHECK changes are transactional under infrastructure/scripts/migrate.mjs.
ALTER TABLE study_entries DROP CONSTRAINT IF EXISTS study_entries_discipline_check;
ALTER TABLE study_entries ADD CONSTRAINT study_entries_discipline_check
 CHECK (discipline IN ('general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','ha-lac','thiet-ban','lich-phap','numerology','western-astrology','tarot','bazi'));
-- Existing rows, profile links, indices, receipts and the version-1 backup format remain intact.
