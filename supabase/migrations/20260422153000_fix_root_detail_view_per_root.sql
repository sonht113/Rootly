create unique index if not exists idx_study_sessions_detail_view_unique
on public.study_sessions (user_id, root_word_id, session_date)
where session_type = 'detail_view';

create or replace function public.record_root_word_detail_view(
  p_root_word_id uuid,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  existing_session_id uuid;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_root_word_id is null then
    raise exception 'Root word is required';
  end if;

  select s.id
  into existing_session_id
  from public.study_sessions s
  where s.user_id = p_user_id
    and s.root_word_id = p_root_word_id
    and s.session_type = 'detail_view'
    and s.session_date = current_date
  limit 1;

  if existing_session_id is not null then
    return jsonb_build_object(
      'recorded', false,
      'sessionId', existing_session_id
    );
  end if;

  insert into public.study_sessions (
    user_id,
    root_word_id,
    session_type,
    session_date,
    result
  )
  values (
    p_user_id,
    p_root_word_id,
    'detail_view',
    current_date,
    jsonb_build_object('event', 'root_detail_view')
  )
  on conflict (user_id, root_word_id, session_date)
  where session_type = 'detail_view'
  do nothing
  returning id into existing_session_id;

  if existing_session_id is null then
    select s.id
    into existing_session_id
    from public.study_sessions s
    where s.user_id = p_user_id
      and s.root_word_id = p_root_word_id
      and s.session_type = 'detail_view'
      and s.session_date = current_date
    limit 1;

    return jsonb_build_object(
      'recorded', false,
      'sessionId', existing_session_id
    );
  end if;

  return jsonb_build_object(
    'recorded', true,
    'sessionId', existing_session_id
  );
end;
$$;
