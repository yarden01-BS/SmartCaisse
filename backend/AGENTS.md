# Backend Agent Instructions

Instructions for any agent or developer working on the backend. Read this file before making changes.

---

## 1. General Rules

- Always inspect existing code before implementing changes.
- Follow the existing project architecture and coding conventions.
- Prefer simple, maintainable solutions.
- Avoid unnecessary abstractions, dependencies, and duplicated code.
- Do not rewrite unrelated code.
- Do not assume a file's implementation; inspect it first.
- Ask for clarification when requirements or architectural decisions are ambiguous.

---

## 2. Architecture

- Follow the existing modular architecture.
- Read the `README.md` file in the backend folder to understand the folder architecture efficiently.
- Reuse shared functionality instead of duplicating it across modules.
- Avoid mixing responsibilities between layers.

| Layer | Responsibility |
|---|---|
| Router | HTTP request handling |
| Service | Business logic |
| Repository | Database queries |
| Schemas | Pydantic request validation and response serialization |

---

## 3. Naming Conventions

- Use `snake_case` for files, functions, variables, and modules.
- Use `PascalCase` for classes.
- Use descriptive names consistent with existing code.

Entity-specific filenames:

| Layer | Filename |
|---|---|
| Router | `{entity}_router.py` |
| Schemas | `{entity}_schemas.py` |
| Service | `{entity}_service.py` |
| Repository | `{entity}_repo.py` |

---

## 4. Python and FastAPI

- Use type annotations consistently.
- Use asynchronous functions for asynchronous operations.
- Prefer dependency injection for shared resources.
- Follow existing FastAPI routing and dependency patterns.
- Avoid synchronous operations inside asynchronous request handlers.

---

## 5. SQLAlchemy and Database

- Use SQLAlchemy 2.0-style ORM mappings.
- Use asynchronous database sessions.
- Prefer `Mapped` and `mapped_column` for ORM models.
- Use `relationship()` for ORM relationships.
- Keep session management centralized.
- Use Alembic for all database schema changes.
- Never use `Base.metadata.create_all()` as a replacement for migrations.
- Inspect existing models and relationships before modifying the database.

---

## 6. Error Handling

- Handle errors at the appropriate architectural layer.
- Keep business validation in the service layer.
- Use appropriate HTTP status codes.
- Never expose internal exceptions, credentials, or sensitive database details to API clients.
- Handle expected database constraint violations appropriately.

---

## 7. Testing

- Write tests for new features and important business logic.
- Follow existing testing conventions.
- Use isolated test database sessions.
- Do not depend on production data.

---

## 8. Dependencies and Configuration

- Avoid adding dependencies unless necessary.
- Preserve existing dependency and configuration choices unless a change is required.
- Use environment variables for configuration and secrets.
- Never hardcode credentials or connection strings.
- Never commit `.env` files.
- Use `uv` for dependency management. Never use `pip install`.

---

## 9. Implementation Guidelines

### Before implementing a feature

1. Inspect the relevant module.
2. Understand its existing implementation.
3. Identify which architectural layers need changes.
4. Reuse existing patterns.
5. Implement only what is necessary.

### After implementing a feature

- Check for type errors and obvious issues.
- Run relevant tests when possible.
- Verify that existing functionality remains intact.
- Report important changes and any remaining issues.

---

## 10. Priority Rule

> **Existing project conventions take priority over generic best practices or personal preferences.**

- Do not introduce a new pattern simply because it is an alternative.
- Maintain consistency across the codebase.
- Keep the code simple, clear, and readable for a beginner.

---

## 11. Startup Commands

Run the database commands from the repository root, then all Python commands from the `backend` folder.

### First-time setup

```bash
# From the repository root: copy the example config to the root .env (never commit it)
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env

# Start PostgreSQL and wait until the db service is healthy
docker compose up -d
docker compose ps

# From backend/: install dependencies (creates backend/.venv automatically)
cd backend
uv sync

# Create the schema and add development data once on a fresh database
uv run alembic upgrade head
uv run python -m src.seed
```

`uv run` automatically uses `backend/.venv`; activating it manually is optional.

### Database migrations (Alembic)

```bash
# Apply all migrations (run this before starting the app)
uv run alembic upgrade head

# Create a new migration after changing a model
uv run alembic revision --autogenerate -m "describe the change"

# Undo the last migration
uv run alembic downgrade -1

# Show the current migration version
uv run alembic current
```

Always review the generated file in `migrations/versions/` before running `alembic upgrade head`.

### Run the app (FastAPI)

```bash
# Development (auto-reload on code changes)
uv run uvicorn src.main:app --reload

# Production
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### Run the tests

```bash
uv run pytest
```

### Manage dependencies

```bash
# Add a package
uv add package-name

# Add a development-only package (tests, linters)
uv add --dev package-name

# Remove a package
uv remove package-name
```

### Typical workflow

1. Change a model.
2. `uv run alembic revision --autogenerate -m "message"`
3. Review the migration file.
4. `uv run alembic upgrade head`
5. `uv run uvicorn src.main:app --reload`