-- Backfill and harden cloud-sync ownership columns for clothing_items.
-- Safe to run multiple times.

alter table if exists public.clothing_items
    add column if not exists owner_supabase_user_id text;

alter table if exists public.clothing_items
    add column if not exists owner_email text;

create index if not exists clothing_items_owner_supabase_user_id_idx
    on public.clothing_items (owner_supabase_user_id);

update public.clothing_items as ci
set
    owner_supabase_user_id = coalesce(ci.owner_supabase_user_id, u.supabase_user_id),
    owner_email = coalesce(ci.owner_email, u.email)
from public.users as u
where u.id = ci.user_id
  and (
      ci.owner_supabase_user_id is null
      or ci.owner_email is null
  );

select
    ci.id,
    ci.user_id,
    ci.owner_supabase_user_id,
    ci.owner_email,
    ci.name,
    ci.updated_at
from public.clothing_items as ci
order by ci.updated_at desc
limit 20;
