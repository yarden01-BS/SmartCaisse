# Backend

Backend application for SmartCaisse, responsible for business logic, database operations, authentication, and API endpoints.

```
## Project Structure

```text
backend/
├── migrations/
│   └── versions/
└── src/
    ├── core/
    ├── db/
    ├── modules/
    │   ├── admin/
    │   └── caissiere/
    └── tests/
```

### Directories

| Directory | Description |
|---|---|
| `migrations/` | Database migration configuration and migration history managed by Alembic. |
| `migrations/versions/` | Contains individual database migration scripts. |
| `src/` | Contains the backend application source code. |
| `src/core/` | Core application configuration, shared utilities, security, and common functionality. |
| `src/db/` | Database configuration, connection management, SQLAlchemy models, and database-related utilities. |
| `src/modules/` | Contains application modules organized around business domains. |
| `src/modules/admin/` | Functionality and business logic related to administrators. |
| `src/modules/caissiere/` | Functionality and business logic related to cashiers. |
| `src/tests/` | Backend automated tests. |

### Module Structure

Each module follows a consistent naming convention. Files are prefixed with the corresponding entity or domain name to make their responsibilities explicit.

| Naming Convention | Responsibility |
|---|---|
| `{entity}_router.py` | API endpoints and HTTP request handling. |
| `{entity}_schemas.py` | Pydantic schemas for validation and serialization. |
| `{entity}_service.py` | Business logic and application operations. |
| `{entity}_repo.py` | Database queries and persistence operations. |

Each module maintains its own separation of concerns, keeping routing, validation, business logic, and database access independent.

## Architecture

The backend follows a modular architecture, organizing application functionality by business domain.

Each module is responsible for its own features and business logic, while shared functionality is centralized in `core/` and database-related functionality in `db/`.

## Database

Database operations are handled using SQLAlchemy with asynchronous support.
Alembic is used to manage database schema migrations.
Docker is used to containerize the database.


## 11. Startup Commands

Run all commands from the `backend` folder. This project uses `uv` for dependency management.

### First-time setup

```bash
# 1. Install dependencies (creates the .venv automatically)
uv sync

# 2. Create your .env file from the example (never commit it)
cp .env.example .env
```

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

Always review the generated file in `alembic/versions/` before running `alembic upgrade head`.

### Run the app (FastAPI)

```bash
# Development (auto-reload on code changes)
uv run uvicorn app.main:app --reload

# Production
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
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

Never use `pip install` in this project. Always use `uv add` so that `pyproject.toml` and `uv.lock` stay in sync.

### Typical workflow

1. Change a model.
2. `uv run alembic revision --autogenerate -m "message"`
3. Review the migration file.
4. `uv run alembic upgrade head`
5. `uv run uvicorn app.main:app --reload`