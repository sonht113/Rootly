create or replace function public.get_ranking_insights(
  p_period text default 'week',
  p_metric text default 'reviews_completed',
  p_scope text default 'all',
  p_class_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  with leaderboard as (
    select *
    from public.get_leaderboard(p_period, p_metric, p_scope, p_class_id)
  ),
  current_user_row as (
    select *
    from leaderboard
    where is_current_user
    limit 1
  ),
  next_rank_row as (
    select l.*
    from leaderboard l
    join current_user_row c on l.rank = c.rank - 1
    limit 1
  ),
  totals as (
    select count(*)::integer as total_count
    from leaderboard
  ),
  top_users as (
    select user_id
    from leaderboard
    order by rank asc
    limit 10
  ),
  day_series as (
    select generate_series(current_date - 6, current_date, interval '1 day')::date as day
  ),
  current_daily as (
    select session_date, count(*)::integer as reviewed
    from public.study_sessions
    where user_id = auth.uid()
      and session_type = 'review'
      and session_date >= current_date - 6
    group by session_date
  ),
  top_session_counts as (
    select s.user_id, s.session_date, count(*)::numeric as reviewed
    from public.study_sessions s
    join top_users tu on tu.user_id = s.user_id
    where s.session_type = 'review'
      and s.session_date >= current_date - 6
    group by s.user_id, s.session_date
  ),
  top_daily as (
    select
      ds.day,
      coalesce(avg(coalesce(tsc.reviewed, 0)), 0) as avg_reviews
    from day_series ds
    cross join top_users tu
    left join top_session_counts tsc
      on tsc.user_id = tu.user_id
     and tsc.session_date = ds.day
    group by ds.day
  )
  select jsonb_build_object(
    'currentUserRank', (select rank from current_user_row),
    'currentUserMetricValue', coalesce((select metric_value from current_user_row), 0),
    'percentile', coalesce((
      select case
        when totals.total_count <= 1 then 100
        else round(((totals.total_count - c.rank)::numeric / totals.total_count::numeric) * 100)
      end
      from current_user_row c
      cross join totals
    ), 0),
    'nextRank', (select rank from next_rank_row),
    'nextRankMetricValue', (select metric_value from next_rank_row),
    'pointsToNextRank', coalesce((
      select greatest(n.metric_value - c.metric_value, 0)
      from current_user_row c
      join next_rank_row n on true
    ), 0),
    'progressPercent', coalesce((
      select case
        when n.metric_value is null or n.metric_value <= c.metric_value then 100
        else greatest(8, least(99, round((c.metric_value::numeric / nullif(n.metric_value, 0)::numeric) * 100)))
      end
      from current_user_row c
      left join next_rank_row n on true
    ), 0),
    'currentStreak', public.current_streak(auth.uid()),
    'activityComparison', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', ds.day,
          'yourReviews', coalesce(cd.reviewed, 0),
          'top10AverageReviews', round(coalesce(td.avg_reviews, 0), 1)
        )
        order by ds.day
      )
      from day_series ds
      left join current_daily cd on cd.session_date = ds.day
      left join top_daily td on td.day = ds.day
    ), '[]'::jsonb)
  )
  into result
  from totals
  limit 1;

  return coalesce(
    result,
    jsonb_build_object(
      'currentUserRank', null,
      'currentUserMetricValue', 0,
      'percentile', 0,
      'nextRank', null,
      'nextRankMetricValue', null,
      'pointsToNextRank', 0,
      'progressPercent', 0,
      'currentStreak', public.current_streak(auth.uid()),
      'activityComparison', '[]'::jsonb
    )
  );
end;
$$;
