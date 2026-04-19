# Rootly

Rootly is a role-based English root-word learning platform built with Next.js 16, React 19, and Supabase. The current codebase includes separate student, teacher, and admin workspaces, plus import tooling for root words, root-word quizzes, and exam question banks.

The product UI and seeded content are currently Vietnamese-first, while the codebase and deployment docs are maintained in English.

## Current product scope

### Student workspace

- `/today`: daily dashboard with plans, review queue, leaderboard context, and a daily root recommendation
- `/reviews`: spaced-review queue
- `/library` and `/library/[rootId]`: curated library and detailed root-word pages
- `/roots` and `/roots/[rootId]`: root browsing and learning detail views
- `/quiz/[rootId]`: root-word quiz flow
- `/calendar`: study planning and schedule management
- `/progress`: progress summaries and activity views
- `/ranking`: leaderboard and insights
- `/classes` and `/classes/[classId]`: class participation
- `/exams` and `/exams/[examId]`: exam list, timed attempts, and results
- `/notifications`: inbox with unread state and read actions
- `/profile`: profile settings and avatar updates

### Teacher workspace

- `/teacher/classes` and `/teacher/classes/[classId]`: class management and suggestions
- `/teacher/exams` and `/teacher/exams/[examId]`: exam oversight
- `/teacher/library` and `/teacher/library/[rootId]`
- `/teacher/roots` and `/teacher/roots/[rootId]`
- `/teacher/calendar`
- `/teacher/progress`
- `/teacher/ranking`
- `/teacher/notifications`
- `/teacher/profile`

### Admin workspace

- `/admin/root-words` and `/admin/root-words/new`: root-word authoring and import
- `/admin/classes` and `/admin/classes/[classId]`
- `/admin/exams` and `/admin/exams/[examId]`: draft, publish, close, and question-bank workflows
- `/admin/library` and `/admin/library/[rootId]`
- `/admin/roots` and `/admin/roots/[rootId]`
- `/admin/calendar`
- `/admin/progress`
- `/admin/ranking`
- `/admin/notifications`
- `/admin/profile`

### Public pages

- `/login`
- `/register`
- `/privacy-policy`
- `/terms-of-service`
- `/help-center`

### Role home routes

- Student users are redirected to `/today`
- Teacher users are redirected to `/teacher/classes`
- Admin users are redirected to `/admin/root-words`

## Feature highlights

- Root-word learning content with bilingual meanings, word families, pronunciations, and example sentences
- Student today dashboard backed by study plans, review data, ranking data, and daily root recommendations
- Spaced review and study-planning flows
- Root-word quiz authoring, import, preview, and submission flows
- Exam system with draft, published, and closed states, class/global scope, timed attempts, and ranking summaries
- Notifications inbox with unread counters and realtime updates
- Class management for teachers and admins
- Avatar storage via Supabase Storage
- Full-name profile support and profile search enhancements in the latest migrations

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI primitives
- Supabase Auth, Postgres, Realtime, and Storage
- TanStack Query
- React Hook Form + Zod
- Recharts
- Vitest + Testing Library
- Playwright

## Repository layout

```text
rootlearn-app/
  docs/                    Additional project docs
  public/templates/        CSV and JSON import templates
  scripts/                 Seed and Supabase health scripts
  src/
    app/                   App Router pages, layouts, and API routes
    components/            Shared UI and layout primitives
    features/              Feature modules by domain
    lib/                   Auth, navigation, validation, and Supabase helpers
    server/                Repository and service layer
    types/                 Shared domain types
  supabase/
    config.toml            Local Supabase CLI config
    migrations/            Database schema history
  tests/
    e2e/                   Playwright coverage
    integration/           Integration tests
    unit/                  Unit tests
```

## Environment variables

Copy `.env.example` and fill in the values required by your target Supabase project:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_AVATAR_BUCKET=avatars
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
- `SUPABASE_AVATAR_BUCKET` defaults to `avatars` in code, but setting it explicitly avoids config drift.
- `NEXT_PUBLIC_APP_URL` should match the current environment, for example `http://localhost:3000` locally or your production domain on Vercel.

## Local development

All commands below run from the repository root:

```bash
cd rootlearn-app
```

### 1. Install dependencies

```bash
npm install
```

### 2. Create your local env file

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux:

```bash
cp .env.example .env.local
```

Fill `.env.local` with values from either a hosted Supabase project or a local Supabase CLI stack.

### 3. Choose a Supabase workflow

#### Option A: use a hosted Supabase project

1. Create or choose a Supabase project.
2. Apply every SQL file in `supabase/migrations` in timestamp order, or push them with your normal Supabase CLI workflow.
3. Set the project URL, anon key, and service role key in `.env.local`.

#### Option B: use the local Supabase CLI stack

The repo already contains `supabase/config.toml` with these local defaults:

- API: `http://127.0.0.1:54321`
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio: `http://127.0.0.1:54323`
- Inbucket: `http://127.0.0.1:54324`

Start the stack:

```bash
npx supabase start
```

Inspect the generated local credentials:

```bash
npx supabase status
```

Then copy the reported API URL, anon key, and service role key into `.env.local`.

Important caveat for this repo:

- `supabase/config.toml` enables CLI seed execution via `./seed.sql`.
- This repository does not currently track `supabase/seed.sql`.
- If you use `supabase db reset`, create an empty `supabase/seed.sql` first or update the seed config before running the reset.
- Sample application data for this app is provided by `npm run seed`, not by a checked-in `seed.sql` file.

### 4. Run the app

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Seed data

The repository ships a TypeScript seed script at `scripts/seed.ts`. It creates:

- 1 admin user
- 1 teacher user
- 3 student users
- 1 sample class
- 5 root-word groups
- study plans, reviews, class suggestions, study sessions, and quiz attempts

Seeded credentials:

- `admin.rootly` / `Rootly123`
- `teacher.son` / `Rootly123`
- `student.minh` / `Rootly123`
- `student.lan` / `Rootly123`
- `student.quang` / `Rootly123`

Run the seed script:

```bash
npm run seed
```

Important caveat:

- `scripts/seed.ts` reads `process.env` directly.
- Unlike `scripts/check-supabase-health.ts`, it does not load `.env.local` for you.
- Before running `npm run seed`, make sure the same Supabase variables are already available in your shell environment.

## Import templates

### Root words

- Detailed import accepts `.csv`, `.xlsx`, and `.json`
- Roots-only import accepts `.csv`
- Templates:
  - `public/templates/root-words.csv`
  - `public/templates/root-words.json`
  - `public/templates/roots-import-template.csv`
  - `public/templates/root-words-full.csv` (roots-only dataset with 60 common roots, prefixes, and suffixes)

### Root-word quizzes

- CSV only
- Template files live in `public/templates/quiz-import/`, including `quiz-import-template.csv`

### Exam question bank

- CSV only
- Templates:
  - `public/templates/exam-question-bank-import/exam-question-bank-import-template.csv`
  - `public/templates/exam-question-bank-import/exam-question-bank-import-sample.csv`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run check:supabase
npm run test
npm run test:watch
npm run test:e2e
npm run seed
```

Script notes:

- `npm run check:supabase`: compares auth users against `public.profiles` and exits non-zero when profiles are missing
- `npm run seed`: inserts sample application data through the Supabase service role
- `npm run test`: runs the Vitest suite
- `npm run test:e2e`: runs Playwright against the app

## Testing coverage

The checked-in test suite currently covers:

- auth validation and username utilities
- root-word validation and import services
- quiz submission and quiz import flows
- class repositories and services
- calendar and study-plan behaviors
- notifications inbox and realtime bridge behavior
- exam draft, submission, import, ranking, and utility logic
- today dashboard and library/root detail views
- public auth smoke coverage in Playwright

## Supabase schema history

The migration directory currently includes schema work for:

- initial root-word learning schema
- profile backfill from `auth.users`
- root-word quiz sets
- ranking insights RPCs
- root-word detail view tracking
- streak fixes
- avatar storage hardening
- notifications inbox and realtime support
- exam system and timed-attempt enforcement
- class-member notifications
- single-plan enforcement per root word
- profile full-name and name-search support
- daily root recommendations and recommendation notifications

Review `supabase/migrations/` directly if you need exact schema details.

## Deployment and supporting docs

- Vercel deployment guide: [`docs/vercel-deploy.md`](docs/vercel-deploy.md)
- Git branch and commit conventions: [`docs/git-conventions.md`](docs/git-conventions.md)

If you import the parent workspace into Vercel instead of this app directory, set the Vercel root directory to `rootlearn-app`.

## Implementation notes

- Authentication is username-first in the UI, while Supabase Auth compatibility is handled in the server layer.
- Protected pages rely on SSR-aware Supabase helpers under `src/lib/supabase/`.
- Notifications, exams, rankings, class flows, and study dashboards all depend on the migrations in `supabase/migrations`.
