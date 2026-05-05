-- Add inventory tables: products and stock_movements
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  code text not null,
  name text not null,
  description text,
  unit text,
  cost numeric(18,2) default 0,
  price numeric(18,2) default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_company_id on public.products (company_id);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null, -- 'in' or 'out'
  quantity numeric(18,4) not null default 0,
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_company_id on public.stock_movements (company_id);

alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
