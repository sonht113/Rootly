# Rootly

Rootly là ứng dụng học từ vựng tiếng Anh qua root words, hướng tới người học cá nhân và lớp học nhỏ. Dự án hiện có các luồng chính cho học root words, lên lịch học và review, quiz, bảng xếp hạng, quản lý lớp học, và import nội dung cho admin/teacher.

## Tính năng chính

- Học từ vựng theo root words với nội dung song ngữ và phân loại cấp độ.
- Lên lịch học, spaced review, theo dõi tiến độ học tập.
- Làm quiz cho root words và lưu kết quả.
- Bảng xếp hạng học tập theo thời gian, metric và phạm vi lớp/toàn cục.
- Quản lý lớp học cho teacher/admin.
- Import dữ liệu root words từ CSV, XLSX, JSON.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript strict mode
- Tailwind CSS 4
- Bộ UI theo hướng shadcn/ui + Radix primitives
- Supabase Auth + Postgres
- React Hook Form + Zod
- TanStack Query cho một số luồng client-side
- Recharts
- date-fns
- lucide-react

## Cấu trúc dự án

```text
rootlearn-app/
  src/
    app/                  # route segments, layouts, pages
    components/           # UI primitives và shared layout components
    features/             # module nghiệp vụ theo từng màn hình/chức năng
    lib/                  # helper, validations, supabase client utilities
    server/               # repository layer và server-side data access
    types/                # domain types dùng chung
  public/templates/       # file mẫu cho import root words
  scripts/                # seed và utility scripts
  supabase/migrations/    # migration SQL cho database
  tests/                  # unit, integration, e2e setup
```

## Yêu cầu môi trường

- Node.js và npm tương thích với Next.js 16
- Một project Supabase để chạy Auth + Postgres

## Cài đặt và chạy local

1. Clone repo và chuyển vào thư mục app:

```powershell
cd D:\Work\rootly\rootlearn-app
```

2. Tạo file `.env.local` từ `.env.example`.

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux:

```bash
cp .env.example .env.local
```

3. Điền các biến môi trường cần thiết trong `.env.local`.

4. Cài dependency:

```bash
npm install
```

5. Chạy app:

```bash
npm run dev
```

App mặc định chạy tại [http://localhost:3000](http://localhost:3000).

## Biến môi trường

Các biến hiện có trong `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public anon key dùng cho client/SSR.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key, chỉ dùng phía server hoặc script nội bộ.
- `NEXT_PUBLIC_APP_URL`: base URL của app, mặc định local là `http://localhost:3000`.
- `SUPABASE_AVATAR_BUCKET`: tên bucket lưu avatar, mặc định là `avatars`.

Lưu ý:

- `SUPABASE_SERVICE_ROLE_KEY` không được đưa ra phía client.
- Thiếu các biến Supabase thì các luồng auth, SSR và script seed sẽ không hoạt động đúng.

## Thiết lập Supabase

1. Tạo Supabase project.
2. Cấu hình các biến môi trường trong `.env.local`.
3. Chạy đầy đủ migration trong `supabase/migrations`.

Danh sách migration hiện tại:

- `20260410190000_init_rootlearn.sql`
- `20260410230000_backfill_profiles_from_auth_users.sql`
- `20260411193000_extend_quiz_question_type.sql`
- `20260411194000_add_root_word_quiz_sets.sql`
- `20260411223000_add_ranking_insights_rpc.sql`
- `20260412120413_record_root_word_detail_view.sql`

Migration cuối cùng `20260411223000_add_ranking_insights_rpc.sql` là cần thiết để màn hình xếp hạng hoạt động đúng phần insight và activity comparison.

### Nếu dùng Supabase CLI

```bash
npx supabase db push
```

### Nếu dùng SQL Editor trên dashboard

1. Mở SQL Editor.
2. Chạy các file migration theo đúng thứ tự thời gian.
3. Chỉ chạy mỗi migration một lần.

### Khi nào cần chạy migration backfill

Nếu bạn đã có auth users trước khi migration init/backfill được áp dụng, hãy bảo đảm migration `20260410230000_backfill_profiles_from_auth_users.sql` đã được chạy để đồng bộ `public.profiles`.

## Seed dữ liệu mẫu

Seed script dùng để tạo dữ liệu dev/local, bao gồm:

- 1 admin
- 1 teacher
- 3 student
- 1 lớp học mẫu
- 5 nhóm root words
- study plans, reviews, study sessions, quiz attempts mẫu

Chạy seed:

```bash
npm run seed
```

Tài khoản mẫu sau khi seed:

- `admin.rootly` / `Rootly123`
- `teacher.son` / `Rootly123`
- `student.minh` / `Rootly123`
- `student.lan` / `Rootly123`
- `student.quang` / `Rootly123`

Nên chạy lại seed khi bạn vừa reset database dev hoặc muốn đưa dữ liệu mẫu về trạng thái chuẩn để test thủ công.

## Import dữ liệu root words

Định dạng hỗ trợ:

- CSV
- XLSX
- JSON

File mẫu:

- `public/templates/root-words.csv`
- `public/templates/root-words.json`

Luồng import trong app:

1. Truy cập `/admin/root-words`
2. Upload file ở panel import
3. Xem preview dữ liệu parse được
4. Kiểm tra dòng hợp lệ / không hợp lệ
5. Commit các root word groups hợp lệ

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run check:supabase
npm run test
npm run test:watch
npm run test:e2e
npm run seed
```

Ý nghĩa chính:

- `npm run dev`: chạy local development server.
- `npm run build`: build production bằng Next.js.
- `npm run start`: chạy app từ bản build production.
- `npm run lint`: chạy ESLint cho toàn bộ repo.
- `npm run check:supabase`: kiểm tra tình trạng dữ liệu liên quan Supabase, đặc biệt các user thiếu `public.profiles`.
- `npm run test`: chạy unit + integration tests bằng Vitest.
- `npm run test:watch`: chạy Vitest ở watch mode.
- `npm run test:e2e`: chạy Playwright end-to-end tests.
- `npm run seed`: tạo dữ liệu mẫu cho môi trường dev.

## Testing

Hiện tại repo có các lớp test chính:

- Unit tests cho auth mapping, review date offsets, quiz generation/scoring, import parsing, ranking streak semantics.
- Integration tests cho validation shape và một số luồng dữ liệu.
- E2E smoke tests cho login/register và các luồng trình duyệt cơ bản.

Chạy unit + integration tests:

```bash
npm run test
```

Chạy e2e:

```bash
npm run test:e2e
```

Lưu ý:

- Playwright config hiện tự bật app qua `npm run dev`.
- Playwright dùng `http://127.0.0.1:3000` làm `baseURL`.

## Ghi chú kỹ thuật

- Auth đang đi theo hướng username-first, nhưng vẫn dùng hidden internal email để tương thích với Supabase Auth.
- Các route group cần session/env được render động để phù hợp với SSR và Supabase session.
- Avatar fallback hiện tại dùng initials của username.
- `npm run check:supabase` hữu ích khi nghi ngờ auth user chưa có bản ghi trong `public.profiles`.

## Luồng dev gợi ý

Khi onboarding hoặc reset môi trường local, thứ tự làm việc an toàn là:

1. Tạo `.env.local`
2. Cài dependency bằng `npm install`
3. Chạy đầy đủ migration Supabase
4. Chạy `npm run seed` nếu cần dữ liệu mẫu
5. Chạy `npm run dev`
6. Chạy `npm run test` trước khi bắt đầu sửa những phần nhạy cảm
