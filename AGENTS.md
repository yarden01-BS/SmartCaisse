# [AGENTS.md](http://AGENTS.md)

## Backend over

Smartcaisse is a cafteriat manager that manage employee subsidy of a company . Built with Python and JS, postgreSQL, and Docker.

## Tech Stack

- **Language:** Python / Javascript
- **Framework:** FastAPI / ReactJS
- **Database:** PostgreSQL via SQLalchemy
- **Tools:** Docker for containerization
- **Package manager:** uv / pnpm
- **Testing:** pytest / vitest

## Project Structure

```

SmartCaisse/
├── .vscode/                  # VS Code workspace settings and configurations
├── backend/                  # Backend application
│   ├── migrations/           # Database migration configuration and history
│   │   └── versions/         # Individual Alembic migration scripts
│   └── src/                  # Backend source code
│       ├── core/             # Core configuration, security and shared utilities
│       ├── db/               # Database engine, session management and ORM models
│       ├── modules/          # Business domain modules
│       │   ├── admin/        # Administrator-related functionality
│       │   └── caissiere/    # Cashier-related functionality
│       └── tests/            # Backend automated tests
└── temp/                     # Temporary files and development artifacts
```

## Code Style & Conventions

- Follow the existing patterns in the surrounding code.
- For variable file naming conventions follow the PEP conventions

## Testing Guidelines

- Write tests for all new features and bug fixes.
- Place tests in [location/naming pattern, e.g. `*.test.ts` next to source].
- Run the relevant tests after making changes and confirm they pass before finishing.
- Do not delete or weaken existing tests to make them pass.

## Git & Workflow

- Branch naming: `[feature/short-description]`
- Commit messages: [e.g. Conventional Commits: `feat:`, `fix:`, `chore:`]
- Do **not** commit or push unless explicitly asked.
- Keep changes focused; avoid unrelated refactors.

## Boundaries

### Always

- Read relevant files before editing them.
- Run lint, type check, and tests after changes.
- Ask for clarification when requirements are ambiguous.

### Ask first

- Adding or upgrading dependencies.
- Changing database schemas or migrations.
- Modifying CI/CD, build config, or infrastructure files.

### Never

- Commit secrets, API keys, or `.env` files.
- Edit generated files or vendored code (`[dist/, node_modules/, generated/]`).
- Run destructive commands (e.g. `rm -rf`, `git reset --hard`, dropping databases).

## Architecture Notes

- [e.g. All database access goes through `src/services/`; never query from components.]
- [e.g. Auth is handled by middleware in `src/middleware.ts`.]
- [e.g. Feature flags live in `config/flags.ts`.]

## Environment & Setup

- Copy `.env.example` to `.env` and fill in: `[VAR_ONE]`, `[VAR_TWO]`.
- Required services: [e.g. Postgres on port 5432, Redis].
- Node/Python version: [e.g. see `.nvmrc`].

## External References

- For API conventions, read `docs/api-guidelines.md` when working on route handlers.
- For design tokens and UI rules, read `docs/design-system.md` when editing components.
- For database details, read `docs/schema.md` before touching models.

## Known Issues & Gotchas

- [e.g. Test X is flaky on CI; rerun before assuming a real failure.]
- [e.g. The legacy `/v1` endpoints are deprecated; don't extend them.]
