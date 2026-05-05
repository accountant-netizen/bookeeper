-- AR row-level security policies.

create policy "customers_read_company" on public.customers
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = customers.company_id
        and m.user_id = auth.uid()
    )
  );

create policy "customers_insert_company" on public.customers
  for insert with check (
    exists (
      select 1
      from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = customers.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'staff')
    )
  );

create policy "sales_invoices_read_company" on public.sales_invoices
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = sales_invoices.company_id
        and m.user_id = auth.uid()
        and (m.branch_id is null or m.branch_id = sales_invoices.branch_id)
    )
  );

create policy "sales_invoices_insert_company" on public.sales_invoices
  for insert with check (
    exists (
      select 1
      from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = sales_invoices.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'staff')
    )
  );

create policy "sales_invoices_update_company" on public.sales_invoices
  for update using (
    exists (
      select 1
      from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = sales_invoices.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant')
    )
  );

create policy "sales_invoice_lines_read_via_invoice" on public.sales_invoice_lines
  for select using (
    exists (
      select 1
      from public.sales_invoices si
      inner join public.memberships m on m.company_id = si.company_id
      where si.id = sales_invoice_lines.invoice_id
        and m.user_id = auth.uid()
    )
  );

create policy "sales_invoice_lines_insert_via_invoice" on public.sales_invoice_lines
  for insert with check (
    exists (
      select 1
      from public.sales_invoices si
      inner join public.memberships m on m.company_id = si.company_id
      inner join public.app_users u on u.id = m.user_id
      where si.id = sales_invoice_lines.invoice_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'staff')
    )
  );
