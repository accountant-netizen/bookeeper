-- Remaining operational scaffolding: bank statement imports, payroll tax filings, document attachments, and connector sync logs.

create table if not exists public.bank_statement_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  statement_name text not null,
  statement_start_date date not null,
  statement_end_date date not null,
  opening_balance numeric(18,2) not null default 0,
  closing_balance numeric(18,2) not null default 0,
  source_format text not null default 'json',
  source_payload jsonb not null default '{}'::jsonb,
  status text not null default 'imported' check (status in ('imported', 'parsed', 'matched', 'reconciled', 'failed')),
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.bank_statement_imports(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  transaction_date date not null,
  description text not null,
  reference_no text,
  amount numeric(18,2) not null,
  direction text not null check (direction in ('debit', 'credit')),
  matched_journal_line_id uuid references public.journal_lines(id) on delete set null,
  match_status text not null default 'unmatched' check (match_status in ('unmatched', 'suggested', 'matched', 'reconciled')),
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_tax_filings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  filing_type text not null,
  period_start date not null,
  period_end date not null,
  employee_count integer not null default 0,
  gross_pay numeric(18,2) not null default 0,
  tax_withheld numeric(18,2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'filed', 'amended')),
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  related_entity_type text,
  related_entity_id text,
  filename text not null,
  mime_type text,
  storage_path text,
  extracted_text text,
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'processing', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.document_ocr_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  engine text not null default 'manual',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  run_after timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.connector_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  connector_config_id uuid not null references public.connector_configs(id) on delete cascade,
  job_name text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  run_after timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_bank_statement_imports_company_id on public.bank_statement_imports (company_id);
create index if not exists idx_bank_statement_lines_company_id on public.bank_statement_lines (company_id);
create index if not exists idx_payroll_tax_filings_company_id on public.payroll_tax_filings (company_id);
create index if not exists idx_documents_company_id on public.documents (company_id);
create index if not exists idx_document_ocr_jobs_company_id on public.document_ocr_jobs (company_id);
create index if not exists idx_connector_sync_jobs_company_id on public.connector_sync_jobs (company_id);

alter table public.bank_statement_imports enable row level security;
alter table public.bank_statement_lines enable row level security;
alter table public.payroll_tax_filings enable row level security;
alter table public.documents enable row level security;
alter table public.document_ocr_jobs enable row level security;
alter table public.connector_sync_jobs enable row level security;
