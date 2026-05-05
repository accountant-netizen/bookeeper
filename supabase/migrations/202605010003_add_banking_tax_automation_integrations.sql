-- Banking, tax export, automation, and integration scaffolding.

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  ledger_account_id uuid references public.accounts(id) on delete set null,
  code text not null,
  name text not null,
  bank_name text,
  account_number text,
  currency_code text not null default 'PHP',
  opening_balance numeric(18,2) not null default 0,
  current_balance numeric(18,2) not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.bank_reconciliations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  statement_start_date date not null,
  statement_end_date date not null,
  statement_balance numeric(18,2) not null default 0,
  book_balance numeric(18,2) not null default 0,
  difference numeric(18,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'reconciled')),
  notes text,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  check_no text not null,
  payee text not null,
  amount numeric(18,2) not null check (amount > 0),
  issue_date date not null,
  cleared_at timestamptz,
  status text not null default 'issued' check (status in ('issued', 'cleared', 'void')),
  notes text,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, check_no)
);

create table if not exists public.tax_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  export_type text not null,
  period_start date not null,
  period_end date not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  template_type text not null,
  template_payload jsonb not null default '{}'::jsonb,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  next_run_date date not null,
  last_run_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  reminder_date date not null,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'sent', 'dismissed')),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.job_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  job_type text not null,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  run_after timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, idempotency_key)
);

create table if not exists public.connector_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  name text not null,
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, provider, name)
);

create index if not exists idx_bank_accounts_company_id on public.bank_accounts (company_id);
create index if not exists idx_bank_reconciliations_company_id on public.bank_reconciliations (company_id);
create index if not exists idx_checks_company_id on public.checks (company_id);
create index if not exists idx_tax_exports_company_id on public.tax_exports (company_id);
create index if not exists idx_recurring_transactions_company_id on public.recurring_transactions (company_id);
create index if not exists idx_reminders_company_id on public.reminders (company_id);
create index if not exists idx_job_queue_company_id on public.job_queue (company_id);
create index if not exists idx_connector_configs_company_id on public.connector_configs (company_id);

alter table public.bank_accounts enable row level security;
alter table public.bank_reconciliations enable row level security;
alter table public.checks enable row level security;
alter table public.tax_exports enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.reminders enable row level security;
alter table public.job_queue enable row level security;
alter table public.connector_configs enable row level security;
