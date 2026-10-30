# supabase

Database schema, seed data and SQL tests for the platform.

- `migrations/`: 15 ordered SQL migrations, starting with `initial_schema` and the attempt-submission RPC.
- `seed/dynamics.sql`: seed data.
- `tests/academic_collaboration_beta.sql`: a pgTAP test plan (16 assertions) for the academic collaboration beta (run with `npm run test:db`).
