# Error Log & Lessons Learned

> This file tracks mistakes made during development so they are not repeated.

## Project: Code Debugger / Roaster App
**Stack:** Next.js, Tailwind CSS, OpenAI API, Vercel

---

## Errors & Fixes

### Error #1 — npm naming restriction (capital letters)
- **When:** Project init
- **Error:** `Could not create a project called "Debugger" because of npm naming restrictions: name can no longer contain capital letters`
- **Fix:** Use `--yes` flag which auto-lowercases, OR explicitly name the project with lowercase in `package.json` after init. The real fix: create-next-app derives the project name from the folder. Solution is to just accept the default and rename in `package.json` afterward.

### Error #2 — `next build --no-lint` flag removed
- **When:** Verifying build
- **Error:** `error: unknown option '--no-lint'`
- **Fix:** Next.js 16 removed this flag. Just use `npx next build` without it.

### Error #3 — Template literal backtick escaping corruption
- **When:** Rewriting `lib/prompts.ts` with triple backticks inside template literals
- **Error:** `Parsing ecmascript source code failed — Expected unicode escape`
- **Fix:** Never escape backticks inside template literals during file creation. Instead, extract triple backticks into a `const codeBlock = "` `` ` `` `"` variable and interpolate it. This avoids escaping hell.

### Error #4 — OneDrive EPERM lock on .next cache
- **When:** Running `next build` after previous build
- **Error:** `EPERM: operation not permitted, unlink '.next/static/...'`
- **Fix:** OneDrive syncs `.next` files and locks them. Delete `.next` folder before rebuilding: `Remove-Item .next -Recurse -Force` then build.

---

## Rules to Follow
- Always wait for user's step-by-step instructions before proceeding.
- Don't assume — ask if unsure.
- Log every error and its fix here immediately.
- Review this file before starting each new step.
