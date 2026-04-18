create table if not exists public.class_lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  description text,
  vocabulary_item_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_lessons_vocabulary_item_count_check check (vocabulary_item_count >= 0)
);

create table if not exists public.class_lesson_vocab_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.class_lessons(id) on delete cascade,
  word citext not null,
  meaning text not null,
  synonyms text[] not null default '{}'::text[],
  example_sentences text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, word)
);

create index if not exists class_lessons_class_id_created_at_idx
  on public.class_lessons (class_id, created_at desc);

alter table public.class_lessons enable row level security;
alter table public.class_lesson_vocab_items enable row level security;

create policy "class_lessons_read"
on public.class_lessons
for select
to authenticated
using (public.is_class_member(class_id, auth.uid()));

create policy "class_lessons_teacher_manage"
on public.class_lessons
for all
to authenticated
using (public.is_class_teacher(class_id, auth.uid()))
with check (public.is_class_teacher(class_id, auth.uid()));

create policy "class_lesson_vocab_items_read"
on public.class_lesson_vocab_items
for select
to authenticated
using (
  exists (
    select 1
    from public.class_lessons lessons
    where lessons.id = lesson_id
      and public.is_class_member(lessons.class_id, auth.uid())
  )
);

create policy "class_lesson_vocab_items_teacher_manage"
on public.class_lesson_vocab_items
for all
to authenticated
using (
  exists (
    select 1
    from public.class_lessons lessons
    where lessons.id = lesson_id
      and public.is_class_teacher(lessons.class_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.class_lessons lessons
    where lessons.id = lesson_id
      and public.is_class_teacher(lessons.class_id, auth.uid())
  )
);

drop trigger if exists trg_class_lessons_updated_at on public.class_lessons;
create trigger trg_class_lessons_updated_at before update on public.class_lessons
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_class_lesson_vocab_items_updated_at on public.class_lesson_vocab_items;
create trigger trg_class_lesson_vocab_items_updated_at before update on public.class_lesson_vocab_items
for each row execute procedure public.touch_updated_at();

create or replace function public.replace_class_lesson_vocabulary(
  p_lesson_id uuid,
  p_items jsonb
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_class_id uuid;
  v_imported_count integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Lesson vocabulary payload must be a JSON array.';
  end if;

  select class_id
  into v_class_id
  from public.class_lessons
  where id = p_lesson_id;

  if v_class_id is null then
    raise exception 'Class lesson not found.';
  end if;

  if not public.is_class_teacher(v_class_id, auth.uid()) then
    raise exception 'permission denied';
  end if;

  delete from public.class_lesson_vocab_items
  where lesson_id = p_lesson_id;

  insert into public.class_lesson_vocab_items (
    lesson_id,
    word,
    meaning,
    synonyms,
    example_sentences
  )
  select
    p_lesson_id,
    trim(items.word),
    trim(items.meaning),
    coalesce(items.synonyms, '{}'::text[]),
    coalesce(items.example_sentences, '{}'::text[])
  from jsonb_to_recordset(p_items) as items(
    word text,
    meaning text,
    synonyms text[],
    example_sentences text[]
  );

  get diagnostics v_imported_count = row_count;

  update public.class_lessons
  set vocabulary_item_count = v_imported_count
  where id = p_lesson_id;

  return v_imported_count;
end;
$$;

grant execute on function public.replace_class_lesson_vocabulary(uuid, jsonb) to authenticated;
