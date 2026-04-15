with ranked_plans as (
  select
    id,
    row_number() over (
      partition by user_id, root_word_id
      order by
        case status
          when 'completed' then 0
          when 'in_progress' then 1
          when 'planned' then 2
          when 'overdue' then 3
          when 'skipped' then 4
          else 5
        end,
        scheduled_date asc,
        created_at asc,
        id asc
    ) as plan_rank
  from public.user_root_plans
),
duplicate_plans as (
  select id
  from ranked_plans
  where plan_rank > 1
)
delete from public.user_root_plans
where id in (select id from duplicate_plans);

alter table public.user_root_plans
drop constraint if exists user_root_plans_user_id_root_word_id_scheduled_date_key;

alter table public.user_root_plans
drop constraint if exists user_root_plans_user_id_root_word_id_key;

alter table public.user_root_plans
add constraint user_root_plans_user_id_root_word_id_key unique (user_id, root_word_id);
