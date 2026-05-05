-- AP module scaffold: suppliers, bills, bill lines, and payment vouchers.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  email text,
  phone text,
  withholding_tax_rate numeric(6,4) not null default 0,
  payment_terms_days integer not null default 30,
  is_active boolean not null default true,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table if not exists public.vendor_bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  bill_no text not null,
  bill_date date not null,
  due_date date,
  status text not null check (status in ('draft', 'posted', 'void')) default 'draft',
  subtotal numeric(18,2) not null default 0,
  withholding_tax_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, bill_no)
);

create table if not exists public.vendor_bill_lines (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.vendor_bills(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  description text not null,
  qty numeric(18,2) not null check (qty > 0),
  unit_cost numeric(18,2) not null check (unit_cost >= 0),
  line_amount numeric(18,2) not null check (line_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_vouchers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  bill_id uuid references public.vendor_bills(id) on delete set null,
  voucher_no text not null,
  payment_date date not null,
  amount numeric(18,2) not null check (amount > 0),
  status text not null check (status in ('draft', 'posted', 'void')) default 'draft',
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (company_id, voucher_no)
);

alter table public.suppliers enable row level security;
alter table public.vendor_bills enable row level security;
alter table public.vendor_bill_lines enable row level security;
alter table public.payment_vouchers enable row level security;
