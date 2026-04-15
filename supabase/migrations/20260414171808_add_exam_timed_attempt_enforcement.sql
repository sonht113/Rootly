do $$
begin
  if not exists (
    select 1
    from pg_enum enum_value
    join pg_type enum_type on enum_type.oid = enum_value.enumtypid
    where enum_type.typname = 'exam_attempt_status'
      and enum_value.enumlabel = 'expired'
  ) then
    alter type public.exam_attempt_status add value 'expired';
  end if;
end
$$;

alter table public.exam_attempts
drop constraint if exists exam_attempts_submission_check;

alter table public.exam_attempts
add constraint exam_attempts_submission_check check (
  (
    status = 'started'
    and submitted_at is null
    and score is null
    and awarded_points is null
    and total_points is null
    and correct_answers is null
    and total_questions is null
  )
  or (
    status in ('submitted', 'expired')
    and submitted_at is not null
    and score is not null
    and awarded_points is not null
    and total_points is not null
    and correct_answers is not null
    and total_questions is not null
  )
);

create table if not exists public.exam_attempt_drafts (
  exam_attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  exam_question_id uuid not null references public.exam_questions(id) on delete cascade,
  user_answer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (exam_attempt_id, exam_question_id)
);

create index if not exists idx_exam_attempt_drafts_question_id
on public.exam_attempt_drafts(exam_question_id);

drop trigger if exists trg_exam_attempt_drafts_updated_at on public.exam_attempt_drafts;
create trigger trg_exam_attempt_drafts_updated_at
before update on public.exam_attempt_drafts
for each row execute procedure public.touch_updated_at();

alter table public.exam_attempt_drafts enable row level security;

drop policy if exists "exam_attempt_drafts_select_owner_or_manager" on public.exam_attempt_drafts;
create policy "exam_attempt_drafts_select_owner_or_manager"
on public.exam_attempt_drafts
for select to authenticated
using (
  exists (
    select 1
    from public.exam_attempts a
    where a.id = exam_attempt_id
      and (
        a.user_id = (select auth.uid())
        or private.can_manage_exam(a.exam_id, (select auth.uid()))
      )
  )
);

create or replace function private.get_exam_attempt_deadline(
  p_duration_minutes integer,
  p_started_at timestamptz,
  p_exam_ends_at timestamptz
)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
declare
  duration_deadline timestamptz;
begin
  if p_duration_minutes is not null then
    duration_deadline := p_started_at + make_interval(mins => p_duration_minutes);
  end if;

  if duration_deadline is null then
    return p_exam_ends_at;
  end if;

  if p_exam_ends_at is null then
    return duration_deadline;
  end if;

  return least(duration_deadline, p_exam_ends_at);
end;
$$;

revoke all on function private.get_exam_attempt_deadline(integer, timestamptz, timestamptz) from public;

create or replace function private.build_exam_attempt_answers_from_drafts(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'questionId', q.id,
        'userAnswer', coalesce(d.user_answer, '')
      )
      order by q.position
    ),
    '[]'::jsonb
  )
  from public.exam_attempts a
  join public.exam_questions q on q.exam_id = a.exam_id
  left join public.exam_attempt_drafts d
    on d.exam_attempt_id = a.id
   and d.exam_question_id = q.id
  where a.id = p_attempt_id;
$$;

revoke all on function private.build_exam_attempt_answers_from_drafts(uuid) from public;

create or replace function private.finalize_exam_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_final_status public.exam_attempt_status,
  p_submitted_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_record public.exam_attempts%rowtype;
  inserted_count integer := 0;
  exam_question_count integer := 0;
  calculated_correct_answers integer := 0;
  calculated_total_questions integer := 0;
  calculated_awarded_points integer := 0;
  calculated_total_points integer := 0;
  calculated_score integer := 0;
begin
  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'array' then
    raise exception 'Bộ câu trả lời kỳ thi không hợp lệ.';
  end if;

  select *
  into attempt_record
  from public.exam_attempts
  where id = p_attempt_id
  limit 1;

  if not found then
    raise exception 'Không tìm thấy lượt làm bài để hoàn tất.';
  end if;

  select count(*)
  into exam_question_count
  from public.exam_questions
  where exam_id = attempt_record.exam_id;

  delete from public.exam_answers
  where exam_attempt_id = attempt_record.id;

  insert into public.exam_answers (
    exam_attempt_id,
    exam_question_id,
    user_answer,
    is_correct,
    awarded_points
  )
  with normalized_answers as (
    select
      nullif(value ->> 'questionId', '')::uuid as question_id,
      coalesce(value ->> 'userAnswer', '') as user_answer
    from jsonb_array_elements(p_answers) value
  )
  select
    attempt_record.id,
    q.id,
    normalized_answers.user_answer,
    private.normalize_answer(normalized_answers.user_answer) = private.normalize_answer(q.correct_answer) as is_correct,
    case
      when private.normalize_answer(normalized_answers.user_answer) = private.normalize_answer(q.correct_answer) then q.points
      else 0
    end as awarded_points
  from public.exam_questions q
  join normalized_answers on normalized_answers.question_id = q.id
  where q.exam_id = attempt_record.exam_id;

  get diagnostics inserted_count = row_count;

  if inserted_count <> exam_question_count then
    raise exception 'Không thể chốt bài thi vì dữ liệu câu trả lời chưa đầy đủ.';
  end if;

  select
    count(*) filter (where a.is_correct),
    count(*),
    coalesce(sum(a.awarded_points), 0),
    coalesce(sum(q.points), 0)
  into
    calculated_correct_answers,
    calculated_total_questions,
    calculated_awarded_points,
    calculated_total_points
  from public.exam_answers a
  join public.exam_questions q on q.id = a.exam_question_id
  where a.exam_attempt_id = attempt_record.id;

  calculated_score := case
    when calculated_total_points <= 0 then 0
    else round((calculated_awarded_points::numeric / calculated_total_points::numeric) * 100)
  end;

  update public.exam_attempts
  set
    status = p_final_status,
    submitted_at = p_submitted_at,
    score = calculated_score,
    awarded_points = calculated_awarded_points,
    total_points = calculated_total_points,
    correct_answers = calculated_correct_answers,
    total_questions = calculated_total_questions,
    updated_at = now()
  where id = attempt_record.id;

  delete from public.exam_attempt_drafts
  where exam_attempt_id = attempt_record.id;

  return jsonb_build_object(
    'attemptId', attempt_record.id,
    'examId', attempt_record.exam_id,
    'status', p_final_status::text,
    'submittedAt', p_submitted_at,
    'score', calculated_score,
    'awardedPoints', calculated_awarded_points,
    'totalPoints', calculated_total_points,
    'correctAnswers', calculated_correct_answers,
    'totalQuestions', calculated_total_questions,
    'durationSeconds', greatest(1, extract(epoch from (p_submitted_at - attempt_record.started_at))::integer)
  );
end;
$$;

revoke all on function private.finalize_exam_attempt(uuid, jsonb, public.exam_attempt_status, timestamptz) from public;

create or replace function public.save_exam_attempt_draft(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  attempt_record public.exam_attempts%rowtype;
  exam_record public.exams%rowtype;
  submitted_count integer := 0;
  unique_count integer := 0;
  deadline_at timestamptz;
  remaining_seconds integer;
  saved_answer_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Bạn cần đăng nhập để lưu nháp bài thi.';
  end if;

  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'array' then
    raise exception 'Dữ liệu nháp bài thi không hợp lệ.';
  end if;

  select *
  into attempt_record
  from public.exam_attempts
  where id = p_attempt_id
    and user_id = current_user_id
    and status = 'started'
  limit 1
  for update;

  if not found then
    raise exception 'Không tìm thấy lượt làm bài đang mở để lưu nháp.';
  end if;

  select *
  into exam_record
  from public.exams
  where id = attempt_record.exam_id
  limit 1;

  if not found then
    raise exception 'Không tìm thấy kỳ thi tương ứng với lượt làm bài này.';
  end if;

  deadline_at := private.get_exam_attempt_deadline(
    exam_record.duration_minutes,
    attempt_record.started_at,
    exam_record.ends_at
  );

  if deadline_at is not null and deadline_at <= now() then
    return public.submit_exam_attempt(p_attempt_id, '[]'::jsonb) || jsonb_build_object(
      'deadlineAt', deadline_at,
      'remainingSeconds', 0,
      'savedAnswerCount', 0,
      'finalized', true
    );
  end if;

  with submitted_answers as (
    select
      nullif(value ->> 'questionId', '')::uuid as question_id
    from jsonb_array_elements(p_answers) value
  )
  select count(*), count(distinct question_id)
  into submitted_count, unique_count
  from submitted_answers;

  if submitted_count <> unique_count then
    raise exception 'Danh sách câu trả lời nháp chứa câu hỏi bị lặp.';
  end if;

  if exists (
    with submitted_answers as (
      select
        nullif(value ->> 'questionId', '')::uuid as question_id
      from jsonb_array_elements(p_answers) value
    )
    select 1
    from submitted_answers sa
    left join public.exam_questions q
      on q.id = sa.question_id
     and q.exam_id = attempt_record.exam_id
    where sa.question_id is null
      or q.id is null
  ) then
    raise exception 'Có câu trả lời nháp không thuộc kỳ thi hiện tại.';
  end if;

  delete from public.exam_attempt_drafts draft
  using (
    select
      nullif(value ->> 'questionId', '')::uuid as question_id,
      coalesce(value ->> 'userAnswer', '') as user_answer
    from jsonb_array_elements(p_answers) value
  ) submitted_answers
  where draft.exam_attempt_id = attempt_record.id
    and draft.exam_question_id = submitted_answers.question_id
    and btrim(submitted_answers.user_answer) = '';

  insert into public.exam_attempt_drafts (
    exam_attempt_id,
    exam_question_id,
    user_answer
  )
  select
    attempt_record.id,
    submitted_answers.question_id,
    submitted_answers.user_answer
  from (
    select
      nullif(value ->> 'questionId', '')::uuid as question_id,
      coalesce(value ->> 'userAnswer', '') as user_answer
    from jsonb_array_elements(p_answers) value
  ) submitted_answers
  where submitted_answers.question_id is not null
    and btrim(submitted_answers.user_answer) <> ''
  on conflict (exam_attempt_id, exam_question_id)
  do update set
    user_answer = excluded.user_answer,
    updated_at = now();

  select count(*)
  into saved_answer_count
  from public.exam_attempt_drafts
  where exam_attempt_id = attempt_record.id;

  remaining_seconds := case
    when deadline_at is null then null
    else greatest(0, extract(epoch from (deadline_at - now()))::integer)
  end;

  return jsonb_build_object(
    'attemptId', attempt_record.id,
    'examId', attempt_record.exam_id,
    'status', attempt_record.status::text,
    'deadlineAt', deadline_at,
    'remainingSeconds', remaining_seconds,
    'savedAnswerCount', saved_answer_count,
    'finalized', false
  );
end;
$$;

create or replace function public.submit_exam_attempt(p_attempt_id uuid, p_answers jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  attempt_record public.exam_attempts%rowtype;
  exam_record public.exams%rowtype;
  submitted_count integer := 0;
  unique_count integer := 0;
  exam_question_count integer := 0;
  deadline_at timestamptz;
  submitted_at_value timestamptz := now();
  final_status public.exam_attempt_status := 'submitted';
  final_answers jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Bạn cần đăng nhập để nộp bài thi.';
  end if;

  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'array' then
    raise exception 'Bộ câu trả lời của kỳ thi không hợp lệ.';
  end if;

  select *
  into attempt_record
  from public.exam_attempts
  where id = p_attempt_id
    and user_id = current_user_id
    and status = 'started'
  limit 1
  for update;

  if not found then
    raise exception 'Không tìm thấy lượt làm bài đang mở để nộp.';
  end if;

  select *
  into exam_record
  from public.exams
  where id = attempt_record.exam_id
  limit 1;

  if not found then
    raise exception 'Không tìm thấy kỳ thi tương ứng với lượt làm bài này.';
  end if;

  deadline_at := private.get_exam_attempt_deadline(
    exam_record.duration_minutes,
    attempt_record.started_at,
    exam_record.ends_at
  );

  if deadline_at is not null and deadline_at <= now() then
    final_status := 'expired';
    submitted_at_value := deadline_at;
    final_answers := private.build_exam_attempt_answers_from_drafts(attempt_record.id);
  else
    with submitted_answers as (
      select
        nullif(value ->> 'questionId', '')::uuid as question_id,
        coalesce(value ->> 'userAnswer', '') as user_answer
      from jsonb_array_elements(p_answers) value
    )
    select
      count(*),
      count(distinct question_id),
      (select count(*) from public.exam_questions where exam_id = attempt_record.exam_id)
    into submitted_count, unique_count, exam_question_count
    from submitted_answers;

    if submitted_count <> exam_question_count or unique_count <> exam_question_count then
      raise exception 'Bộ câu trả lời không khớp với số lượng câu hỏi của kỳ thi.';
    end if;

    if exists (
      with submitted_answers as (
        select
          nullif(value ->> 'questionId', '')::uuid as question_id
        from jsonb_array_elements(p_answers) value
      )
      select 1
      from submitted_answers sa
      left join public.exam_questions q
        on q.id = sa.question_id
       and q.exam_id = attempt_record.exam_id
      where sa.question_id is null
        or q.id is null
    ) then
      raise exception 'Có câu trả lời không thuộc kỳ thi hiện tại.';
    end if;

    final_answers := p_answers;
  end if;

  return private.finalize_exam_attempt(
    attempt_record.id,
    final_answers,
    final_status,
    submitted_at_value
  );
end;
$$;

create or replace function public.get_exam_leaderboard(p_exam_id uuid)
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
      and a.status in ('submitted', 'expired')
  )
  select *
  from ranked_attempts
  order by rank asc, duration_seconds asc, submitted_at asc nulls last, username asc;
end;
$$;
