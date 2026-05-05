-- Core extensions
create extension if not exists pgcrypto;

-- Base enums
create type public.user_role as enum ('admin', 'accountant', 'auditor', 'staff');

-- Multi-tenant foundation
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id uuid primary key,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, company_id, branch_id)
);

-- Ledger foundation
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null default 'general',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, code)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  reference_no text,
  entry_date date not null,
  status text not null check (status in ('draft', 'posted', 'reversed')),
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  description text,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  check (debit >= 0 and credit >= 0),
  check ((debit = 0 and credit > 0) or (credit = 0 and debit > 0))
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_user_id uuid references public.app_users(id),
  action text not null,
  entity_name text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Posting invariant: no posted entry can remain unbalanced.
create or replace function public.enforce_posted_balance()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'posted' and new.total_debit <> new.total_credit then
    raise exception 'Posted journal entries must be balanced (debit = credit)';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_posted_balance
before insert or update on public.journal_entries
for each row execute function public.enforce_posted_balance();

-- Recompute totals from lines and keep entry totals authoritative.
create or replace function public.sync_journal_totals()
returns trigger
language plpgsql
as $$
declare
  v_entry_id uuid;
begin
  v_entry_id := coalesce(new.journal_entry_id, old.journal_entry_id);

  update public.journal_entries je
  set total_debit = coalesce((
      select sum(jl.debit) from public.journal_lines jl where jl.journal_entry_id = v_entry_id
    ), 0),
      total_credit = coalesce((
      select sum(jl.credit) from public.journal_lines jl where jl.journal_entry_id = v_entry_id
    ), 0)
  where je.id = v_entry_id;

  return null;
end;
$$;

create trigger trg_sync_journal_totals
after insert or update or delete on public.journal_lines
for each row execute function public.sync_journal_totals();

-- RLS enablement (policies to be added once auth claim mapping is finalized).
alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.app_users enable row level security;
alter table public.memberships enable row level security;
alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.audit_logs enable row level security;
