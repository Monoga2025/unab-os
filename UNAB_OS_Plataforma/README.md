# Universidad OS

A Next.js learning and academic collaboration workspace backed by Supabase Auth and Postgres.

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Replace placeholders with the URL and publishable key of your Supabase project.
4. In Supabase **Authentication → URL Configuration**, add:
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback`
5. In Supabase **Authentication → Users**, create and confirm each institutional user (`@unab.edu.co`).
6. Start the app with `npm run dev` and visit `http://localhost:3000/login`.

## Sign in

The application strictly enforces verified institutional email addresses (`@unab.edu.co`) using passwordless email OTP/magic links. Unknown or external email domains are rejected server-side.

### Temporary test access

Set `NEXT_PUBLIC_ENABLE_TEST_ACCESS=true` only in a local test environment after enabling Supabase Anonymous Sign-Ins. Set the variable back to `false` and disable Anonymous Sign-Ins before production.

## Checks

```bash
npm run test
npm run typecheck
npm run build
```

## Deployment

Refer to [`docs/railway-deployment.md`](./docs/railway-deployment.md) for full deployment instructions, environment variables, operator runbook, smoke tests, and rollback procedures on Railway.
