drop policy if exists "classes_members_read" on public.classes;

create policy "classes_members_read"
on public.classes
for select
to authenticated
using (
  public.is_admin()
  or teacher_id = (select auth.uid())
  or exists (
    select 1
    from public.class_members cm
    where cm.class_id = public.classes.id
      and cm.user_id = (select auth.uid())
  )
);
