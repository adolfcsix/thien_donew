#!/usr/bin/env bash
set -Eeuo pipefail
# Executed only during INITIAL creation of the PostgreSQL volume.
# SQL reads the secret inside the container: no password in command arguments.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
CREATE ROLE thiendo_app LOGIN;
SELECT format('ALTER ROLE thiendo_app PASSWORD %L', btrim(pg_read_file('/run/secrets/db_app_password'))) \gexec
GRANT CONNECT ON DATABASE thiendo TO thiendo_app;
GRANT USAGE ON SCHEMA public TO thiendo_app;
ALTER DEFAULT PRIVILEGES FOR ROLE thiendo_owner IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO thiendo_app;
SQL
# Ensure future serial/identity sequences can be used by the restricted API role.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
ALTER DEFAULT PRIVILEGES FOR ROLE thiendo_owner IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO thiendo_app;
SQL
