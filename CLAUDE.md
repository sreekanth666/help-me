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
```text
help-me-workspace/
├── apps/                          # Deployable applications (Frontends & Backend)
│   ├── helpme-shell/              # The Next.js App Shell (Host)
│   ├── expense-manager/           # Micro-frontend: Expense App
│   ├── budgeting/                 # Micro-frontend: Future Budgeting App
│   └── api/                       # The Node.js Backend Server (Entry point)
│
├── libs/                          # The actual logic (Shared & Isolated)
│   ├── shared/                    # Code shared across multiple apps
│   │   ├── ui/                    # Design System (Buttons, Layouts, Modals)
│   │   ├── auth/                  # Login hooks, token management
│   │   └── utils/                 # Date formatters, currency logic
│   │
│   └── backend-modules/           # Domain-Driven Design (DDD) for the API
│       ├── expenses/              # Database models, services for expenses
│       ├── budgets/               # Database models, services for budgets
│       └── users/                 # User profiles and authentication logic
│
├── tools/                         # Custom scripts (e.g., database migrations)
├── nx.json                        # Monorepo configuration and caching rules
├── package.json                   # Single dependency list for the whole ecosystem
└── tsconfig.base.json             # Base TypeScript paths (e.g., @helpme/ui)

```

## 4. Architectural Rules & Constraints

1. **Thin Applications:** The `apps/` directories act strictly as routing and assembly layers ("glue code"). 90% of business logic and UI components must reside in the `libs/` directory.
2. **Domain Isolation:** Modules inside `libs/backend-modules/` are strictly bounded. They must not share database tables. Cross-domain communication must happen via internal APIs or event emitters (e.g., `expenses` domain cannot directly query `users` database tables).
3. **Strict Boundaries:** Enforce Nx module boundary linting rules to prevent circular dependencies or deep imports across independent micro-apps.
4. **Shared UI:** All micro-frontends must rely on the `@helpme/ui` package to guarantee visual consistency across the entire suite.