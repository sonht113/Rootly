create schema if not exists private;

revoke all on schema private from public;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'exam_scope') then
    create type public.exam_scope as enum ('class', 'global');
  end if;

  if not exists (select 1 from pg_type where typname = 'exam_status') then
    create type public.exam_status as enum ('draft', 'published', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'exam_attempt_status') then
    create type public.exam_attempt_status as enum ('started', 'submitted');
  end if;
end
$$;

create table if not exists public.exam_question_bank_items (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(auth_user_id) on delete cascade,
  prompt text not null,
  question_type public.quiz_question_type not null,
  correct_answer text not null,
  explanation text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_question_bank_items_supported_type_check check (question_type in ('multiple_choice', 'text')),
  constraint exam_question_bank_items_shape_check check (
    (
      question_type = 'multiple_choice'
      and option_a is not null
      and option_b is not null
      and option_c is not null
      and option_d is not null
      and correct_answer in (option_a, option_b, option_c, option_d)
    )
    or (
      question_type = 'text'
      and option_a is null
      and option_b is null
      and option_c is null
      and option_d is null
    )
  )
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  scope public.exam_scope not null default 'global',
  class_id uuid references public.classes(id) on delete set null,
  status public.exam_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 180),
  question_count integer not null default 0 check (question_count >= 0),
  total_points integer not null default 0 check (total_points >= 0),
  created_by uuid not null references public.profiles(auth_user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_scope_check check (
    (scope = 'class' and class_id is not null)
    or (scope = 'global' and class_id is null)
  ),
  constraint exams_schedule_check check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint exams_publish_requirements_check check (
    status <> 'published'
    or (
      question_count > 0
      and total_points > 0
      and published_at is not null
    )
  )
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_bank_item_id uuid references public.exam_question_bank_items(id) on delete set null,
  position integer not null check (position >= 1),
  question_type public.quiz_question_type not null,
  prompt text not null,
  correct_answer text not null,
  explanation text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  points integer not null default 1 check (points between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, position),
  constraint exam_questions_supported_type_check check (question_type in ('multiple_choice', 'text')),
  constraint exam_questions_shape_check check (
    (
      question_type = 'multiple_choice'
      and option_a is not null
      and option_b is not null
      and option_c is not null
      and option_d is not null
      and correct_answer in (option_a, option_b, option_c, option_d)
    )
    or (
      question_type = 'text'
      and option_a is null
      and option_b is null
      and option_c is null
      and option_d is null
    )
  )
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references public.profiles(auth_user_id) on delete cascade,
  status public.exam_attempt_status not null default 'started',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer check (score is null or score between 0 and 100),
  awarded_points integer check (awarded_points is null or awarded_points >= 0),
  total_points integer check (total_points is null or total_points >= 0),
  correct_answers integer check (correct_answers is null or correct_answers >= 0),
  total_questions integer check (total_questions is null or total_questions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, user_id),
  constraint exam_attempts_submission_check check (
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
      status = 'submitted'
      and submitted_at is not null
      and score is not null
      and awarded_points is not null
      and total_points is not null
      and correct_answers is not null
      and total_questions is not null
    )
  )
);

create table if not exists public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  exam_attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  exam_question_id uuid not null references public.exam_questions(id) on delete cascade,
  user_answer text not null default '',
  is_correct boolean not null,
  awarded_points integer not null default 0 check (awarded_points >= 0),
  created_at timestamptz not null default now(),
  unique (exam_attempt_id, exam_question_id)
);

create index if not exists idx_exam_question_bank_items_created_by on public.exam_question_bank_items(created_by, updated_at desc);
create index if not exists idx_exams_created_by on public.exams(created_by, updated_at desc);
create index if not exists idx_exams_scope_status on public.exams(scope, status, starts_at, ends_at);
create index if not exists idx_exams_class_id on public.exams(class_id) where class_id is not null;
create index if not exists idx_exam_questions_exam_id on public.exam_questions(exam_id, position);
create index if not exists idx_exam_attempts_exam_ranking on public.exam_attempts(exam_id, status, score desc, submitted_at asc);
create index if not exists idx_exam_attempts_user_id on public.exam_attempts(user_id, status);
create index if not exists idx_exam_answers_attempt_id on public.exam_answers(exam_attempt_id);

create or replace function private.normalize_answer(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(trim(regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g')));
$$;

revoke all on function private.normalize_answer(text) from public;

create or replace function private.can_manage_exam(p_exam_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = p_exam_id
      and (
        public.is_admin(p_user_id)
        or e.created_by = p_user_id
        or (e.class_id is not null and public.is_class_teacher(e.class_id, p_user_id))
      )
  );
$$;

revoke all on function private.can_manage_exam(uuid, uuid) from public;

create or replace function private.can_edit_exam_questions(p_exam_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = p_exam_id
      and e.status = 'draft'
      and private.can_manage_exam(p_exam_id, p_user_id)
  );
$$;

revoke all on function private.can_edit_exam_questions(uuid, uuid) from public;

create or replace function private.can_read_exam(p_exam_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = p_exam_id
      and (
        private.can_manage_exam(p_exam_id, p_user_id)
        or (
          e.status in ('published', 'closed')
          and (
            e.scope = 'global'
            or (e.scope = 'class' and e.class_id is not null and public.is_class_member(e.class_id, p_user_id))
            or exists (
              select 1
              from public.exam_attempts a
              where a.exam_id = e.id
                and a.user_id = p_user_id
            )
          )
        )
      )
  );
$$;

revoke all on function private.can_read_exam(uuid, uuid) from public;

create or replace function private.can_take_exam(p_exam_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exams e
    where e.id = p_exam_id
      and e.status = 'published'
      and (e.starts_at is null or e.starts_at <= now())
      and (e.ends_at is null or e.ends_at >= now())
      and (
        e.scope = 'global'
        or (e.scope = 'class' and e.class_id is not null and public.is_class_member(e.class_id, p_user_id))
      )
  );
$$;

revoke all on function private.can_take_exam(uuid, uuid) from public;

create or replace function private.refresh_exam_totals(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.exams
  set
    question_count = coalesce((
      select count(*)
      from public.exam_questions q
      where q.exam_id = p_exam_id
    ), 0),
    total_points = coalesce((
      select sum(q.points)
      from public.exam_questions q
      where q.exam_id = p_exam_id
    ), 0),
    updated_at = now()
  where id = p_exam_id;
end;
$$;

revoke all on function private.refresh_exam_totals(uuid) from public;

create or replace function private.on_exam_questions_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_exam_totals(coalesce(new.exam_id, old.exam_id));
  return null;
end;
$$;

revoke all on function private.on_exam_questions_changed() from public;

create or replace function private.sync_exam_publish_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) and new.published_at is null then
    new.published_at := now();
  end if;

  if new.status = 'draft' then
    new.published_at := null;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_exam_publish_state() from public;

create or replace function public.replace_exam_questions(p_exam_id uuid, p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  requested_count integer := 0;
  inserted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Bạn cần đăng nhập để cập nhật câu hỏi kỳ thi.';
  end if;

  if jsonb_typeof(coalesce(p_questions, 'null'::jsonb)) <> 'array' then
    raise exception 'Danh sách câu hỏi kỳ thi không hợp lệ.';
  end if;

  if not private.can_edit_exam_questions(p_exam_id, current_user_id) then
    raise exception 'Chỉ có thể chỉnh sửa câu hỏi khi kỳ thi còn ở trạng thái nháp.';
  end if;

  select count(*)
  into requested_count
  from jsonb_array_elements(p_questions);

  if requested_count = 0 or requested_count > 50 then
    raise exception 'Kỳ thi phải có từ 1 đến 50 câu hỏi.';
  end if;

  if exists (
    with raw_questions as (
      select
        nullif(value ->> 'questionBankItemId', '')::uuid as question_bank_item_id,
        coalesce(nullif(value ->> 'points', '')::integer, 1) as points
      from jsonb_array_elements(p_questions) value
    )
    select 1
    from raw_questions rq
    left join public.exam_question_bank_items item on item.id = rq.question_bank_item_id
    where rq.question_bank_item_id is null
      or rq.points not between 1 and 20
      or item.id is null
      or not (public.is_admin(current_user_id) or item.created_by = current_user_id)
  ) then
    raise exception 'Danh sách câu hỏi chọn từ ngân hàng không hợp lệ.';
  end if;

  delete from public.exam_questions
  where exam_id = p_exam_id;

  with raw_questions as (
    select
      ordinality as position,
      nullif(value ->> 'questionBankItemId', '')::uuid as question_bank_item_id,
      coalesce(nullif(value ->> 'points', '')::integer, 1) as points
    from jsonb_array_elements(p_questions) with ordinality
  )
  insert into public.exam_questions (
    exam_id,
    question_bank_item_id,
    position,
    question_type,
    prompt,
    correct_answer,
    explanation,
    option_a,
    option_b,
    option_c,
    option_d,
    points
  )
  select
    p_exam_id,
    item.id,
    rq.position::integer,
    item.question_type,
    item.prompt,
    item.correct_answer,
    item.explanation,
    item.option_a,
    item.option_b,
    item.option_c,
    item.option_d,
    rq.points
  from raw_questions rq
  join public.exam_question_bank_items item on item.id = rq.question_bank_item_id;

  get diagnostics inserted_count = row_count;

  if inserted_count <> requested_count then
    raise exception 'Không thể đồng bộ đầy đủ câu hỏi kỳ thi.';
  end if;

  perform private.refresh_exam_totals(p_exam_id);

  return jsonb_build_object(
    'questionCount', requested_count,
    'totalPoints', coalesce((select total_points from public.exams where id = p_exam_id), 0)
  );
end;
$$;

create or replace function public.create_exam_attempt(p_exam_id uuid)
returns public.exam_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_attempt public.exam_attempts%rowtype;
  created_attempt public.exam_attempts%rowtype;
begin
  if current_user_id is null then
    raise exception 'Bạn cần đăng nhập để bắt đầu kỳ thi.';
  end if;

  if not private.can_take_exam(p_exam_id, current_user_id) then
    raise exception 'Kỳ thi này hiện chưa mở cho bạn.';
  end if;

  select *
  into existing_attempt
  from public.exam_attempts
  where exam_id = p_exam_id
    and user_id = current_user_id
  limit 1;

  if found then
    return existing_attempt;
  end if;

  begin
    insert into public.exam_attempts (exam_id, user_id, status)
    values (p_exam_id, current_user_id, 'started')
    returning * into created_attempt;
  exception
    when unique_violation then
      select *
      into created_attempt
      from public.exam_attempts
      where exam_id = p_exam_id
        and user_id = current_user_id
      limit 1;
  end;

  return created_attempt;
end;
$$;

create or replace function public.get_exam_attempt_questions(p_exam_id uuid, p_attempt_id uuid)
returns table (
  attempt_id uuid,
  question_id uuid,
  question_position integer,
  question_type public.quiz_question_type,
  prompt text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  points integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Bạn cần đăng nhập để tải đề thi.';
  end if;

  if not exists (
    select 1
    from public.exam_attempts a
    where a.id = p_attempt_id
      and a.exam_id = p_exam_id
      and (
        a.user_id = current_user_id
        or private.can_manage_exam(p_exam_id, current_user_id)
      )
  ) then
    raise exception 'Không tìm thấy lượt làm bài phù hợp.';
  end if;

  return query
  select
    p_attempt_id,
    q.id,
    q.position as question_position,
    q.question_type,
    q.prompt,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.points
  from public.exam_questions q
  where q.exam_id = p_exam_id
  order by q.position asc;
end;
$$;

create or replace function public.submit_exam_attempt(p_attempt_id uuid, p_answers jsonb)
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
  calculated_correct_answers integer := 0;
  calculated_total_questions integer := 0;
  calculated_awarded_points integer := 0;
  calculated_total_points integer := 0;
  calculated_score integer := 0;
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
  limit 1;

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

  insert into public.exam_answers (
    exam_attempt_id,
    exam_question_id,
    user_answer,
    is_correct,
    awarded_points
  )
  with submitted_answers as (
    select
      nullif(value ->> 'questionId', '')::uuid as question_id,
      coalesce(value ->> 'userAnswer', '') as user_answer
    from jsonb_array_elements(p_answers) value
  )
  select
    attempt_record.id,
    q.id,
    sa.user_answer,
    private.normalize_answer(sa.user_answer) = private.normalize_answer(q.correct_answer) as is_correct,
    case
      when private.normalize_answer(sa.user_answer) = private.normalize_answer(q.correct_answer) then q.points
      else 0
    end as awarded_points
  from public.exam_questions q
  join submitted_answers sa on sa.question_id = q.id
  where q.exam_id = attempt_record.exam_id;

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
    status = 'submitted',
    submitted_at = now(),
    score = calculated_score,
    awarded_points = calculated_awarded_points,
    total_points = calculated_total_points,
    correct_answers = calculated_correct_answers,
    total_questions = calculated_total_questions,
    updated_at = now()
  where id = attempt_record.id;

  return jsonb_build_object(
    'attemptId', attempt_record.id,
    'examId', attempt_record.exam_id,
    'score', calculated_score,
    'awardedPoints', calculated_awarded_points,
    'totalPoints', calculated_total_points,
    'correctAnswers', calculated_correct_answers,
    'totalQuestions', calculated_total_questions
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
          a.awarded_points desc,
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
      a.submitted_at,
      p.auth_user_id = current_user_id as is_current_user
    from public.exam_attempts a
    join public.profiles p on p.auth_user_id = a.user_id
    where a.exam_id = p_exam_id
      and a.status = 'submitted'
  )
  select *
  from ranked_attempts
  order by rank asc, submitted_at asc nulls last, username asc;
end;
$$;

drop trigger if exists trg_exam_question_bank_items_updated_at on public.exam_question_bank_items;
create trigger trg_exam_question_bank_items_updated_at
before update on public.exam_question_bank_items
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_exams_updated_at on public.exams;
create trigger trg_exams_updated_at
before update on public.exams
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_exam_questions_updated_at on public.exam_questions;
create trigger trg_exam_questions_updated_at
before update on public.exam_questions
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_exam_attempts_updated_at on public.exam_attempts;
create trigger trg_exam_attempts_updated_at
before update on public.exam_attempts
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_exams_sync_publish_state on public.exams;
create trigger trg_exams_sync_publish_state
before insert or update on public.exams
for each row execute function private.sync_exam_publish_state();

drop trigger if exists trg_exam_questions_refresh_exam_totals on public.exam_questions;
create trigger trg_exam_questions_refresh_exam_totals
after insert or update or delete on public.exam_questions
for each row execute function private.on_exam_questions_changed();

alter table public.exam_question_bank_items enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_answers enable row level security;

drop policy if exists "exam_question_bank_items_read" on public.exam_question_bank_items;
create policy "exam_question_bank_items_read"
on public.exam_question_bank_items
for select to authenticated
using (
  public.is_admin((select auth.uid()))
  or created_by = (select auth.uid())
);

drop policy if exists "exam_question_bank_items_insert" on public.exam_question_bank_items;
create policy "exam_question_bank_items_insert"
on public.exam_question_bank_items
for insert to authenticated
with check (
  public.is_teacher((select auth.uid()))
  and created_by = (select auth.uid())
);

drop policy if exists "exam_question_bank_items_manage" on public.exam_question_bank_items;
create policy "exam_question_bank_items_manage"
on public.exam_question_bank_items
for update to authenticated
using (
  public.is_admin((select auth.uid()))
  or created_by = (select auth.uid())
)
with check (
  public.is_admin((select auth.uid()))
  or created_by = (select auth.uid())
);

drop policy if exists "exam_question_bank_items_delete" on public.exam_question_bank_items;
create policy "exam_question_bank_items_delete"
on public.exam_question_bank_items
for delete to authenticated
using (
  public.is_admin((select auth.uid()))
  or created_by = (select auth.uid())
);

drop policy if exists "exams_read_access" on public.exams;
create policy "exams_read_access"
on public.exams
for select to authenticated
using (
  private.can_read_exam(id, (select auth.uid()))
);

drop policy if exists "exams_insert_access" on public.exams;
create policy "exams_insert_access"
on public.exams
for insert to authenticated
with check (
  public.is_teacher((select auth.uid()))
  and created_by = (select auth.uid())
  and (class_id is null or public.is_class_teacher(class_id, (select auth.uid())))
);

drop policy if exists "exams_update_access" on public.exams;
create policy "exams_update_access"
on public.exams
for update to authenticated
using (
  private.can_manage_exam(id, (select auth.uid()))
)
with check (
  private.can_manage_exam(id, (select auth.uid()))
  and (class_id is null or public.is_class_teacher(class_id, (select auth.uid())))
);

drop policy if exists "exams_delete_access" on public.exams;
create policy "exams_delete_access"
on public.exams
for delete to authenticated
using (
  private.can_manage_exam(id, (select auth.uid()))
);

drop policy if exists "exam_questions_read_manage_only" on public.exam_questions;
create policy "exam_questions_read_manage_only"
on public.exam_questions
for select to authenticated
using (
  private.can_manage_exam(exam_id, (select auth.uid()))
);

drop policy if exists "exam_questions_insert_draft_only" on public.exam_questions;
create policy "exam_questions_insert_draft_only"
on public.exam_questions
for insert to authenticated
with check (
  private.can_edit_exam_questions(exam_id, (select auth.uid()))
);

drop policy if exists "exam_questions_update_draft_only" on public.exam_questions;
create policy "exam_questions_update_draft_only"
on public.exam_questions
for update to authenticated
using (
  private.can_edit_exam_questions(exam_id, (select auth.uid()))
)
with check (
  private.can_edit_exam_questions(exam_id, (select auth.uid()))
);

drop policy if exists "exam_questions_delete_draft_only" on public.exam_questions;
create policy "exam_questions_delete_draft_only"
on public.exam_questions
for delete to authenticated
using (
  private.can_edit_exam_questions(exam_id, (select auth.uid()))
);

drop policy if exists "exam_attempts_owner_or_manager_select" on public.exam_attempts;
create policy "exam_attempts_owner_or_manager_select"
on public.exam_attempts
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_exam(exam_id, (select auth.uid()))
);

drop policy if exists "exam_answers_owner_or_manager_select" on public.exam_answers;
create policy "exam_answers_owner_or_manager_select"
on public.exam_answers
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
