-- Link app-level users to Supabase Auth users and auto-provision records.

-- Backfill missing app_users rows for existing auth users.
insert into public.app_users (id, role)
select au.id, 'staff'::public.user_role
from auth.users au
left join public.app_users appu on appu.id = au.id
where appu.id is null;

-- Remove orphan app_users rows that do not exist in auth.users.
delete from public.app_users appu
where not exists (
  select 1
  from auth.users au
  where au.id = appu.id
);

-- Add foreign key constraint if it doesn't exist yet.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_id_auth_users_fkey'
      and conrelid = 'public.app_users'::regclass
  ) then
    alter table public.app_users
      add constraint app_users_id_auth_users_fkey
      foreign key (id)
      references auth.users(id)
      on delete cascade;
  end if;
end
$$;

-- Auto-create app_users row whenever a new auth user is created.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (id, role)
  values (new.id, 'staff'::public.user_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
