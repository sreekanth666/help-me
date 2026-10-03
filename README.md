# Help Me

A digital toolkit of small, independent apps (starting with an Expense Manager), built as an
Nx monorepo: a Next.js app shell in `apps/`, with the logic and the shared design system
(`@helpme/ui`) in `libs/`. Architecture and conventions are documented in
[`CLAUDE.md`](./CLAUDE.md).

## Getting started

Requires Node 22+ and pnpm (the version is pinned in `package.json`; `corepack enable` picks
it up automatically).

```sh
pnpm install
pnpm dev          # helpme-shell on http://localhost:3000
```

| Command          | What it does                              |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Run the shell in dev mode                 |
| `pnpm build`     | Build every project                       |
| `pnpm lint`      | Lint, including Nx module boundaries      |
| `pnpm test`      | Run Vitest once across all projects       |
| `pnpm e2e`       | Run Playwright end-to-end tests           |
| `pnpm check`     | Lint, test and build: what CI runs        |

Any single task: `pnpm nx <target> <project>`, e.g. `pnpm nx build helpme-shell`.
`pnpm nx graph` shows how projects depend on each other.

## Design system

`@helpme/ui` is shadcn/ui on Base UI, themed from shadcn preset `b5KcQGecC`
(Luma style, Mist neutrals, Sky accent, Geist). Add components from the repo root:

```sh
pnpm dlx shadcn@latest add <component> -c .
```

and import them per file: `import { Button } from '@helpme/ui/components/ui/button'`.

## CI

`.github/workflows/ci.yml` runs lint, test and build for the projects affected by each push
to `main` and each pull request.

## Deploy (Vercel, Hobby plan)

`apps/helpme-shell/vercel.json` holds the build settings. One-time setup in the Vercel
dashboard:

1. **Add New → Project**, then import the `help-me` GitHub repository.
2. **Root Directory:** `apps/helpme-shell`. Leave "Include files outside the root directory"
   enabled (the default), because the app builds from shared `libs/`.
3. **Framework Preset:** Next.js (auto-detected). **Node.js Version:** 22.x
   (Settings → Build and Deployment).
4. Leave the install and build commands at their defaults; `vercel.json` overrides them.
5. Click **Deploy**.

After that, every push to `main` deploys to production and every pull request gets a preview
URL. Commits that touch nothing the shell depends on are skipped by `ignoreCommand`, which
saves build minutes.

Hobby plan limits: personal, non-commercial use only, with a single member and no team.
