# SmartCaisse

A management application to handle employee subsidies in the company cafeteria

## Overview

We're building an application for handle employee subside

## Goals

- Managing beneficiary account
- Calculating company share in employees'subside
- Securing secure monetary transactions with faceID

## Tech Stack

**Frontend**

- React
- Javascript
- Tailwind CSS

**Backend**

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL

**Infrastructure**

- Docker
- Docker Compose

## Project Structure

```text
SmartCaisse/
├── backend/
│   ├── migrations/
│   └── src/
│       ├── core/
│       ├── db/
│       ├── modules/
│       │   ├── admin/
│       │   ├── auth/
│       │   └── users/
│       ├── main.py
│       └── tests/
├── frontend/
├── docker-compose.yml
└── README.md
```

The `auth` module handles login and JWT validation. The `users` module exposes `GET /me`, which returns the profile of the account identified by the access token. See the [Backend Documentation](./backend/README.md) for details.

## Prerequisites

- Node.js
- pnpm
- Python
- Docker
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd <project-name>
```

### 2. Configure environment variables

Create the required `.env` files.

See the backend and frontend README files for configuration details.

### 3. Start the database

```bash
docker compose up -d
```

### 4. Start the backend

See [Backend Documentation](./backend/README.md).

### 5. Start the frontend

See [Frontend Documentation](./frontend/README.md).

## API quick test

Start the database and backend, then log in with a seeded dev account:

```bash
curl -c cookies.txt -X POST http://localhost:8000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"donaldgarcia@example.net\",\"password\":\"password123\"}"
```

```json
{
  "token_type": "bearer",
  "account_id": 1,
  "role": "admin"
}
```

The JWT is only in the `Set-Cookie` header, never in the response body.

The access token is stored in an `HttpOnly` cookie, so the browser sends it automatically. Use the same cookie jar to read the logged-in user's profile:

```bash
curl -b cookies.txt http://localhost:8000/me
```

`POST /auth/logout` clears the cookie.

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

See the [Backend Documentation](./backend/README.md) for all endpoints and configuration.

## Documentation

- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)

## Contributing

Describe how developers should contribute to the project.

## License

Specify the project license.
