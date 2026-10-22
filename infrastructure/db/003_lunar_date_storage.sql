-- V8.5: preserve dates in their own calendar instead of assuming Gregorian DATE.
-- A valid lunar date such as 2024-02-30 is not a valid Gregorian DATE.
-- Existing rows convert without data loss; new records validated by Astrology Engine.
ALTER TABLE charts
  ALTER COLUMN birth_date TYPE VARCHAR(10)
  USING to_char(birth_date, 'YYYY-MM-DD');
ALTER TABLE charts
  ADD CONSTRAINT charts_birth_date_shape
  CHECK (birth_date ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');
