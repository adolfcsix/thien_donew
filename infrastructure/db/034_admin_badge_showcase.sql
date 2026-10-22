-- Cosmetic showcase only. Does not grant rank points, roles, Expert or Pro.
CREATE TABLE admin_badge_showcase (
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 level SMALLINT NOT NULL CHECK(level BETWEEN 1 AND 18),
 position SMALLINT NOT NULL CHECK(position BETWEEN 0 AND 17),
 PRIMARY KEY(user_id,level),
 UNIQUE(user_id,position)
);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='thiendo_app') THEN
  GRANT SELECT,INSERT,DELETE ON admin_badge_showcase TO thiendo_app;
 END IF;
END $$;
