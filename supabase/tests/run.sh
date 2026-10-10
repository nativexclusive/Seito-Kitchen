#!/usr/bin/env bash
# Apply the migrations and seed to a scratch database on a local Postgres and run the
# scenario tests. Usage: npm run db:test   (DB_TEST_URL overrides the server, default local socket)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${DB_TEST_NAME:-mk_test}
PSQL="psql -v ON_ERROR_STOP=1 -q"
dropdb --if-exists "$DB" && createdb "$DB"
$PSQL -d "$DB" -f supabase/tests/supabase_shim.sql
for f in supabase/migrations/*.sql; do $PSQL -d "$DB" -f "$f"; done
$PSQL -d "$DB" -f supabase/seed.sql > /dev/null
$PSQL -d "$DB" -f supabase/tests/order_flow_test.sql 2>&1 | grep -E "ok -|ERROR|FAILED|PASSED"
