# Architecture Blueprint (Framework Phase)

## Runtime and Language
- TypeScript end-to-end
- Monorepo structure for shared domain models

## Hosting
- Web app: Next.js on Vercel
- Data/Auth/Storage: Supabase
- Mobile app: Expo React Native (EAS builds)

## Data and Security
- PostgreSQL (Supabase) as system of record
- Shared database, strict multi-tenant strategy via company and branch keys
- Row Level Security enabled on tenant tables
- Accounting invariant enforced at DB level for posted entries

## Async Workloads
- Use a durable job platform (Trigger.dev or Inngest)
- Job categories: report exports, reminders, OCR ingestion, reconciliations
- All side-effect jobs should include idempotency keys

## Observability and DR
- Error tracking: Sentry
- Logs + metrics: OpenTelemetry-compatible sink
- Recovery: point-in-time restore policy plus scheduled restore drills
