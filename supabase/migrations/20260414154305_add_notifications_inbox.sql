create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(auth_user_id) on delete cascade,
  type text not null check (type in ('class_suggestion')),
  title text not null,
  message text not null,
  link_href text check (link_href is null or left(link_href, 1) = '/'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  is_read boolean not null default false,
  read_at timestamptz,
  source_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_unread_created on public.notifications(user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications
for each row execute procedure public.touch_updated_at();

drop policy if exists "notifications_owner_select" on public.notifications;
create policy "notifications_owner_select" on public.notifications
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update" on public.notifications
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.create_class_suggestion_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    link_href,
    metadata,
    source_key
  )
  select
    cm.user_id,
    'class_suggestion',
    format('Lớp %s vừa có gợi ý mới', c.name),
    format('Từ gốc "%s" được gợi ý cho ngày %s.', rw.root, to_char(new.suggested_date, 'DD/MM/YYYY')),
    '/today',
    jsonb_build_object(
      'classId', c.id,
      'className', c.name,
      'rootWordId', rw.id,
      'rootWord', rw.root,
      'suggestedDate', new.suggested_date,
      'suggestionId', new.id
    ),
    format('class_suggestion:%s:%s', new.id, cm.user_id)
  from public.classes c
  join public.root_words rw on rw.id = new.root_word_id
  join public.class_members cm on cm.class_id = c.id
  where c.id = new.class_id
    and cm.role_in_class = 'student'
  on conflict (source_key) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_class_root_suggestions_notifications on public.class_root_suggestions;
create trigger trg_class_root_suggestions_notifications
after insert on public.class_root_suggestions
for each row execute procedure public.create_class_suggestion_notifications();

insert into public.notifications (
  user_id,
  type,
  title,
  message,
  link_href,
  metadata,
  source_key
)
select
  cm.user_id,
  'class_suggestion',
  format('Lớp %s vừa có gợi ý mới', c.name),
  format('Từ gốc "%s" được gợi ý cho ngày %s.', rw.root, to_char(crs.suggested_date, 'DD/MM/YYYY')),
  '/today',
  jsonb_build_object(
    'classId', c.id,
    'className', c.name,
    'rootWordId', rw.id,
    'rootWord', rw.root,
    'suggestedDate', crs.suggested_date,
    'suggestionId', crs.id
  ),
  format('class_suggestion:%s:%s', crs.id, cm.user_id)
from public.class_root_suggestions crs
join public.classes c on c.id = crs.class_id
join public.root_words rw on rw.id = crs.root_word_id
join public.class_members cm on cm.class_id = c.id
where cm.role_in_class = 'student'
on conflict (source_key) do nothing;
