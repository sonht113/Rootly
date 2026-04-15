create index if not exists idx_exam_questions_question_bank_item_id
on public.exam_questions(question_bank_item_id)
where question_bank_item_id is not null;

create index if not exists idx_exam_answers_exam_question_id
on public.exam_answers(exam_question_id);

drop function if exists public.get_exam_leaderboard(uuid);

create function public.get_exam_leaderboard(p_exam_id uuid)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  role public.app_role,
  score integer,
  awarded_points integer,
  total_points integer,
  correct_answers integer,
  total_questions integer,
  duration_seconds integer,
  submitted_at timestamptz,
  is_current_user boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Bạn cần đăng nhập để xem bảng xếp hạng kỳ thi.';
  end if;

  if not private.can_read_exam(p_exam_id, current_user_id) then
    raise exception 'Bạn không có quyền xem bảng xếp hạng kỳ thi này.';
  end if;

  return query
  with ranked_attempts as (
    select
      rank() over (
        order by
          a.score desc,
          a.correct_answers desc,
          greatest(1, extract(epoch from (a.submitted_at - a.started_at))::integer) asc,
          a.submitted_at asc,
          p.username asc
      ) as rank,
      p.auth_user_id as user_id,
      p.username::text as username,
      p.avatar_url,
      p.role,
      a.score,
      a.awarded_points,
      a.total_points,
      a.correct_answers,
      a.total_questions,
      greatest(1, extract(epoch from (a.submitted_at - a.started_at))::integer) as duration_seconds,
      a.submitted_at,
      p.auth_user_id = current_user_id as is_current_user
    from public.exam_attempts a
    join public.profiles p on p.auth_user_id = a.user_id
    where a.exam_id = p_exam_id
      and a.status = 'submitted'
  )
  select *
  from ranked_attempts
  order by rank asc, duration_seconds asc, submitted_at asc nulls last, username asc;
end;
$$;
