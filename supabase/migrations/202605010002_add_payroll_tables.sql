-- Add payroll tables: employees and payslips
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  branch_id uuid references public.branches(id) on delete set null,
  employee_no text not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  department text,
  job_title text,
  hire_date date,
  base_salary numeric(18,2) not null default 0,
  pay_frequency text not null default 'monthly',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, employee_no)
);

create index if not exists idx_employees_company_id on public.employees (company_id);

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  branch_id uuid references public.branches(id) on delete set null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  pay_period_start date not null,
  pay_period_end date not null,
  pay_date date not null,
  gross_pay numeric(18,2) not null default 0,
  deductions numeric(18,2) not null default 0,
  tax_withheld numeric(18,2) not null default 0,
  net_pay numeric(18,2) not null default 0,
  status text not null default 'draft',
  notes text,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  check (gross_pay >= 0 and deductions >= 0 and tax_withheld >= 0 and net_pay >= 0),
  check (status in ('draft', 'posted', 'paid'))
);

create index if not exists idx_payslips_company_id on public.payslips (company_id);
create index if not exists idx_payslips_employee_id on public.payslips (employee_id);

alter table public.employees enable row level security;
alter table public.payslips enable row level security;
