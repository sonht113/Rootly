alter table if exists public.class_lesson_vocab_items
add column if not exists pronunciation text;

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
    pronunciation,
    synonyms,
    example_sentences
  )
  select
    p_lesson_id,
    trim(items.word),
    trim(items.meaning),
    nullif(trim(items.pronunciation), ''),
    coalesce(items.synonyms, '{}'::text[]),
    coalesce(items.example_sentences, '{}'::text[])
  from jsonb_to_recordset(p_items) as items(
    word text,
    meaning text,
    pronunciation text,
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
