# Design: shadcn/ui as the Help Me shared design system

Date: 2026-08-04
Status: Approved

## Problem

Help Me is specified in `CLAUDE.md` as an Nx monorepo hosting many micro-frontends that must look
identical (rule 4: all micro-frontends rely on `@helpme/ui`). Nothing existed yet — the repository
held only `CLAUDE.md` and two empty directories. There was no workspace, no application, and
therefore nothing for a component library to attach to.

Three conflicts had to be resolved before any tooling could run:

1. shadcn's official monorepo initialiser generates a **Turborepo**. `CLAUDE.md` mandates **Nx**.
2. `CLAUDE.md` documents `libs/` for shared code; the directory on disk was `packages/`, which is
   shadcn's convention rather than Nx's.
3. `CLAUDE.md` requires a **single root `package.json`**, which is incompatible with pnpm workspaces.

## Goals

- A working Nx workspace using pnpm exclusively.
- A shared design system at `libs/shared/ui`, importable as `@helpme/ui`, holding every shadcn
  component plus the theme tokens.
- One Next.js host application (`helpme-shell`) that consumes the library and proves the wiring.
- Light/dark theming defined once and inherited by every future micro-frontend.
- Module boundaries enforced by lint, not convention.

## Non-goals

The `expense-manager` and `budgeting` micro-frontends, Module Federation host wiring, the `api`
backend and its DDD modules, `libs/shared/auth`, `libs/shared/utils`, and CI. Each is a separate
brainstorm → spec → plan cycle.

## Decisions

| Area | Decision | Rationale |
|---|---|---|
| Build system | Nx, shadcn wired manually | `CLAUDE.md` is the authority; a generator must not redefine the architecture |
| Workspace style | Integrated (`--workspaces=false --useProjectJson`) | Honours the single-dependency-list rule |
| Shared code location | `libs/shared/ui`, alias `@helpme/ui` | Nx convention and `CLAUDE.md`; `packages/` deleted |
| Library bundler | `none` — consumed as TS source | No build step, no stale `dist`, and Tailwind can scan real sources |
| Theme | `new-york`, `neutral`, CSS variables, lucide | shadcn defaults; `style`/`baseColor`/`cssVariables` are immutable after init |
| Dark mode | `next-themes` provider exported from `@helpme/ui` | Defined once, inherited everywhere |
| Components | All 62 `registry:ui` items | User's explicit choice; nothing to add later |
| Testing | Vitest (unit), Playwright (e2e) | ESM-native, fits React 19 / Tailwind v4 |

## Architecture

`@helpme/ui` is the single source of truth for both tokens and components:

```text
libs/shared/ui/src/
├── styles/globals.css     # @theme tokens, :root + .dark   <-- the only place colours are defined
├── lib/utils.ts           # cn()
├── hooks/
└── components/
    ├── ui/                # 62 shadcn primitives
    ├── theme-provider.tsx
    └── mode-toggle.tsx
```

Applications are thin (`CLAUDE.md` rule 1). `helpme-shell` contributes only a root layout that
mounts `ThemeProvider`, and a CSS entry point that imports the library's stylesheet.

Two `components.json` files exist. The library's places new primitives in `src/components/ui`. The
app's points its `ui` alias at `@helpme/ui/components/ui`, so an app-level `shadcn add` reuses the
shared primitives rather than duplicating them.

### Interfaces

- **Consumers** import per-file: `import { Button } from '@helpme/ui/components/ui/button'`, backed
  by a `@helpme/ui/*` subpath mapping in `tsconfig.base.json`.
- **Theme contract**: consumers use semantic classes (`bg-background`, `text-primary-foreground`)
  and never raw colours, so re-theming touches one file.
- **Dependency direction**: apps → libs, never the reverse; enforced by
  `@nx/enforce-module-boundaries` tags (`type:app` may use `type:ui`; `scope:shared` may only depend
  on `scope:shared`).

### The critical failure mode

Tailwind v4 scans only the importing project. Without an explicit `@source` directive pointing at
`libs/shared/ui/src`, every utility class used inside the library is tree-shaken away and components
render unstyled while the build still succeeds. The shell's CSS therefore declares that source path,
and verification explicitly checks for styled output rather than merely a passing build.

## Verification

Lint, unit tests and typecheck across all projects; a production build of `helpme-shell` (which
surfaces missing `"use client"` directives among the 62 components); a dev-server check confirming
components render *styled*, the Dialog opens, a Sonner toast fires, and dark mode toggles without
hydration warnings; `nx graph` showing a single `helpme-shell → shared-ui` edge; a deliberate deep
import proving lint fails; and a repeat `shadcn add` proving the workflow is repeatable.

## Risks

The shadcn CLI is Nx-unaware and assumes `apps/web` + `packages/ui`, so generated files may need
relocating and import specifiers rewriting — mitigated by committing before running it. Installing
all 62 components pulls roughly 40 transitive packages. Next.js 16 with Nx 23 and React 19 is a
recent combination; if `@nx/next` lags, Next is pinned to the version the plugin expects.
