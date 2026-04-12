# Vercel Deployment

This app is a Next.js 16 project and the production build already passes with:

```bash
npm run build
```

## Required environment variables

Set these in Vercel Project Settings -> Environment Variables.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-production-domain
SUPABASE_AVATAR_BUCKET=avatars
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only and must never be exposed to the client.
- `SUPABASE_AVATAR_BUCKET` defaults to `avatars`, but set it explicitly in Vercel to avoid config drift.
- `NEXT_PUBLIC_APP_URL` should be your production domain, not `http://localhost:3000`.

## Vercel project settings

Recommended settings:

- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave empty so Vercel can use the Next.js default

If you import the parent workspace instead of this app directory, set the Vercel Root Directory to:

```text
rootlearn-app
```

## Supabase checklist before first deploy

1. Apply the SQL migrations in `supabase/migrations`.
2. Confirm the target Supabase project has the same tables, RPCs, and storage bucket expected by the app.
3. Add the Vercel production domain to Supabase Auth URL settings if you later enable email links or OAuth redirects.
4. Use separate environment variables for Preview and Production if they should point to different Supabase projects.

## Verification

Run these checks before pushing to Vercel:

```bash
npm run build
npm run test
```

After deploy:

1. Verify login and register flows.
2. Verify protected pages render with a valid session.
3. Verify admin import and root-word quiz flows that depend on server-side Supabase access.
