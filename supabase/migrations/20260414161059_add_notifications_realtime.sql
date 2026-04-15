create schema if not exists private;

revoke all on schema private from public;

drop policy if exists "notifications_realtime_owner_select" on realtime.messages;
create policy "notifications_realtime_owner_select" on realtime.messages
for select to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (select auth.uid()) is not null
  and (select realtime.topic()) = format('user:%s:notifications', ((select auth.uid()))::text)
);

create or replace function private.broadcast_notification_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  if notification_user_id is null then
    return null;
  end if;

  perform realtime.broadcast_changes(
    format('user:%s:notifications', notification_user_id::text),
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    new,
    old
  );

  return null;
end;
$$;

revoke all on function private.broadcast_notification_changes() from public;

drop trigger if exists trg_notifications_realtime_broadcast on public.notifications;
create trigger trg_notifications_realtime_broadcast
after insert or update or delete on public.notifications
for each row execute function private.broadcast_notification_changes();
