create table if not exists public.root_word_quiz_sets (
  id uuid primary key default gen_random_uuid(),
  root_word_id uuid not null references public.root_words(id) on delete cascade,
  question_count integer not null check (question_count between 1 and 20),
  created_by uuid references public.profiles(auth_user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (root_word_id)
);

create table if not exists public.root_word_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_set_id uuid not null references public.root_word_quiz_sets(id) on delete cascade,
  position integer not null,
  question_type public.quiz_question_type not null,
  prompt text not null,
  correct_answer text not null,
  explanation text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  created_at timestamptz not null default now(),
  unique (quiz_set_id, position),
  constraint root_word_quiz_questions_type_check check (
    (
      question_type = 'multiple_choice'
      and option_a is not null
      and option_b is not null
      and option_c is not null
      and option_d is not null
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

create index if not exists idx_root_word_quiz_sets_root_word_id on public.root_word_quiz_sets(root_word_id);
create index if not exists idx_root_word_quiz_questions_quiz_set_id on public.root_word_quiz_questions(quiz_set_id, position);

alter table public.quiz_attempts
  add column if not exists quiz_set_id uuid references public.root_word_quiz_sets(id) on delete set null;

alter table public.quiz_answers
  add column if not exists quiz_question_id uuid references public.root_word_quiz_questions(id) on delete set null;

drop trigger if exists trg_root_word_quiz_sets_updated_at on public.root_word_quiz_sets;
create trigger trg_root_word_quiz_sets_updated_at before update on public.root_word_quiz_sets
for each row execute procedure public.touch_updated_at();

alter table public.root_word_quiz_sets enable row level security;
alter table public.root_word_quiz_questions enable row level security;

create policy "root_word_quiz_sets_read"
on public.root_word_quiz_sets
for select
to authenticated
using (
  exists (
    select 1
    from public.root_words r
    where r.id = root_word_id
      and (r.is_published or public.is_teacher())
  )
);

create policy "root_word_quiz_sets_teacher_manage"
on public.root_word_quiz_sets
for all
to authenticated
using (public.is_teacher())
with check (public.is_teacher());

create policy "root_word_quiz_questions_read"
on public.root_word_quiz_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.root_word_quiz_sets s
    join public.root_words r on r.id = s.root_word_id
    where s.id = quiz_set_id
      and (r.is_published or public.is_teacher())
  )
);

create policy "root_word_quiz_questions_teacher_manage"
on public.root_word_quiz_questions
for all
to authenticated
using (public.is_teacher())
with check (public.is_teacher());
