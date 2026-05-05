-- Row Level Security policies for tenant isolation and role-based access

-- Memberships: users can read their own memberships only
create policy "memberships_read_own" on public.memberships
  for select using (auth.uid() = user_id);

-- Companies: users can read companies they are a member of
create policy "companies_read_membership" on public.companies
  for select using (
    exists (
      select 1 from public.memberships m
      where m.company_id = companies.id
        and m.user_id = auth.uid()
    )
  );

-- Branches: users can read branches in their companies
create policy "branches_read_company" on public.branches
  for select using (
    exists (
      select 1 from public.memberships m
      where m.company_id = branches.company_id
        and m.user_id = auth.uid()
    )
  );

-- Accounts: users can read accounts in their company (and optionally branch)
create policy "accounts_read_company" on public.accounts
  for select using (
    exists (
      select 1 from public.memberships m
      where m.company_id = accounts.company_id
        and m.user_id = auth.uid()
    )
  );

-- Journal entries: users can read entries in their company and optionally branch
create policy "journal_entries_read_company" on public.journal_entries
  for select using (
    exists (
      select 1 from public.memberships m
      where m.company_id = journal_entries.company_id
        and m.user_id = auth.uid()
        and (m.branch_id is null or m.branch_id = journal_entries.branch_id)
    )
  );

-- Journal entries: users can insert drafts in their company (staff+ role)
create policy "journal_entries_insert_draft" on public.journal_entries
  for insert
  with check (
    status = 'draft'
    and exists (
      select 1 from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = journal_entries.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'staff')
    )
  );

-- Journal lines: users can read lines for entries they can read
create policy "journal_lines_read_via_entry" on public.journal_lines
  for select using (
    exists (
      select 1 from public.journal_entries je
      inner join public.memberships m on je.company_id = m.company_id
      where je.id = journal_lines.journal_entry_id
        and m.user_id = auth.uid()
        and (m.branch_id is null or m.branch_id = je.branch_id)
    )
  );

-- Journal lines: users can insert lines for draft entries they own
create policy "journal_lines_insert_own_draft" on public.journal_lines
  for insert
  with check (
    exists (
      select 1 from public.journal_entries je
      inner join public.memberships m on je.company_id = m.company_id
      where je.id = journal_lines.journal_entry_id
        and je.status = 'draft'
        and m.user_id = auth.uid()
        and je.created_by = auth.uid()
    )
  );

-- Audit logs: accountants and auditors can read audit logs for their company
create policy "audit_logs_read_company" on public.audit_logs
  for select using (
    company_id is null
    or exists (
      select 1 from public.memberships m
      inner join public.app_users u on u.id = m.user_id
      where m.company_id = audit_logs.company_id
        and m.user_id = auth.uid()
        and u.role in ('admin', 'accountant', 'auditor')
    )
  );
