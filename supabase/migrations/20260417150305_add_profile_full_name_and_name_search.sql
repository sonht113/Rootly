create extension if not exists unaccent with schema extensions;

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists full_name_search text;

create or replace function public.derive_profile_full_name(p_username text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized_username text := btrim(coalesce(p_username, ''));
  stripped_username text;
begin
  if normalized_username = '' then
    return 'Rootly';
  end if;

  case
    when lower(normalized_username) like 'student.%' then stripped_username := substr(normalized_username, 9);
    when lower(normalized_username) like 'teacher.%' then stripped_username := substr(normalized_username, 9);
    when lower(normalized_username) like 'admin.%' then stripped_username := substr(normalized_username, 7);
    else stripped_username := normalized_username;
  end case;

  stripped_username := regexp_replace(stripped_username, '[._-]+', ' ', 'g');
  stripped_username := btrim(regexp_replace(stripped_username, '\s+', ' ', 'g'));

  if stripped_username = '' then
    return 'Rootly';
  end if;

  return coalesce(
    (
      select string_agg(upper(left(parts.part, 1)) || lower(substr(parts.part, 2)), ' ')
      from unnest(regexp_split_to_array(stripped_username, '\s+')) as parts(part)
      where parts.part <> ''
    ),
    'Rootly'
  );
end;
$$;

drop function if exists public.get_leaderboard(text, text, text, uuid);
create function public.get_leaderboard(
  p_period text default 'week',
  p_metric text default 'reviews_completed',
  p_scope text default 'all',
  p_class_id uuid default null
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  full_name text,
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
      cp.full_name,
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
          computed.full_name asc
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
    ranked.full_name,
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

drop function if exists public.get_exam_leaderboard(uuid);
create function public.get_exam_leaderboard(p_exam_id uuid)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  full_name text,
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
          p.full_name asc
      ) as rank,
      p.auth_user_id as user_id,
      p.username::text as username,
      p.full_name,
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
  order by rank asc, duration_seconds asc, submitted_at asc nulls last, full_name asc;
end;
$$;

create or replace function public.normalize_profile_search_text(p_value text)
returns text
language sql
stable
set search_path = public
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        extensions.unaccent(lower(coalesce(p_value, ''))),
        '[%_]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.sync_profile_name_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.full_name := coalesce(
    nullif(btrim(regexp_replace(coalesce(new.full_name, ''), '\s+', ' ', 'g')), ''),
    public.derive_profile_full_name(new.username)
  );
  new.full_name_search := public.normalize_profile_search_text(new.full_name);

  return new;
end;
$$;

drop trigger if exists trg_profiles_name_fields on public.profiles;
create trigger trg_profiles_name_fields
before insert or update of full_name, username on public.profiles
for each row execute procedure public.sync_profile_name_fields();

update public.profiles
set full_name = coalesce(
  nullif(btrim(regexp_replace(coalesce(full_name, ''), '\s+', ' ', 'g')), ''),
  public.derive_profile_full_name(username)
)
where full_name is null
   or btrim(full_name) = ''
   or full_name_search is null
   or btrim(full_name_search) = '';

alter table public.profiles
  alter column full_name set not null,
  alter column full_name_search set not null;

create index if not exists idx_profiles_role_full_name on public.profiles(role, full_name);

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
  requested_full_name text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_username := coalesce(nullif(metadata ->> 'username', ''), split_part(new.email, '@', 1));
  requested_role := coalesce(nullif(metadata ->> 'role', ''), 'student');
  requested_full_name := coalesce(
    nullif(btrim(regexp_replace(coalesce(metadata ->> 'full_name', ''), '\s+', ' ', 'g')), ''),
    public.derive_profile_full_name(requested_username)
  );

  insert into public.profiles (
    auth_user_id,
    username,
    full_name,
    email,
    avatar_url,
    role
  )
  values (
    new.id,
    requested_username,
    requested_full_name,
    nullif(metadata ->> 'contact_email', ''),
    nullif(metadata ->> 'avatar_url', ''),
    case
      when requested_role in ('student', 'teacher', 'admin') then requested_role::app_role
      else 'student'::app_role
    end
  )
  on conflict (auth_user_id) do update
    set username = excluded.username,
        full_name = coalesce(
          nullif(excluded.full_name, ''),
          public.profiles.full_name,
          public.derive_profile_full_name(excluded.username)
        ),
        email = excluded.email,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        role = excluded.role,
        updated_at = now();

  return new;
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
    'greetingName', coalesce(profile_record.full_name, public.derive_profile_full_name(profile_record.username)),
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
