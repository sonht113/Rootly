import { createClient } from "@supabase/supabase-js";

import { usernameToInternalEmail } from "../src/lib/auth/username";
import { getServerEnv } from "../src/lib/supabase/env";
import type { RootWordInput } from "../src/lib/validations/root-words";

const env = getServerEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const users = [
  { username: "admin.rootly", password: "Rootly123", role: "admin", email: "admin@rootly.dev" },
  { username: "teacher.son", password: "Rootly123", role: "teacher", email: "teacher@rootly.dev" },
  { username: "student.minh", password: "Rootly123", role: "student", email: "minh@rootly.dev" },
  { username: "student.lan", password: "Rootly123", role: "student", email: "lan@rootly.dev" },
  { username: "student.quang", password: "Rootly123", role: "student", email: "quang@rootly.dev" },
] as const;

const rootWords: RootWordInput[] = [
  {
    root: "spect",
    meaning: "to look",
    description: "A root used in words related to seeing, observing, or appearance.",
    level: "basic",
    tags: ["daily-use", "office"],
    is_published: true,
    words: [
      {
        word: "inspect",
        part_of_speech: "verb",
        pronunciation: "/in-spekt/",
        meaning_en: "to look at carefully",
        meaning_vi: "kiem tra ky",
        example_sentences: [
          {
            english_sentence: "Please inspect the package before signing for it.",
            vietnamese_sentence: "Hay kiem tra goi hang truoc khi ky nhan.",
            usage_context: "delivery",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "respect",
        part_of_speech: "verb",
        pronunciation: "/ri-spekt/",
        meaning_en: "to admire or value",
        meaning_vi: "ton trong",
        example_sentences: [
          {
            english_sentence: "I respect how she explains things clearly.",
            vietnamese_sentence: "Toi ton trong cach co ay giai thich moi thu ro rang.",
            usage_context: "workplace",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "aspect",
        part_of_speech: "noun",
        pronunciation: "/as-pekt/",
        meaning_en: "one part or feature of something",
        meaning_vi: "khia canh",
        example_sentences: [
          {
            english_sentence: "Time management is an important aspect of remote work.",
            vietnamese_sentence: "Quan ly thoi gian la mot khia canh quan trong cua lam viec tu xa.",
            usage_context: "workplace",
            is_daily_usage: true,
          },
        ],
      },
    ],
  },
  {
    root: "tract",
    meaning: "to pull or drag",
    description: "Often appears in words about pulling, attracting, or handling movement.",
    level: "basic",
    tags: ["communication"],
    is_published: true,
    words: [
      {
        word: "attract",
        part_of_speech: "verb",
        pronunciation: "/a-trakt/",
        meaning_en: "to pull interest or attention",
        meaning_vi: "thu hut",
        example_sentences: [
          {
            english_sentence: "A clear headline can attract more readers.",
            vietnamese_sentence: "Tieu de ro rang co the thu hut nhieu nguoi doc hon.",
            usage_context: "marketing",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "distract",
        part_of_speech: "verb",
        pronunciation: "/dis-trakt/",
        meaning_en: "to pull attention away",
        meaning_vi: "lam xao nhang",
        example_sentences: [
          {
            english_sentence: "Phone notifications distract me during deep work.",
            vietnamese_sentence: "Thong bao dien thoai lam toi xao nhang khi can tap trung cao do.",
            usage_context: "productivity",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "contract",
        part_of_speech: "noun",
        pronunciation: "/kon-trakt/",
        meaning_en: "a formal agreement",
        meaning_vi: "hop dong",
        example_sentences: [
          {
            english_sentence: "We signed the contract after reviewing the terms.",
            vietnamese_sentence: "Chung toi da ky hop dong sau khi xem lai cac dieu khoan.",
            usage_context: "business",
            is_daily_usage: true,
          },
        ],
      },
    ],
  },
  {
    root: "dict",
    meaning: "to say",
    description: "Useful for words related to speaking, declaring, or expressing ideas.",
    level: "basic",
    tags: ["communication"],
    is_published: true,
    words: [
      {
        word: "predict",
        part_of_speech: "verb",
        pronunciation: "/pri-dikt/",
        meaning_en: "to say before it happens",
        meaning_vi: "du doan",
        example_sentences: [
          {
            english_sentence: "Can you predict the next trend in design?",
            vietnamese_sentence: "Ban co the du doan xu huong thiet ke tiep theo khong?",
            usage_context: "conversation",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "dictionary",
        part_of_speech: "noun",
        pronunciation: "/dik-shuh-neh-ree/",
        meaning_en: "a book of words and meanings",
        meaning_vi: "tu dien",
        example_sentences: [
          {
            english_sentence: "I still keep a small dictionary on my desk.",
            vietnamese_sentence: "Toi van de mot cuon tu dien nho tren ban lam viec.",
            usage_context: "study",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "verdict",
        part_of_speech: "noun",
        pronunciation: "/ver-dikt/",
        meaning_en: "a final judgment or decision",
        meaning_vi: "phan quyet",
        example_sentences: [
          {
            english_sentence: "The team gave a clear verdict after the demo review.",
            vietnamese_sentence: "Nhom dua ra ket luan ro rang sau buoi review demo.",
            usage_context: "teamwork",
            is_daily_usage: true,
          },
        ],
      },
    ],
  },
  {
    root: "scrib/script",
    meaning: "to write",
    description: "A root connected to writing, describing, and putting words into text.",
    level: "intermediate",
    tags: ["writing"],
    is_published: true,
    words: [
      {
        word: "describe",
        part_of_speech: "verb",
        pronunciation: "/di-skraib/",
        meaning_en: "to give details about something",
        meaning_vi: "mo ta",
        example_sentences: [
          {
            english_sentence: "Can you describe the issue in one sentence?",
            vietnamese_sentence: "Ban co the mo ta van de trong mot cau khong?",
            usage_context: "meeting",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "subscribe",
        part_of_speech: "verb",
        pronunciation: "/sub-skraib/",
        meaning_en: "to sign up regularly",
        meaning_vi: "dang ky theo doi",
        example_sentences: [
          {
            english_sentence: "I subscribed to the newsletter for weekly updates.",
            vietnamese_sentence: "Toi dang ky ban tin de nhan cap nhat hang tuan.",
            usage_context: "product",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "script",
        part_of_speech: "noun",
        pronunciation: "/skript/",
        meaning_en: "a written text for speaking or acting",
        meaning_vi: "kich ban",
        example_sentences: [
          {
            english_sentence: "She wrote a short script for the presentation opening.",
            vietnamese_sentence: "Co ay viet mot kich ban ngan cho phan mo dau bai thuyet trinh.",
            usage_context: "presentation",
            is_daily_usage: true,
          },
        ],
      },
    ],
  },
  {
    root: "port",
    meaning: "to carry",
    description: "Appears in words about transporting, carrying, or supporting something across places.",
    level: "basic",
    tags: ["travel", "logistics"],
    is_published: true,
    words: [
      {
        word: "transport",
        part_of_speech: "verb",
        pronunciation: "/trans-port/",
        meaning_en: "to carry from one place to another",
        meaning_vi: "van chuyen",
        example_sentences: [
          {
            english_sentence: "This company can transport goods overnight.",
            vietnamese_sentence: "Cong ty nay co the van chuyen hang hoa qua dem.",
            usage_context: "logistics",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "portable",
        part_of_speech: "adjective",
        pronunciation: "/por-tuh-buhl/",
        meaning_en: "easy to carry",
        meaning_vi: "de mang theo",
        example_sentences: [
          {
            english_sentence: "I need a portable speaker for weekend trips.",
            vietnamese_sentence: "Toi can mot loa de mang theo cho chuyen di cuoi tuan.",
            usage_context: "travel",
            is_daily_usage: true,
          },
        ],
      },
      {
        word: "support",
        part_of_speech: "verb",
        pronunciation: "/suh-port/",
        meaning_en: "to hold up or help",
        meaning_vi: "ho tro",
        example_sentences: [
          {
            english_sentence: "Thanks for supporting the new learning plan.",
            vietnamese_sentence: "Cam on ban da ho tro ke hoach hoc moi.",
            usage_context: "teamwork",
            is_daily_usage: true,
          },
        ],
      },
    ],
  },
];

async function ensureUser(user: (typeof users)[number]) {
  const email = usernameToInternalEmail(user.username);
  const existingUsers = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existingUsers.data.users.find((candidate) => candidate.email === email);

  if (found) {
    await supabase
      .from("profiles")
      .update({
        username: user.username,
        email: user.email,
        role: user.role,
      })
      .eq("auth_user_id", found.id);

    return found.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      username: user.username,
      contact_email: user.email,
      role: user.role,
    },
  });

  if (error || !data.user) {
    throw error ?? new Error(`Could not create user ${user.username}`);
  }

  return data.user.id;
}

async function upsertRootWord(rootWord: RootWordInput, createdBy: string) {
  const { data: rootRecord, error: rootError } = await supabase
    .from("root_words")
    .upsert(
      {
        root: rootWord.root,
        meaning: rootWord.meaning,
        description: rootWord.description,
        level: rootWord.level,
        tags: rootWord.tags,
        is_published: rootWord.is_published,
        created_by: createdBy,
      },
      {
        onConflict: "root",
      },
    )
    .select()
    .single();

  if (rootError || !rootRecord) {
    throw rootError ?? new Error(`Could not upsert root ${rootWord.root}`);
  }

  await supabase.from("words").delete().eq("root_word_id", rootRecord.id);

  for (const word of rootWord.words) {
    const { data: wordRecord, error: wordError } = await supabase
      .from("words")
      .insert({
        root_word_id: rootRecord.id,
        word: word.word,
        part_of_speech: word.part_of_speech,
        pronunciation: word.pronunciation ?? null,
        meaning_en: word.meaning_en,
        meaning_vi: word.meaning_vi,
      })
      .select()
      .single();

    if (wordError || !wordRecord) {
      throw wordError ?? new Error(`Could not insert word ${word.word}`);
    }

    await supabase.from("example_sentences").insert(
      word.example_sentences.map((sentence) => ({
        word_id: wordRecord.id,
        english_sentence: sentence.english_sentence,
        vietnamese_sentence: sentence.vietnamese_sentence,
        usage_context: sentence.usage_context ?? null,
        is_daily_usage: sentence.is_daily_usage,
      })),
    );
  }

  return rootRecord.id;
}

async function main() {
  console.log("Seeding Rootly...");

  const userIds = new Map<string, string>();
  for (const user of users) {
    const id = await ensureUser(user);
    userIds.set(user.username, id);
  }

  const adminId = userIds.get("admin.rootly");
  const teacherId = userIds.get("teacher.son");
  const studentMinhId = userIds.get("student.minh");
  const studentLanId = userIds.get("student.lan");
  const studentQuangId = userIds.get("student.quang");

  if (!adminId || !teacherId || !studentMinhId || !studentLanId || !studentQuangId) {
    throw new Error("Missing seeded user ids.");
  }

  const rootIds = new Map<string, string>();
  for (const rootWord of rootWords) {
    const rootId = await upsertRootWord(rootWord, adminId);
    rootIds.set(rootWord.root, rootId);
  }

  const existingClass = await supabase
    .from("classes")
    .select("*")
    .eq("name", "Rootly Starter Class")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  const classRecord =
    existingClass.data ??
    (
      await supabase
        .from("classes")
        .insert({
          name: "Rootly Starter Class",
          description: "Small sample class for 3 students focusing on daily vocabulary practice.",
          teacher_id: teacherId,
        })
        .select()
        .single()
    ).data;

  const classId = classRecord?.id;
  if (!classId) {
    throw new Error("Could not create sample class.");
  }

  const sampleUserIds = [studentMinhId, studentLanId, studentQuangId];
  await supabase.from("quiz_attempts").delete().in("user_id", sampleUserIds);
  await supabase.from("study_sessions").delete().in("user_id", sampleUserIds);

  await supabase.from("class_members").upsert(
    [
      { class_id: classId, user_id: studentMinhId, role_in_class: "student" },
      { class_id: classId, user_id: studentLanId, role_in_class: "student" },
      { class_id: classId, user_id: studentQuangId, role_in_class: "student" },
    ],
    {
      onConflict: "class_id,user_id",
    },
  );

  const planPayload = [
    { user_id: studentMinhId, root_word_id: rootIds.get("spect"), scheduled_date: "2026-04-10", status: "planned", source: "manual" },
    { user_id: studentMinhId, root_word_id: rootIds.get("dict"), scheduled_date: "2026-04-08", status: "completed", source: "manual", completed_at: "2026-04-08T08:00:00Z" },
    { user_id: studentLanId, root_word_id: rootIds.get("port"), scheduled_date: "2026-04-10", status: "in_progress", source: "teacher_suggested" },
    { user_id: studentQuangId, root_word_id: rootIds.get("tract"), scheduled_date: "2026-04-09", status: "overdue", source: "manual" },
  ].filter((item) => item.root_word_id);

  await supabase.from("user_root_plans").upsert(planPayload, {
    onConflict: "user_id,root_word_id",
  });

  const reviewPayload = [
    { user_id: studentMinhId, root_word_id: rootIds.get("dict"), review_date: "2026-04-09", review_step: 1, status: "done", score: 1, completed_at: "2026-04-09T08:00:00Z" },
    { user_id: studentMinhId, root_word_id: rootIds.get("dict"), review_date: "2026-04-11", review_step: 2, status: "pending" },
    { user_id: studentLanId, root_word_id: rootIds.get("spect"), review_date: "2026-04-10", review_step: 1, status: "pending" },
    { user_id: studentQuangId, root_word_id: rootIds.get("port"), review_date: "2026-04-08", review_step: 1, status: "missed", score: 0 },
  ].filter((item) => item.root_word_id);

  await supabase.from("user_root_reviews").upsert(reviewPayload, {
    onConflict: "user_id,root_word_id,review_step",
  });

  await supabase.from("class_root_suggestions").upsert(
    [
      { class_id: classId, root_word_id: rootIds.get("spect"), suggested_date: "2026-04-10" },
      { class_id: classId, root_word_id: rootIds.get("port"), suggested_date: "2026-04-12" },
    ].filter((item) => item.root_word_id),
    {
      onConflict: "class_id,root_word_id,suggested_date",
    },
  );

  await supabase.from("study_sessions").insert([
    { user_id: studentMinhId, root_word_id: rootIds.get("dict"), session_type: "learn", session_date: "2026-04-08", duration_minutes: 12, result: { status: "completed" } },
    { user_id: studentMinhId, root_word_id: rootIds.get("dict"), session_type: "review", session_date: "2026-04-09", duration_minutes: 8, result: { remembered: true } },
    { user_id: studentLanId, root_word_id: rootIds.get("spect"), session_type: "learn", session_date: "2026-04-09", duration_minutes: 10, result: { status: "completed" } },
  ]);

  const { data: quizAttempt } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: studentMinhId,
      root_word_id: rootIds.get("spect"),
      score: 80,
      total_questions: 5,
      correct_answers: 4,
    })
    .select()
    .single();

  if (quizAttempt) {
    await supabase.from("quiz_answers").insert([
      {
        quiz_attempt_id: quizAttempt.id,
        question_type: "multiple_choice_meaning",
        prompt: 'Nghia gan nhat cua "inspect" la gi?',
        user_answer: "kiem tra ky",
        correct_answer: "kiem tra ky",
        is_correct: true,
      },
      {
        quiz_attempt_id: quizAttempt.id,
        question_type: "fill_in_blank",
        prompt: "Please _____ the package before signing for it.",
        user_answer: "inspect",
        correct_answer: "inspect",
        is_correct: true,
      },
    ]);
  }

  console.log("Seed complete.");
  console.table(
    users.map((user) => ({
      username: user.username,
      password: user.password,
      role: user.role,
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
