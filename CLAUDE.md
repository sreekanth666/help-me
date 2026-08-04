# Help Me (Application) - Architecture Context

## 1. Project Overview
**Help Me** is a digital toolkit containing multiple independent applications under a unified ecosystem. The initial application is an Expense Manager designed for separate budget handling (e.g., company trip vs. personal, overall monthly budgets, rollover features). The architecture is designed to be highly scalable, production-ready, and strictly adhere to industry standards to support many future applications.

## 2. Architecture Patterns
* **Repository Strategy:** **Enterprise Monorepo** managed via **Nx Workspace**.
* **Frontend Architecture:** **App Shell Pattern (Micro-Frontends)**.
  * Utilizes Webpack Module Federation or Next.js Multi-Zones.
  * A central host shell manages routing and auth; individual apps (like Expense Manager) are injected at runtime.
* **Backend Architecture:** **Modular Monolith** applying **Domain-Driven Design (DDD)**.
  * A single deployable backend, but internally separated by strict domain boundaries.

## 3. Folder Structure (Nx Workspace)

Entries marked *(planned)* do not exist yet.

```text
help-me/
├── apps/                          # Deployable applications (Frontends & Backend)
│   ├── helpme-shell/              # The Next.js App Shell (Host)
│   ├── helpme-shell-e2e/          # Playwright e2e suite for the shell
│   ├── expense-manager/           # (planned) Micro-frontend: Expense App
│   ├── budgeting/                 # (planned) Micro-frontend: Budgeting App
│   └── api/                       # (planned) Node.js Backend Server
│
├── libs/                          # The actual logic (Shared & Isolated)
│   ├── shared/                    # Code shared across multiple apps
│   │   ├── ui/                    # Design System — @helpme/ui (shadcn)
│   │   ├── auth/                  # (planned) Login hooks, token management
│   │   └── utils/                 # (planned) Date formatters, currency logic
│   │
│   └── backend-modules/           # (planned) DDD modules for the API
│       ├── expenses/              # Database models, services for expenses
│       ├── budgets/               # Database models, services for budgets
│       └── users/                 # User profiles and authentication logic
│
├── docs/superpowers/specs/        # Design specs, one per work cycle
├── tools/                         # (planned) Custom scripts (e.g. migrations)
├── components.json                # shadcn config (must live at the repo root)
├── nx.json                        # Monorepo configuration and caching rules
├── package.json                   # Single dependency list for the whole ecosystem
├── pnpm-workspace.yaml            # pnpm settings + build-script allowlist
└── tsconfig.base.json             # Base TypeScript paths (e.g. @helpme/ui)
```

There is no `packages/` directory — shared code lives in `libs/`.

## 4. Architectural Rules & Constraints

1. **Thin Applications:** The `apps/` directories act strictly as routing and assembly layers ("glue code"). 90% of business logic and UI components must reside in the `libs/` directory.
2. **Domain Isolation:** Modules inside `libs/backend-modules/` are strictly bounded. They must not share database tables. Cross-domain communication must happen via internal APIs or event emitters (e.g., `expenses` domain cannot directly query `users` database tables).
3. **Strict Boundaries:** Enforce Nx module boundary linting rules to prevent circular dependencies or deep imports across independent micro-apps.
4. **Shared UI:** All micro-frontends must rely on the `@helpme/ui` package to guarantee visual consistency across the entire suite.

## 5. Tooling Rules

* **pnpm only.** Never run `npm install` or `yarn`. The only lockfile is `pnpm-lock.yaml`.
  pnpm blocks dependency build scripts by default; approve them explicitly in
  `pnpm-workspace.yaml` under `allowBuilds` rather than disabling the check.
* **Single dependency list.** This is an Nx *integrated* monorepo: one root
  `package.json`, and each project configured by its own `project.json`. Do not add
  per-project `package.json` files or pnpm workspace packages.
* **Module boundaries.** Every project carries a `scope:` tag and a `type:` tag in its
  `project.json`. The constraints live in the root `eslint.config.mjs`. Tag new projects
  on creation, or they are effectively unconstrained.

## 6. Design System (`@helpme/ui`)

Built on **shadcn/ui** with **Base UI** primitives (`base-nova` style, `neutral` base colour,
lucide icons, Tailwind v4).

* **Add components from the repo root**, never from inside the library:

  ```bash
  pnpm dlx shadcn@latest add <component> -c .
  ```

  `components.json` sits at the root because the shadcn CLI requires a `package.json` in its
  working directory, which an integrated Nx monorepo only has there. Its aliases point at
  `@helpme/ui/*`, so generated files still land in `libs/shared/ui/src` and new dependencies
  go into the single root `package.json`.

* **Import per file**, not from a barrel — a barrel over 60+ components would pull the whole
  library into any consumer's client bundle:

  ```ts
  import { Button } from '@helpme/ui/components/ui/button';
  ```

* **Tokens are defined once**, in `libs/shared/ui/src/styles/globals.css`. Apps import that
  file and add nothing of their own. Use semantic classes (`bg-background`,
  `text-muted-foreground`); never hard-code colours.

* **Tailwind v4 scans only the importing project.** The library's stylesheet declares its own
  `@source`, so consumers inherit its classes automatically. If components ever render
  unstyled, that directive is the first thing to check.

* Apps import the stylesheet by **relative path**, not the `@helpme/ui` alias: PostCSS
  resolves CSS `@import` through `node_modules` and never sees TypeScript path mappings.

* Components are upstream shadcn output and are **left unmodified**, so future `shadcn add`
  runs diff cleanly. Two upstream lint warnings are tolerated for this reason.