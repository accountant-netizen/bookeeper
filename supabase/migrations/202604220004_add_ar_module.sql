-- AR module scaffold: customers, invoices, invoice lines, receipts.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  email text,
  phone text,
  credit_terms_days integer not null default 30,
  is_active boolean not null default true,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_no text not null,
  invoice_date date not null,
  due_date date,
  status text not null check (status in ('draft', 'posted', 'void')) default 'draft',
  subtotal numeric(18,2) not null default 0,
  tax_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, invoice_no)
);

create table if not exists public.sales_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  description text not null,
  qty numeric(18,2) not null check (qty > 0),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  line_amount numeric(18,2) not null check (line_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  receipt_no text not null,
  receipt_date date not null,
  total_amount numeric(18,2) not null check (total_amount >= 0),
  status text not null check (status in ('draft', 'posted', 'void')) default 'draft',
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, receipt_no)
);

create table if not exists public.receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  invoice_id uuid not null references public.sales_invoices(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_lines enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_allocations enable row level security;
