create table if not exists public.daily_root_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommendation_date date not null,
  root_word_id uuid not null references public.root_words(id) on delete cascade,
  selected_by uuid references public.profiles(auth_user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_root_recommendations_recommendation_date_key unique (recommendation_date)
);

drop trigger if exists trg_daily_root_recommendations_updated_at on public.daily_root_recommendations;
create trigger trg_daily_root_recommendations_updated_at
before update on public.daily_root_recommendations
for each row execute procedure public.touch_updated_at();

alter table public.daily_root_recommendations enable row level security;

drop policy if exists "daily_root_recommendations_read" on public.daily_root_recommendations;
create policy "daily_root_recommendations_read"
on public.daily_root_recommendations
for select
to authenticated
using (
  exists (
    select 1
    from public.root_words r
    where r.id = root_word_id
      and (r.is_published or public.is_admin())
  )
);

drop policy if exists "daily_root_recommendations_admin_manage" on public.daily_root_recommendations;
create policy "daily_root_recommendations_admin_manage"
on public.daily_root_recommendations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
