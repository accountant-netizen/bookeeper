# Accountant Platform

A comprehensive web + mobile accounting system for bookkeeping, tax compliance, and financial management. Built with Next.js, Expo, TypeScript, and Supabase.

## Stack
- **Web**: Next.js 15 on Vercel
- **Mobile**: React Native + Expo (iOS/Android)
- **Backend/Data**: Supabase Postgres, Auth, Storage
- **Language**: TypeScript end-to-end
- **Validation**: Accounting invariants enforced at DB level

## Workspace
- `apps/web` - Next.js web app with API routes
- `apps/mobile` - Expo React Native app
- `packages/shared-types` - Shared DTOs and types
- `packages/accounting-core` - Posting engine, validation rules
- `supabase/migrations` - SQL schemas, RLS policies, constraints
- `docs/` - Architecture and implementation guides

## Quick Start
1. Install Node.js 20+
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment files (per app):
   ```bash
  cp apps/web/.env.local.example apps/web/.env.local
  cp apps/mobile/.env.local.example apps/mobile/.env.local
   ```
  Fill in values:
  - `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
  - `apps/mobile/.env.local`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

4. Apply database migrations in Supabase:
   - Go to Supabase Dashboard > SQL Editor
   - Run `supabase/migrations/202604220001_init_core.sql`
   - Run `supabase/migrations/202604220002_add_rls_policies.sql`
  - Run `supabase/migrations/202604220003_link_app_users_to_auth.sql`
  - Run `supabase/migrations/202604220004_add_ar_module.sql`
  - Run `supabase/migrations/202604220005_add_ar_rls_policies.sql`
  - Run `supabase/migrations/202604220006_add_ap_module.sql`
  - Run `supabase/migrations/202604220007_add_ap_rls_policies.sql`

5. Create test data:
  - In Supabase, create a test company and user membership
  - `app_users` is auto-provisioned from `auth.users` by migration `202604220003`
   - Get a JWT token from Supabase Auth

6. Run web app:
   ```bash
   npm run dev:web
   ```
   App runs at `http://localhost:3000`

8. Test real web login flow:
  - Open `http://localhost:3000`
  - Sign in with a Supabase Auth user email/password
  - Click `Call GET /api/dashboard` to verify authenticated API access
  - Fill Company ID + account IDs, then click `Call POST /api/posting`
  - AR scaffold:
    - Create a customer via `Call POST /api/ar/customers`
    - Create an invoice via `Call POST /api/ar/invoices` (auto-posts DR AR / CR Sales to GL)
  - AP scaffold:
    - Create a supplier via `Create Supplier`
    - Create a bill via `Create Bill + Auto Post` (auto-posts DR Expense / CR AP to GL)

7. Run mobile app:
   ```bash
   npm run dev:mobile
   ```

## API Endpoints

### Journal Posting
```
POST /api/posting
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

Request:
{
  "companyId": "uuid",
  "branchId": "uuid (optional)",
  "referenceNo": "JV-001",
  "entryDate": "2026-04-22",
  "lines": [
    {
      "accountId": "uuid",
      "description": "Sales revenue",
      "debit": "0.00",
      "credit": "1000.00"
    },
    {
      "accountId": "uuid",
      "description": "Cash received",
      "debit": "1000.00",
      "credit": "0.00"
    }
  ]
}

Response:
{
  "success": true,
  "entryId": "uuid"
}
```

### Dashboard Metrics
```
GET /api/dashboard
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "companyId": "uuid",
  "totalSalesToday": "5000.00",
  "totalSalesMonth": "45000.00",
  "totalSalesYear": "450000.00",
  "totalExpensesToday": "1200.00",
  "netProfitMonth": "40000.00",
  "cashBalance": "85000.00",
  "currencyCode": "PHP"
}
```

### AR Aging Report
```
GET /api/reports/ar-aging?companyId={COMPANY_UUID}&branchId={BRANCH_UUID(optional)}
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "companyId": "uuid",
  "branchId": "uuid|null",
  "generatedAt": "ISO timestamp",
  "bucketTotals": {
    "bucket_0_30": "1000.00",
    "bucket_31_60": "500.00",
    "bucket_61_90": "0.00",
    "bucket_90_plus": "200.00",
    "total_open": "1700.00"
  },
  "items": [
    {
      "invoiceId": "uuid",
      "invoiceNo": "SI-0001",
      "customerId": "uuid",
      "invoiceDate": "2026-04-01",
      "dueDate": "2026-04-30",
      "amount": "700.00",
      "originalAmount": "1000.00",
      "settledAmount": "300.00",
      "daysOverdue": 12,
      "bucket": "0-30"
    }
  ]
}
```

### AP Aging Report
```
GET /api/reports/ap-aging?companyId={COMPANY_UUID}&branchId={BRANCH_UUID(optional)}
Authorization: Bearer {JWT_TOKEN}

Response:
{
  "companyId": "uuid",
  "branchId": "uuid|null",
  "generatedAt": "ISO timestamp",
  "bucketTotals": {
    "current": "2500.00",
    "bucket_1_30": "800.00",
    "bucket_31_60": "100.00",
    "bucket_61_90": "0.00",
    "bucket_90_plus": "0.00",
    "total_open": "3400.00"
  },
  "items": [
    {
      "billId": "uuid",
      "billNo": "BILL-0001",
      "supplierId": "uuid",
      "billDate": "2026-04-01",
      "dueDate": "2026-04-30",
      "amount": "500.00",
      "originalAmount": "800.00",
      "settledAmount": "300.00",
      "daysOverdue": 5,
      "bucket": "1-30"
    }
  ]
}
```

Notes:
- `amount` is the open balance after settlement (used for bucket totals).
- AR settlement source: posted `receipt_allocations` linked to posted `receipts`.
- AP settlement source: posted `payment_vouchers` linked by `bill_id`.

## Architecture

### Multi-Tenancy
- Shared database with strict Row Level Security
- Every table has `company_id` as tenant key
- RLS policies enforce access control at DB level
- Branch-level optional scoping for multi-location operations

### Posting Engine
- All journal entries validated for debit = credit balance before posting
- Posted entries are immutable (corrections via reversal only)
- Double-entry accounting enforced at trigger level
- Automatic audit trail on all postings

### Security
- JWT-based authentication via Supabase Auth
- Service-role key used only in trusted backend paths
- User roles: admin, accountant, auditor, staff
- Audit logs capture all financial operations

## Development

### Typecheck
```bash
npm run typecheck
```

### Build web
```bash
npm run build:web
```

## Documentation
- [Architecture Decisions](docs/architecture.md)
- [Implementation Status](docs/implementation-status.md)
