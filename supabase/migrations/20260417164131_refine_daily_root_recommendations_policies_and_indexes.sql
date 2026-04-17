create index if not exists idx_daily_root_recommendations_root_word_id
on public.daily_root_recommendations(root_word_id);

create index if not exists idx_daily_root_recommendations_selected_by
on public.daily_root_recommendations(selected_by);

drop policy if exists "daily_root_recommendations_admin_manage" on public.daily_root_recommendations;

drop policy if exists "daily_root_recommendations_admin_insert" on public.daily_root_recommendations;
create policy "daily_root_recommendations_admin_insert"
on public.daily_root_recommendations
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "daily_root_recommendations_admin_update" on public.daily_root_recommendations;
create policy "daily_root_recommendations_admin_update"
on public.daily_root_recommendations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "daily_root_recommendations_admin_delete" on public.daily_root_recommendations;
create policy "daily_root_recommendations_admin_delete"
on public.daily_root_recommendations
for delete
to authenticated
using (public.is_admin());
