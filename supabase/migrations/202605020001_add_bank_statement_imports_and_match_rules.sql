-- Add bank statement import tables and matching rules
-- Run this migration in Supabase/Postgres to enable statement imports

create table if not exists bank_statement_imports (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  name text,
  format text,
  raw_content text,
  imported_at timestamptz default now(),
  created_by uuid
);

create table if not exists bank_statement_lines (
  id uuid default gen_random_uuid() primary key,
  import_id uuid references bank_statement_imports(id) on delete cascade,
  txn_date date,
  description text,
  amount numeric,
  currency text,
  matched_transaction_id uuid,
  created_at timestamptz default now()
);

create table if not exists bank_statement_match_rules (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  name text not null,
  pattern jsonb not null,
  priority int default 100,
  created_by uuid,
  created_at timestamptz default now()
);

create index on bank_statement_lines (import_id);
create index on bank_statement_imports (company_id);
create index on bank_statement_match_rules (company_id);
