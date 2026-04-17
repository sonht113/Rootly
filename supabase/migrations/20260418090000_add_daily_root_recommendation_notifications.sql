alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('class_suggestion', 'class_member_added', 'daily_root_recommendation'));

create or replace function private.sync_daily_root_recommendation_notifications(
  target_recommendation_id uuid,
  target_recommendation_date date,
  target_root_word_id uuid,
  target_selected_by uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_recommendation_date <> timezone('Asia/Ho_Chi_Minh', now())::date then
    return;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    link_href,
    metadata,
    is_read,
    read_at,
    source_key
  )
  select
    p.auth_user_id,
    'daily_root_recommendation',
    format('Có root từ đề xuất mới cho hôm nay: %s', rw.root),
    format(
      'Hệ thống vừa đề xuất root từ "%s" (%s) cho ngày %s.',
      rw.root,
      rw.meaning,
      to_char(target_recommendation_date, 'DD/MM/YYYY')
    ),
    '/today',
    jsonb_build_object(
      'recommendationDate', target_recommendation_date,
      'rootWordId', rw.id,
      'rootWord', rw.root,
      'meaning', rw.meaning,
      'recommendationId', target_recommendation_id,
      'selectedBy', target_selected_by
    ),
    false,
    null,
    format('daily_root_recommendation:%s:%s', target_recommendation_date, p.auth_user_id)
  from public.profiles p
  join public.root_words rw on rw.id = target_root_word_id
  where p.auth_user_id is not null
  on conflict (source_key) do update
  set
    type = excluded.type,
    title = excluded.title,
    message = excluded.message,
    link_href = excluded.link_href,
    metadata = excluded.metadata,
    is_read = false,
    read_at = null,
    updated_at = now();
end;
$$;

revoke all on function private.sync_daily_root_recommendation_notifications(uuid, date, uuid, uuid) from public;

create or replace function private.handle_daily_root_recommendation_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_daily_root_recommendation_notifications(
    new.id,
    new.recommendation_date,
    new.root_word_id,
    new.selected_by
  );

  return new;
end;
$$;

revoke all on function private.handle_daily_root_recommendation_notifications() from public;

drop trigger if exists trg_daily_root_recommendations_notifications on public.daily_root_recommendations;
create trigger trg_daily_root_recommendations_notifications
after insert or update on public.daily_root_recommendations
for each row
execute function private.handle_daily_root_recommendation_notifications();

do $$
declare
  today_recommendation record;
begin
  for today_recommendation in
    select id, recommendation_date, root_word_id, selected_by
    from public.daily_root_recommendations
    where recommendation_date = timezone('Asia/Ho_Chi_Minh', now())::date
  loop
    perform private.sync_daily_root_recommendation_notifications(
      today_recommendation.id,
      today_recommendation.recommendation_date,
      today_recommendation.root_word_id,
      today_recommendation.selected_by
    );
  end loop;
end;
$$;
