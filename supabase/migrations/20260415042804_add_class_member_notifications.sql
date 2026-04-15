alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('class_suggestion', 'class_member_added'));

create or replace function private.create_class_member_added_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
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
    new.user_id,
    'class_member_added',
    format('Bạn vừa được thêm vào lớp %s', c.name),
    format('Giáo viên đã thêm bạn vào lớp "%s".', c.name),
    '/notifications',
    jsonb_build_object(
      'classId', c.id,
      'className', c.name
    ),
    format('class_member_added:%s', new.id)
  from public.classes c
  where c.id = new.class_id
  on conflict (source_key) do nothing;

  return new;
end;
$$;

revoke all on function private.create_class_member_added_notifications() from public;

drop trigger if exists trg_class_members_notifications on public.class_members;
create trigger trg_class_members_notifications
after insert on public.class_members
for each row
when (new.role_in_class = 'student')
execute function private.create_class_member_added_notifications();
