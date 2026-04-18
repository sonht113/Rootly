# Git Conventions

This document defines the Git naming rules that the project should follow before pushing code.

## Branch Format

Use this format for every branch:

```text
[feat|fix|refactor|chore|docs]/member-name/title
```

Rules:

- The first segment must be exactly one of: `feat`, `fix`, `refactor`, `chore`, `docs`
- The `member-name` segment must be the contributor name in lowercase kebab-case
- The `title` segment must be a short lowercase kebab-case summary of the work
- Do not use spaces, uppercase letters, underscores, or special characters
- Keep the branch title short and focused on one scope

Valid examples:

- `feat/minh-nguyen/class-lesson-import`
- `fix/anh-tran/vietnamese-encoding`
- `refactor/linh-pham/notification-realtime-flow`
- `chore/tuan-le/update-test-config`
- `docs/ha-do/git-conventions`

Invalid examples:

- `feature/minh-nguyen/class-lesson-import`
- `feat/class-lesson-import`
- `feat/minh_nguyen/class-lesson-import`
- `feat/minh-nguyen/ClassLessonImport`
- `feat/minh-nguyen/class lesson import`

## Commit Format

Use this format for every commit:

```text
[feat|fix|refactor|chore|docs]: [message-commit]
```

Rules:

- The prefix must be exactly one of: `feat`, `fix`, `refactor`, `chore`, `docs`
- Use exactly one colon after the prefix, followed by one space
- The commit message must be short, clear, and describe the main change
- Keep one commit focused on one logical change
- Avoid overly long commit messages and avoid mixing unrelated changes in the same commit

Valid examples:

- `feat: add class lesson csv import flow`
- `fix: resolve vietnamese encoding in lesson content`
- `refactor: simplify notification realtime sync`
- `chore: update test coverage for admin users`
- `docs: add git branch and commit rules`

Invalid examples:

- `feature: add class lesson csv import flow`
- `feat add class lesson csv import flow`
- `feat : add class lesson csv import flow`
- `feat:add class lesson csv import flow`

## Prefix Meaning

- `feat`: add a new feature
- `fix`: fix a bug
- `refactor`: improve structure without changing the main behavior
- `chore`: tooling, config, maintenance, or non-feature technical work
- `docs`: documentation updates only

## Push Checklist

Before pushing code:

- Make sure the branch name matches the required branch format
- Make sure every commit message matches the required commit format
- Keep branch scope and commit scope aligned
- Confirm there are no unrelated changes in the push
