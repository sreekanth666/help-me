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
│   ├── helpme-shell/              # The Next.js App Shell (Host); vercel.json = deploy config
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
│   ├── kseb/                      # KSEB bill calculator (scope:kseb), mounted at /kseb
│   │   ├── domain/                # @helpme/kseb-domain — pure TS tariff engine + tests
│   │   └── feature-calculator/    # @helpme/kseb-feature-calculator — React UI
│   ├── converter/                 # Media converter (scope:converter), mounted at /converter
│   │   ├── domain/                # @helpme/converter-domain — pure TS: sniffing, options, plan, queue
│   │   ├── engine/                # @helpme/converter-engine — Web Worker + mediabunny / WebP wasm
│   │   └── feature-converter/     # @helpme/converter-feature-converter — React UI
│   ├── markdown/                  # Markdown to Word (scope:markdown), mounted at /markdown-to-word
│   │   ├── domain/                # @helpme/markdown-domain — pure TS: Markdown → Word-ready HTML (markdown-it)
│   │   └── feature-markdown-to-word/ # @helpme/markdown-feature-markdown-to-word — React UI, clipboard copy
│   │
│   └── backend-modules/           # (planned) DDD modules for the API
│       ├── expenses/              # Database models, services for expenses
│       ├── budgets/               # Database models, services for budgets
│       └── users/                 # User profiles and authentication logic
│
├── .github/workflows/ci.yml       # Lint/test/build affected projects on push & PR
├── docs/superpowers/specs/        # Design specs, one per work cycle
├── tools/                         # (planned) Custom scripts (e.g. migrations)
├── components.json                # shadcn config (must live at the repo root)
├── nx.json                        # Monorepo configuration and caching rules
├── package.json                   # Single dependency list for the whole ecosystem
├── pnpm-workspace.yaml            # pnpm settings + build-script allowlist
└── tsconfig.base.json             # Base TypeScript paths (e.g. @helpme/ui)
```

There is no `packages/` directory — shared code lives in `libs/`.

### Adding a new app: route-per-app on one domain

Every user-facing tool (KSEB, image converter, …) is a **route inside `helpme-shell`**, not a
separate deployment or domain. The whole suite is served from one base URL
(`settaakkam.vercel.app`), e.g. `/kseb`, `/image-converter`.

`/kseb` is the reference implementation. To add an app `<name>`:

1. Create `libs/<name>/domain` (pure TS logic + tests) and `libs/<name>/feature-<x>` (React UI),
   imported as `@helpme/<name>-domain` / `@helpme/<name>-feature-<x>`.
2. Tag both projects in `project.json` with `scope:<name>` and a `type:` tag, and add the new
   scope to the constraints in `eslint.config.mjs`.
3. Add `apps/helpme-shell/src/app/<name>/page.tsx`: export `metadata` (title suffix
   ` · Help Me`) and render the feature component. Nothing else belongs in the page.
4. Add an e2e spec in `apps/helpme-shell-e2e` for the new route, and register the app in
   `apps/helpme-shell/src/app/apps.ts`.
5. Add an `@source` line for the feature lib in `apps/helpme-shell/src/app/global.css`, or its
   Tailwind classes are never generated and the page renders unstyled.

Notes:

* One Vercel project, one deploy. `nx-ignore` and Nx affected builds limit unrelated work.
* Next.js splits bundles per route. Load heavy client-side work (e.g. image processing) with
  `next/dynamic` inside its own route so other apps don't pay for it.
* `/` is the landing page. Register each new app in `apps/helpme-shell/src/app/apps.ts` so it
  gets a card there. The design-system smoke test lives at `/design-system`.
* Only move an app to **Multi-Zones** (shell proxies `/<name>/*` to a separate Vercel project,
  still the same domain) if it must deploy independently. The libs stay unchanged, so this is a
  cheap later move. Do not introduce separate domains or subdomains.

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

Built on **shadcn/ui** with **Base UI** primitives, from shadcn preset **`b5KcQGecC`**:
`base-luma` style, `mist` base colour, `sky` theme + chart colours, **Geist** font, lucide
icons, pointer cursor on buttons, Tailwind v4.

* **Re-applying or changing the preset.** `shadcn init`/`apply` refuse to run here (no
  framework at the root). Instead, scaffold a throwaway reference app outside the repo with
  `pnpm dlx shadcn@latest init --preset <code> --template next --pointer -n ref`, then copy:
  `style` / `baseColor` / `menu*` into `components.json`; the `:root`, `.dark` and
  `@theme inline` blocks into `globals.css`; then run
  `pnpm dlx shadcn@latest add --all --overwrite -c .`.

* **Fonts** are loaded by each app with `next/font` onto the `--font-sans` / `--font-mono`
  variables (see `apps/helpme-shell/src/app/layout.tsx`); the library maps them to tokens.

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