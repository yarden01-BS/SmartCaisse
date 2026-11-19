# Backend

Backend application for SmartCaisse, responsible for business logic, database operations, authentication, and API endpoints.

## Project Structure

```text
backend/
├── migrations/
│   └── versions/
└── src/
    ├── core/
    │   ├── config.py
    │   └── security.py
    ├── db/
    │   ├── database.py
    │   ├── session.py
    │   └── models.py
    ├── modules/
    │   ├── admin/
    │   ├── auth/
    │   └── users/
    ├── main.py
    ├── seed.py
    └── tests/
```

### Directories

| Directory | Description |
|---|---|
| `migrations/` | Database migration configuration and migration history managed by Alembic. |
| `migrations/versions/` | Contains individual database migration scripts. |
| `src/` | Contains the backend application source code. |
| `src/core/` | Core application configuration, shared utilities, and bcrypt/JWT security helpers. |
| `src/db/` | Database configuration, connection management, SQLAlchemy models, and database-related utilities. |
| `src/modules/` | Contains application modules organized around business domains. |
| `src/modules/admin/` | Functionality and business logic related to administrators. |
| `src/modules/auth/` | Login endpoint and the bearer-token dependencies shared with other modules. |
| `src/modules/users/` | Profile of the logged-in account, exposed through `GET /me`. |
| `src/main.py` | FastAPI application entry point; registers the routers. |
| `src/seed.py` | Inserts fake development data, including demo login accounts. |
| `src/tests/` | Backend automated tests. |

### Module Structure

Each module follows a consistent naming convention. Files are prefixed with the corresponding entity or domain name to make their responsibilities explicit.

| Naming Convention | Responsibility |
|---|---|
| `{entity}_router.py` | API endpoints and HTTP request handling. |
| `{entity}_schemas.py` | Pydantic schemas for validation and serialization. |
| `{entity}_service.py` | Business logic and application operations. |
| `{entity}_repo.py` | Database queries and persistence operations. |

Each module maintains its own separation of concerns, keeping routing, validation, business logic, and database access independent. The auth module also contains `auth_deps.py`, which holds the token-validation dependencies reused by other modules.

## Architecture

The backend follows a modular architecture, organizing application functionality by business domain.

Each module is responsible for its own features and business logic, while shared functionality is centralized in `core/` and database-related functionality in `db/`.

## Authentication

Admin and cashier accounts authenticate through the same endpoints. Passwords are hashed with bcrypt and access tokens are signed JWTs (HS256). On successful login the token is stored in an `HttpOnly` cookie named `access_token`, so the browser sends it automatically. It is never returned in the response body.

### 1. Log in

`POST /auth/login`

```json
{
  "email": "donaldgarcia@example.net",
  "password": "password123"
}
```

Successful response (`200`):

```json
{
  "token_type": "bearer",
  "account_id": 1,
  "role": "admin"
}
```

The JWT itself is only in the `Set-Cookie` header.

An unknown email, wrong password, or inactive account returns `401` with `{"detail": "Invalid email or password"}` and no cookie is set.

The cookie uses `HttpOnly`, `SameSite=Lax`, and `Path=/`. `Secure` is controlled by `COOKIE_SECURE`; it is `false` in local development and should be `true` in HTTPS production.

### 2. Read the logged-in user

`GET /me` — uses the `access_token` cookie set at login. An `Authorization: Bearer <access_token>` header is also accepted as a fallback for clients that cannot use cookies.

The account id comes from the token's `sub` claim, never from the request body, so this always returns the profile of the authenticated account.

Response (`200`) for an admin account:

```json
{
  "account_id": 1,
  "email": "donaldgarcia@example.net",
  "role": "admin",
  "is_active": true,
  "profile": {
    "id": 3,
    "first_name": "Danielle",
    "last_name": "Johnson",
    "profession": "Haematologist",
    "situation": "permanent",
    "is_active": true
  }
}
```

For a cashier account, `profile` instead contains `id`, `first_name`, `last_name`, `company`, and `is_active`. A missing or invalid token, or an account that no longer exists or is inactive, returns `401`.

### 3. Log out

`POST /auth/logout` clears the cookie and returns `{"detail": "Logged out"}`.

### curl example

```bash
# Login (save the cookie in a jar)
curl -c cookies.txt -X POST http://localhost:8000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"donaldgarcia@example.net\",\"password\":\"password123\"}"

# The cookie is sent automatically
curl -b cookies.txt http://localhost:8000/me

# Clear the cookie
curl -b cookies.txt -c cookies.txt -X POST http://localhost:8000/auth/logout
```

### Demo accounts

`src/seed.py` creates bcrypt-hashed demo accounts with password `password123`:

- `admin@smartcaisse.com` (admin, linked to a beneficiary)
- `cashier@smartcaisse.com` (cashier)

Re-run `uv run python -m src.seed` to create them (the script appends rows). The current local database also contains `donaldgarcia@example.net` / `password123`.

### Authentication settings

All settings are read from the `.env` file at the repository root (copy `.env.example` there first). There are no hardcoded defaults.

| Variable | Example | Description |
|---|---|---|
| `SECRET_KEY` | long random string | Key used to sign and verify JWTs. Replace with a long random value in production. |
| `ALGORITHM` | `HS256` | JWT signing algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime in minutes; also sets the cookie's `Max-Age`. |
| `COOKIE_SECURE` | `false` | Set to `true` in production so the cookie is only sent over HTTPS. |

Changing `SECRET_KEY` invalidates all existing tokens.

## Database

Database operations are handled using SQLAlchemy with asynchronous support.
Alembic is used to manage database schema migrations.
Docker is used to containerize the database.

## Startup Commands

Run all commands from the `backend` folder. This project uses `uv` for dependency management.

### First-time setup

```bash
# 1. Install dependencies (creates the .venv automatically)
uv sync

# 2. Create the .env file at the repository root (never commit it)
cp ../.env.example ../.env
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

Always review the generated file in `migrations/versions/` before running `alembic upgrade head`.

### Seed development data

```bash
uv run python -m src.seed
```

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

Never use `pip install` in this project. Always use `uv add` so that `pyproject.toml` and `uv.lock` stay in sync.

### Typical workflow

1. Change a model.
2. `uv run alembic revision --autogenerate -m "message"`
3. Review the migration file.
4. `uv run alembic upgrade head`
5. `uv run uvicorn src.main:app --reload`
