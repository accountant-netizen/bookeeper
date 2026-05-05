-- Add account type support for chart of accounts creation.

alter table public.accounts
  add column if not exists account_type text not null default 'general';

update public.accounts
set account_type = 'general'
where account_type is null;