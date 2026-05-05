# Setup

## Prerequisites
- Node.js 20+
- Supabase project with the migrations in `supabase/migrations/` applied

## Environment Files
- Copy `apps/web/.env.local.example` to `apps/web/.env.local`
- Copy `apps/mobile/.env.local.example` to `apps/mobile/.env.local`

## Required Variables

### Web
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

### Mobile
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Install and Run
1. Install dependencies with `npm install` from the repository root.
2. Run the web app with `npm run dev:web`.
3. Run the mobile app with `npm run dev:mobile`.

## Deploy Web
- Deploy `apps/web` on Vercel.
- Set the web environment variables in Vercel before the first production build.
- Keep Supabase migrations applied in every environment before testing the app.