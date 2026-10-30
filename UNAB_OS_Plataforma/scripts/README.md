# scripts

Operational scripts for seeding data and syncing TEMA.

- `seed-canonical-catalog.mjs`, `seed-orca-materias.mjs`: seed the course catalog. They set test users and passwords in code; run them only against a local or throwaway project.
- `import-tema-cloud.mjs`, `sync-tema-cloud.mjs`, `sync_tema_cloud.py`: TEMA import and sync, with schedule and snapshot policy modules.
- `configure-jarvis-cloud-env.mjs`, `radar_orca_9am.mjs`, `repair-tema-filenames.mjs`: setup and maintenance helpers.
- `test-tema-auth.mjs`: auth check script; it contains a hard-coded credential and should move to environment variables.
- `lib/`: shared filename helpers.
