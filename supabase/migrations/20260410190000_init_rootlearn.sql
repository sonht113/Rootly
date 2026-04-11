create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('student', 'teacher', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'root_level') then
    create type root_level as enum ('basic', 'intermediate', 'advanced');
  end if;

  if not exists (select 1 from pg_type where typname = 'user_root_plan_status') then
    create type user_root_plan_status as enum ('planned', 'in_progress', 'completed', 'skipped', 'overdue');
  end if;

  if not exists (select 1 from pg_type where typname = 'user_root_plan_source') then
    create type user_root_plan_source as enum ('manual', 'teacher_suggested', 'auto');
  end if;

  if not exists (select 1 from pg_type where typname = 'user_root_review_status') then
    create type user_root_review_status as enum ('pending', 'done', 'missed', 'rescheduled');
  end if;

  if not exists (select 1 from pg_type where typname = 'study_session_type') then
    create type study_session_type as enum ('learn', 'review', 'quiz');
  end if;

  if not exists (select 1 from pg_type where typname = 'class_member_role') then
    create type class_member_role as enum ('teacher', 'student');
  end if;

  if not exists (select 1 from pg_type where typname = 'quiz_question_type') then
    create type quiz_question_type as enum ('multiple_choice_meaning', 'fill_in_blank', 'sentence_meaning');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  username citext not null unique,
  email citext,
  avatar_url text,
  role app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.root_words (
  id uuid primary key default gen_random_uuid(),
  root citext not null unique,
  meaning text not null,
  description text not null,
  level root_level not null default 'basic',
  tags text[] not null default '{}',
  is_published boolean not null default false,
  created_by uuid references public.profiles(auth_user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  root_word_id uuid not null references public.root_words(id) on delete cascade,
  word citext not null,
  part_of_speech text not null,
  pronunciation text,
  meaning_en text not null,
  meaning_vi text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (root_word_id, word)
);

create table if not exists public.example_sentences (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,
  english_sentence text not null,
  vietnamese_sentence text not null,
  usage_context text,
  is_daily_usage boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_root_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(auth_user_id) on delete cascade,
  root_word_id uuid not null references public.root_words(id) on delete cascade,
  scheduled_date date not null,
  status user_root_plan_status not null default 'planned',
  source user_root_plan_source not null default 'manual',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, root_word_id, scheduled_date)
);

create table if not exists public.user_root_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(auth_user_id) on delete cascade,
  root_word_id uuid not null references public.root_words(id) on delete cascade,
  review_date date not null,
  review_step smallint not null check (review_step between 1 and 3),
  status user_root_review_status not null default 'pending',
  score integer,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, root_word_id, review_step)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(auth_user_id) on delete cascade,
  root_word_id uuid not null references public.root_words(id) on delete cascade,
  session_type study_session_type not null,
  session_date date not null default current_date,
  duration_minutes integer,
  result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teacher_id uuid not null references public.profiles(auth_user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(auth_user_id) on delete cascade,
  role_in_class class_member_role not null default 'student',
  created_at timestamptz not null default now(),
  unique (class_id, user_id)
);

create table if not exists public.class_root_suggestions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  root_word_id uuid not null references public.root_words(id) on delete cascade,
  suggested_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (class_id, root_word_id, suggested_date)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(auth_user_id) on delete cascade,
  root_word_id uuid not null references public.root_words(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  correct_answers integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_type quiz_question_type not null,
  prompt text not null,
  user_answer text not null,
  correct_answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_root_words_published_level on public.root_words(is_published, level);
create index if not exists idx_words_root_word_id on public.words(root_word_id);
create index if not exists idx_example_sentences_word_id on public.example_sentences(word_id);
create index if not exists idx_user_root_plans_user_date_status on public.user_root_plans(user_id, scheduled_date, status);
create index if not exists idx_user_root_reviews_user_date_status on public.user_root_reviews(user_id, review_date, status);
create index if not exists idx_study_sessions_user_date_type on public.study_sessions(user_id, session_date, session_type);
create index if not exists idx_classes_teacher on public.classes(teacher_id);
create unique index if not exists idx_classes_name_teacher_unique on public.classes(name, teacher_id);
create index if not exists idx_class_members_user on public.class_members(user_id);
create index if not exists idx_class_suggestions_class_date on public.class_root_suggestions(class_id, suggested_date desc);
create index if not exists idx_quiz_attempts_user_created on public.quiz_attempts(user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_root_words_updated_at on public.root_words;
create trigger trg_root_words_updated_at before update on public.root_words
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_words_updated_at on public.words;
create trigger trg_words_updated_at before update on public.words
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_example_sentences_updated_at on public.example_sentences;
create trigger trg_example_sentences_updated_at before update on public.example_sentences
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_user_root_plans_updated_at on public.user_root_plans;
create trigger trg_user_root_plans_updated_at before update on public.user_root_plans
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_user_root_reviews_updated_at on public.user_root_reviews;
create trigger trg_user_root_reviews_updated_at before update on public.user_root_reviews
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_classes_updated_at on public.classes;
create trigger trg_classes_updated_at before update on public.classes
for each row execute procedure public.touch_updated_at();

create or replace function public.current_user_role(p_user_id uuid default auth.uid())
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = p_user_id;
$$;

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(p_user_id) = 'admin', false);
$$;

create or replace function public.is_teacher(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(p_user_id) in ('teacher', 'admin'), false);
$$;

create or replace function public.teacher_has_student(p_teacher_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classes c
    join public.class_members cm on cm.class_id = c.id
    where c.teacher_id = p_teacher_id
      and cm.user_id = p_student_id
  );
$$;

create or replace function public.is_class_teacher(p_class_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classes
    where id = p_class_id
      and teacher_id = p_user_id
  ) or public.is_admin(p_user_id);
$$;

create or replace function public.is_class_member(p_class_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_members
    where class_id = p_class_id
      and user_id = p_user_id
  ) or public.is_class_teacher(p_class_id, p_user_id);
$$;

create or replace function public.create_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb;
  requested_username text;
  requested_role text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_username := coalesce(nullif(metadata ->> 'username', ''), split_part(new.email, '@', 1));
  requested_role := coalesce(nullif(metadata ->> 'role', ''), 'student');

  insert into public.profiles (
    auth_user_id,
    username,
    email,
    avatar_url,
    role
  )
  values (
    new.id,
    requested_username,
    nullif(metadata ->> 'contact_email', ''),
    nullif(metadata ->> 'avatar_url', ''),
    case
      when requested_role in ('student', 'teacher', 'admin') then requested_role::app_role
      else 'student'::app_role
    end
  )
  on conflict (auth_user_id) do update
    set username = excluded.username,
        email = excluded.email,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_profile_from_auth_user();

create or replace function public.current_streak(p_user_id uuid default auth.uid(), p_cap integer default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  streak_count integer := 0;
  offset_count integer := 0;
begin
  if not exists (
    select 1
    from public.study_sessions
    where user_id = p_user_id
      and session_date = current_date
  ) then
    return 0;
  end if;

  loop
    exit when not exists (
      select 1
      from public.study_sessions
      where user_id = p_user_id
        and session_date = current_date - offset_count
    );

    streak_count := streak_count + 1;
    offset_count := offset_count + 1;

    if p_cap is not null and streak_count >= p_cap then
      exit;
    end if;
  end loop;

  return streak_count;
end;
$$;

create or replace function public.sync_due_statuses(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  overdue_plan_count integer := 0;
  missed_review_count integer := 0;
begin
  update public.user_root_plans
  set status = 'overdue'
  where user_id = p_user_id
    and scheduled_date < current_date
    and status in ('planned', 'in_progress');

  get diagnostics overdue_plan_count = row_count;

  update public.user_root_reviews
  set status = 'missed'
  where user_id = p_user_id
    and review_date < current_date
    and status = 'pending';

  get diagnostics missed_review_count = row_count;

  return jsonb_build_object(
    'overdue_plans_updated', overdue_plan_count,
    'missed_reviews_updated', missed_review_count
  );
end;
$$;

create or replace function public.complete_learning_plan(
  p_plan_id uuid,
  p_duration_minutes integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_record public.user_root_plans%rowtype;
  review_date date;
  review_step_number integer := 1;
begin
  select *
  into plan_record
  from public.user_root_plans
  where id = p_plan_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Plan not found';
  end if;

  update public.user_root_plans
  set status = 'completed',
      completed_at = now()
  where id = p_plan_id;

  insert into public.study_sessions (
    user_id,
    root_word_id,
    session_type,
    session_date,
    duration_minutes,
    result
  )
  values (
    plan_record.user_id,
    plan_record.root_word_id,
    'learn',
    current_date,
    p_duration_minutes,
    jsonb_build_object('status', 'completed', 'source', plan_record.source)
  );

  foreach review_date in array array[current_date + 1, current_date + 3, current_date + 7]
  loop
    insert into public.user_root_reviews (
      user_id,
      root_word_id,
      review_date,
      review_step,
      status
    )
    values (
      plan_record.user_id,
      plan_record.root_word_id,
      review_date,
      review_step_number,
      'pending'
    )
    on conflict (user_id, root_word_id, review_step)
    do update
      set review_date = excluded.review_date,
          status = 'pending',
          score = null,
          completed_at = null,
          updated_at = now();

    review_step_number := review_step_number + 1;
  end loop;

  return jsonb_build_object(
    'plan_id', plan_record.id,
    'root_word_id', plan_record.root_word_id,
    'status', 'completed'
  );
end;
$$;

create or replace function public.submit_review_result(
  p_review_id uuid,
  p_remembered boolean,
  p_duration_minutes integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  review_record public.user_root_reviews%rowtype;
begin
  select *
  into review_record
  from public.user_root_reviews
  where id = p_review_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Review not found';
  end if;

  if p_remembered then
    update public.user_root_reviews
    set status = 'done',
        score = 1,
        completed_at = now()
    where id = p_review_id;
  else
    update public.user_root_reviews
    set status = 'rescheduled',
        score = 0,
        review_date = current_date + 1,
        completed_at = null
    where id = p_review_id;
  end if;

  insert into public.study_sessions (
    user_id,
    root_word_id,
    session_type,
    session_date,
    duration_minutes,
    result
  )
  values (
    review_record.user_id,
    review_record.root_word_id,
    'review',
    current_date,
    p_duration_minutes,
    jsonb_build_object(
      'review_id', review_record.id,
      'remembered', p_remembered,
      'review_step', review_record.review_step
    )
  );

  return jsonb_build_object(
    'review_id', review_record.id,
    'remembered', p_remembered
  );
end;
$$;

create or replace function public.get_today_dashboard(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_record public.profiles%rowtype;
  result jsonb;
begin
  perform public.sync_due_statuses(p_user_id);

  select *
  into profile_record
  from public.profiles
  where auth_user_id = p_user_id;

  select jsonb_build_object(
    'greetingName', profile_record.username,
    'streak', public.current_streak(p_user_id),
    'todayPlans', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'scheduled_date', p.scheduled_date,
          'status', p.status,
          'source', p.source,
          'root_word', jsonb_build_object(
            'id', r.id,
            'root', r.root,
            'meaning', r.meaning,
            'level', r.level,
            'word_count', (
              select count(*) from public.words w where w.root_word_id = r.id
            )
          )
        )
        order by p.scheduled_date asc, r.root asc
      )
      from public.user_root_plans p
      join public.root_words r on r.id = p.root_word_id
      where p.user_id = p_user_id
        and p.scheduled_date = current_date
        and p.status in ('planned', 'in_progress')
    ), '[]'::jsonb),
    'todayReviews', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rv.id,
          'review_date', rv.review_date,
          'review_step', rv.review_step,
          'status', rv.status,
          'root_word', jsonb_build_object(
            'id', r.id,
            'root', r.root,
            'meaning', r.meaning
          )
        )
        order by rv.review_step asc, r.root asc
      )
      from public.user_root_reviews rv
      join public.root_words r on r.id = rv.root_word_id
      where rv.user_id = p_user_id
        and rv.review_date = current_date
        and rv.status in ('pending', 'rescheduled')
    ), '[]'::jsonb),
    'overduePlans', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'scheduled_date', p.scheduled_date,
          'status', p.status,
          'root_word', jsonb_build_object(
            'id', r.id,
            'root', r.root,
            'meaning', r.meaning
          )
        )
        order by p.scheduled_date asc
      )
      from public.user_root_plans p
      join public.root_words r on r.id = p.root_word_id
      where p.user_id = p_user_id
        and p.status = 'overdue'
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'totalLearnedRoots', (
        select count(*)
        from public.user_root_plans
        where user_id = p_user_id
          and status = 'completed'
      ),
      'totalReviewsThisWeek', (
        select count(*)
        from public.user_root_reviews
        where user_id = p_user_id
          and status = 'done'
          and completed_at::date >= date_trunc('week', current_date)::date
      ),
      'totalWordsLearned', (
        select count(w.id)
        from public.user_root_plans p
        join public.words w on w.root_word_id = p.root_word_id
        where p.user_id = p_user_id
          and p.status = 'completed'
      )
    )
  )
  into result;

  return result;
end;
$$;

create or replace function public.get_progress_summary(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'totalRootWordsLearned', (
      select count(*)
      from public.user_root_plans
      where user_id = p_user_id
        and status = 'completed'
    ),
    'totalWordsLearned', (
      select count(w.id)
      from public.user_root_plans p
      join public.words w on w.root_word_id = p.root_word_id
      where p.user_id = p_user_id
        and p.status = 'completed'
    ),
    'totalReviewsCompleted', (
      select count(*)
      from public.user_root_reviews
      where user_id = p_user_id
        and status = 'done'
    ),
    'streak', public.current_streak(p_user_id),
    'completionRate', coalesce((
      select round(
        (
          count(*) filter (where status = 'completed')::numeric
          / nullif(count(*), 0)::numeric
        ) * 100
      )
      from public.user_root_plans
      where user_id = p_user_id
    ), 0),
    'weeklyActivity', (
      select jsonb_agg(
        jsonb_build_object(
          'day', to_char(day_series.day, 'Dy'),
          'learned', coalesce(learn_counts.learned, 0),
          'reviewed', coalesce(review_counts.reviewed, 0)
        )
        order by day_series.day asc
      )
      from (
        select generate_series(current_date - 6, current_date, interval '1 day')::date as day
      ) as day_series
      left join (
        select session_date, count(*) as learned
        from public.study_sessions
        where user_id = p_user_id
          and session_type = 'learn'
          and session_date >= current_date - 6
        group by session_date
      ) as learn_counts on learn_counts.session_date = day_series.day
      left join (
        select session_date, count(*) as reviewed
        from public.study_sessions
        where user_id = p_user_id
          and session_type = 'review'
          and session_date >= current_date - 6
        group by session_date
      ) as review_counts on review_counts.session_date = day_series.day
    ),
    'masteredRoots', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'root', r.root,
          'meaning', r.meaning,
          'description', r.description,
          'level', r.level,
          'tags', r.tags,
          'is_published', r.is_published,
          'created_by', r.created_by,
          'created_at', r.created_at,
          'updated_at', r.updated_at
        )
        order by r.root asc
      )
      from public.root_words r
      where exists (
        select 1
        from public.user_root_plans p
        where p.user_id = p_user_id
          and p.root_word_id = r.id
          and p.status = 'completed'
      )
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

create or replace function public.get_leaderboard(
  p_period text default 'week',
  p_metric text default 'reviews_completed',
  p_scope text default 'all',
  p_class_id uuid default null
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  role app_role,
  metric_value bigint,
  root_words_learned bigint,
  words_learned bigint,
  reviews_completed bigint,
  streak integer,
  is_current_user boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start date;
  streak_cap integer;
begin
  period_start := case p_period
    when 'today' then current_date
    when 'week' then date_trunc('week', current_date)::date
    when 'month' then date_trunc('month', current_date)::date
    else null
  end;

  streak_cap := case p_period
    when 'today' then 1
    when 'week' then 7
    when 'month' then 31
    else null
  end;

  if p_scope = 'class' then
    if p_class_id is null then
      raise exception 'class_id is required for class scope';
    end if;

    if not public.is_class_member(p_class_id, auth.uid()) then
      raise exception 'permission denied';
    end if;
  end if;

  return query
  with candidate_profiles as (
    select p.*
    from public.profiles p
    where p.role in ('student', 'teacher')
      and (
        p_scope = 'all'
        or exists (
          select 1
          from public.class_members cm
          where cm.class_id = p_class_id
            and cm.user_id = p.auth_user_id
        )
        or exists (
          select 1
          from public.classes c
          where c.id = p_class_id
            and c.teacher_id = p.auth_user_id
        )
      )
  ),
  root_counts as (
    select p.user_id, count(*) as total
    from public.user_root_plans p
    where p.status = 'completed'
      and (period_start is null or p.completed_at::date >= period_start)
    group by p.user_id
  ),
  word_counts as (
    select p.user_id, count(w.id) as total
    from public.user_root_plans p
    join public.words w on w.root_word_id = p.root_word_id
    where p.status = 'completed'
      and (period_start is null or p.completed_at::date >= period_start)
    group by p.user_id
  ),
  review_counts as (
    select r.user_id, count(*) as total
    from public.user_root_reviews r
    where r.status = 'done'
      and (period_start is null or r.completed_at::date >= period_start)
    group by r.user_id
  ),
  computed as (
    select
      cp.auth_user_id as user_id,
      cp.username::text as username,
      cp.avatar_url,
      cp.role,
      coalesce(rc.total, 0) as root_words_learned,
      coalesce(wc.total, 0) as words_learned,
      coalesce(rvc.total, 0) as reviews_completed,
      public.current_streak(cp.auth_user_id, streak_cap) as streak
    from candidate_profiles cp
    left join root_counts rc on rc.user_id = cp.auth_user_id
    left join word_counts wc on wc.user_id = cp.auth_user_id
    left join review_counts rvc on rvc.user_id = cp.auth_user_id
  ),
  ranked as (
    select
      row_number() over (
        order by
          case p_metric
            when 'root_words_learned' then computed.root_words_learned
            when 'words_learned' then computed.words_learned
            when 'reviews_completed' then computed.reviews_completed
            when 'streak' then computed.streak
            else computed.reviews_completed
          end desc,
          computed.username asc
      ) as rank,
      computed.*,
      case p_metric
        when 'root_words_learned' then computed.root_words_learned
        when 'words_learned' then computed.words_learned
        when 'reviews_completed' then computed.reviews_completed
        when 'streak' then computed.streak
        else computed.reviews_completed
      end as metric_value
    from computed
  )
  select
    ranked.rank,
    ranked.user_id,
    ranked.username,
    ranked.avatar_url,
    ranked.role,
    ranked.metric_value,
    ranked.root_words_learned,
    ranked.words_learned,
    ranked.reviews_completed,
    ranked.streak,
    ranked.user_id = auth.uid() as is_current_user
  from ranked
  order by ranked.rank asc;
end;
$$;

create or replace function public.get_class_progress_summary(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_class_member(p_class_id, auth.uid()) then
    raise exception 'permission denied';
  end if;

  select jsonb_build_object(
    'memberCount', (
      select count(*) from public.class_members where class_id = p_class_id
    ),
    'completedRoots', (
      select count(*)
      from public.user_root_plans p
      where p.status = 'completed'
        and exists (
          select 1 from public.class_members cm
          where cm.class_id = p_class_id
            and cm.user_id = p.user_id
        )
    ),
    'pendingReviews', (
      select count(*)
      from public.user_root_reviews r
      where r.status in ('pending', 'rescheduled')
        and exists (
          select 1 from public.class_members cm
          where cm.class_id = p_class_id
            and cm.user_id = r.user_id
        )
    ),
    'topLearners', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', lb.user_id,
          'username', lb.username,
          'metric_value', lb.metric_value
        )
      )
      from (
        select * from public.get_leaderboard('week', 'root_words_learned', 'class', p_class_id)
        limit 5
      ) lb
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

alter table public.profiles enable row level security;
alter table public.root_words enable row level security;
alter table public.words enable row level security;
alter table public.example_sentences enable row level security;
alter table public.user_root_plans enable row level security;
alter table public.user_root_reviews enable row level security;
alter table public.study_sessions enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_root_suggestions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

create policy "profiles_self_select"
on public.profiles
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or public.is_admin()
  or public.teacher_has_student(auth.uid(), auth_user_id)
);

create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using (auth.uid() = auth_user_id or public.is_admin())
with check (auth.uid() = auth_user_id or public.is_admin());

create policy "root_words_published_read"
on public.root_words
for select
to authenticated
using (is_published or public.is_admin());

create policy "root_words_admin_manage"
on public.root_words
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "words_read"
on public.words
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

create policy "words_admin_manage"
on public.words
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "example_sentences_read"
on public.example_sentences
for select
to authenticated
using (
  exists (
    select 1
    from public.words w
    join public.root_words r on r.id = w.root_word_id
    where w.id = word_id
      and (r.is_published or public.is_admin())
  )
);

create policy "example_sentences_admin_manage"
on public.example_sentences
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "plans_owner_or_teacher_select"
on public.user_root_plans
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or public.teacher_has_student(auth.uid(), user_id)
);

create policy "plans_owner_write"
on public.user_root_plans
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

create policy "plans_owner_update"
on public.user_root_plans
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "plans_owner_delete"
on public.user_root_plans
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "reviews_owner_or_teacher_select"
on public.user_root_reviews
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or public.teacher_has_student(auth.uid(), user_id)
);

create policy "reviews_owner_write"
on public.user_root_reviews
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

create policy "reviews_owner_update"
on public.user_root_reviews
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "study_sessions_owner_or_teacher_select"
on public.study_sessions
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or public.teacher_has_student(auth.uid(), user_id)
);

create policy "study_sessions_owner_write"
on public.study_sessions
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

create policy "classes_members_read"
on public.classes
for select
to authenticated
using (
  public.is_admin()
  or teacher_id = auth.uid()
  or exists (
    select 1 from public.class_members cm
    where cm.class_id = id
      and cm.user_id = auth.uid()
  )
);

create policy "classes_teacher_manage"
on public.classes
for all
to authenticated
using (teacher_id = auth.uid() or public.is_admin())
with check (teacher_id = auth.uid() or public.is_admin());

create policy "class_members_read"
on public.class_members
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.is_class_teacher(class_id, auth.uid())
  or public.is_class_member(class_id, auth.uid())
);

create policy "class_members_teacher_manage"
on public.class_members
for all
to authenticated
using (public.is_class_teacher(class_id, auth.uid()))
with check (public.is_class_teacher(class_id, auth.uid()));

create policy "class_suggestions_read"
on public.class_root_suggestions
for select
to authenticated
using (public.is_class_member(class_id, auth.uid()));

create policy "class_suggestions_teacher_manage"
on public.class_root_suggestions
for all
to authenticated
using (public.is_class_teacher(class_id, auth.uid()))
with check (public.is_class_teacher(class_id, auth.uid()));

create policy "quiz_attempts_owner_or_teacher_select"
on public.quiz_attempts
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin()
  or public.teacher_has_student(auth.uid(), user_id)
);

create policy "quiz_attempts_owner_write"
on public.quiz_attempts
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

create policy "quiz_answers_owner_or_teacher_select"
on public.quiz_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.quiz_attempts qa
    where qa.id = quiz_attempt_id
      and (
        qa.user_id = auth.uid()
        or public.is_admin()
        or public.teacher_has_student(auth.uid(), qa.user_id)
      )
  )
);

create policy "quiz_answers_owner_write"
on public.quiz_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.quiz_attempts qa
    where qa.id = quiz_attempt_id
      and (qa.user_id = auth.uid() or public.is_admin())
  )
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
