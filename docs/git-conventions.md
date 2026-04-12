# Git Conventions

## Branch naming

Format:

```text
(feat|fix|refactor|chore|docs)/nuicoder/[ten-ngan-gon-tong-quat]
```

Rules:

- Chỉ dùng một trong các prefix: `feat`, `fix`, `refactor`, `chore`, `docs`
- Phần giữa luôn là `nuicoder`
- Phần cuối viết ngắn gọn, tổng quát, dùng chữ thường và ngăn cách bằng dấu `-`
- Không dùng khoảng trắng, ký tự đặc biệt, hoặc mô tả quá chi tiết

Valid examples:

- `feat/nuicoder/calendar-completion-status`
- `fix/nuicoder/library-vietnamese-encoding`
- `refactor/nuicoder/quiz-submit-flow`
- `chore/nuicoder/update-test-setup`
- `docs/nuicoder/git-conventions`

Invalid examples:

- `feature/nuicoder/calendar-completion-status`
- `fix/calendar-completion-status`
- `feat/nuicoder/calendar completion status`
- `feat/nuicoder/fix-calendar-and-review-and-quiz-and-library`

## Commit message

Format:

```text
(feat|fix|refactor|chore|docs): [message commit]
```

Rules:

- Chỉ dùng một trong các prefix: `feat`, `fix`, `refactor`, `chore`, `docs`
- Sau prefix dùng dấu `:`
- Nội dung commit ngắn gọn, mô tả đúng thay đổi chính
- Tổng độ dài toàn bộ commit message không quá `100` ký tự
- Không thêm nhiều ý không liên quan trong cùng một commit message

Valid examples:

- `feat: update calendar completion states after quiz submit`
- `fix: resolve vietnamese encoding in library detail page`
- `refactor: simplify study plan completion flow`
- `chore: update vitest coverage for calendar flow`
- `docs: add git branch and commit naming conventions`

Invalid examples:

- `feature: update calendar completion states`
- `fix update calendar completion states`
- `feat : update calendar completion states`
- `feat: update calendar completion states after quiz submit and sync review items for weekly calendar page`

## Prefix guide

- `feat`: thêm tính năng mới
- `fix`: sửa lỗi
- `refactor`: đổi cấu trúc code nhưng không đổi behavior chính
- `chore`: việc kỹ thuật, config, tooling, test setup
- `docs`: cập nhật tài liệu
