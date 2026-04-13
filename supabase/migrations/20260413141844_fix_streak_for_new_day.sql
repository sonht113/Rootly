create or replace function public.current_streak(p_user_id uuid default auth.uid(), p_cap integer default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  streak_count integer := 0;
  streak_anchor date;
begin
  if p_cap = 1 then
    return case
      when exists (
        select 1
        from public.study_sessions
        where user_id = p_user_id
          and session_date = current_date
          and session_type in ('learn', 'review', 'quiz')
      ) then 1
      else 0
    end;
  end if;

  streak_anchor := case
    when exists (
      select 1
      from public.study_sessions
      where user_id = p_user_id
        and session_date = current_date
        and session_type in ('learn', 'review', 'quiz')
    ) then current_date
    else current_date - 1
  end;

  if not exists (
    select 1
    from public.study_sessions
    where user_id = p_user_id
      and session_date = streak_anchor
      and session_type in ('learn', 'review', 'quiz')
  ) then
    return 0;
  end if;

  loop
    exit when not exists (
      select 1
      from public.study_sessions
      where user_id = p_user_id
        and session_date = streak_anchor - streak_count
        and session_type in ('learn', 'review', 'quiz')
    );

    streak_count := streak_count + 1;

    if p_cap is not null and streak_count >= p_cap then
      exit;
    end if;
  end loop;

  return streak_count;
end;
$$;

create or replace function public.record_root_word_detail_view(
  p_root_word_id uuid,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_root_word_id is null then
    raise exception 'Root word is required';
  end if;

  return jsonb_build_object(
    'recorded', false,
    'sessionId', null
  );
end;
$$;
