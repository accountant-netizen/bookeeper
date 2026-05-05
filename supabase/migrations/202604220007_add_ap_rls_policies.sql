-- AP row-level security policies.

create policy "suppliers_read_company" on public.suppliers
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = suppliers.company_id
        and m.user_id = auth.uid()
    )
  );

create policy "suppliers_insert_company" on public.suppliers
  for insert with check (
    exists (
      select 1
      from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = suppliers.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'staff')
    )
  );

create policy "vendor_bills_read_company" on public.vendor_bills
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = vendor_bills.company_id
        and m.user_id = auth.uid()
        and (m.branch_id is null or m.branch_id = vendor_bills.branch_id)
    )
  );

create policy "vendor_bills_insert_company" on public.vendor_bills
  for insert with check (
    exists (
      select 1
      from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = vendor_bills.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'staff')
    )
  );

create policy "vendor_bills_update_company" on public.vendor_bills
  for update using (
    exists (
      select 1
      from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = vendor_bills.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant')
    )
  );

create policy "vendor_bill_lines_read_via_bill" on public.vendor_bill_lines
  for select using (
    exists (
      select 1
      from public.vendor_bills vb
      inner join public.memberships m on m.company_id = vb.company_id
      where vb.id = vendor_bill_lines.bill_id
        and m.user_id = auth.uid()
    )
  );

create policy "vendor_bill_lines_insert_via_bill" on public.vendor_bill_lines
  for insert with check (
    exists (
      select 1
      from public.vendor_bills vb
      inner join public.memberships m on m.company_id = vb.company_id
      inner join public.app_users u on u.id = m.user_id
      where vb.id = vendor_bill_lines.bill_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'staff')
    )
  );

create policy "payment_vouchers_read_company" on public.payment_vouchers
  for select using (
    exists (
      select 1
      from public.memberships m
      where m.company_id = payment_vouchers.company_id
        and m.user_id = auth.uid()
        and (m.branch_id is null or m.branch_id = payment_vouchers.branch_id)
    )
  );

create policy "payment_vouchers_insert_company" on public.payment_vouchers
  for insert with check (
    exists (
      select 1
      from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = payment_vouchers.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'staff')
    )
  );
