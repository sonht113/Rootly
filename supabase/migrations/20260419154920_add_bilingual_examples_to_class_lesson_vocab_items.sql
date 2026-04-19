alter table if exists public.class_lesson_vocab_items
alter column example_sentences drop default;

alter table if exists public.class_lesson_vocab_items
alter column example_sentences type jsonb
using (
  case
    when example_sentences is null or cardinality(example_sentences) = 0 then '[]'::jsonb
    else coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'english',
            trim(sentences.sentence),
            'vietnamese',
            ''
          )
          order by sentences.ordinality
        )
        from unnest(example_sentences) with ordinality as sentences(sentence, ordinality)
        where nullif(trim(sentences.sentence), '') is not null
      ),
      '[]'::jsonb
    )
  end
);

update public.class_lesson_vocab_items
set example_sentences = coalesce(example_sentences, '[]'::jsonb)
where example_sentences is null;

alter table if exists public.class_lesson_vocab_items
alter column example_sentences set default '[]'::jsonb;

alter table if exists public.class_lesson_vocab_items
alter column example_sentences set not null;

alter table if exists public.class_lesson_vocab_items
drop constraint if exists class_lesson_vocab_items_example_sentences_is_array;

alter table if exists public.class_lesson_vocab_items
add constraint class_lesson_vocab_items_example_sentences_is_array
check (jsonb_typeof(example_sentences) = 'array');

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
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'english',
            trim(example_item.value->>'english'),
            'vietnamese',
            coalesce(trim(example_item.value->>'vietnamese'), '')
          )
          order by example_item.ordinality
        )
        from jsonb_array_elements(coalesce(items.example_sentences, '[]'::jsonb)) with ordinality as example_item(value, ordinality)
        where nullif(trim(example_item.value->>'english'), '') is not null
      ),
      '[]'::jsonb
    )
  from jsonb_to_recordset(p_items) as items(
    word text,
    meaning text,
    pronunciation text,
    synonyms text[],
    example_sentences jsonb
  );

  get diagnostics v_imported_count = row_count;

  update public.class_lessons
  set vocabulary_item_count = v_imported_count
  where id = p_lesson_id;

  return v_imported_count;
end;
$$;

grant execute on function public.replace_class_lesson_vocabulary(uuid, jsonb) to authenticated;
