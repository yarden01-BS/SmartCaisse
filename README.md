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
│       │   ├── beneficiary/
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
  -d "{\"email\":\"admin@smartcaisse.com\",\"password\":\"password123\"}"
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "account_id": 15,
  "role": "admin"
}
```

The access token is in the JSON body and is sent as a bearer token. The long-lived refresh token is only in the `HttpOnly` `refresh_token` cookie saved in `cookies.txt`.

```bash
curl -H "Authorization: Bearer <access_token>" http://localhost:8000/me
```

```json
{
  "account_id": 15,
  "email": "admin@smartcaisse.com",
  "role": "admin",
  "is_active": true,
  "profile": {
    "id": 16,
    "first_name": "Jane",
    "last_name": "Doe",
    "profession": "Teacher",
    "situation": "permanent",
    "is_active": true
  }
}
```

Rotate the refresh token with `POST /auth/refresh` (cookie sent automatically); revoke it with `POST /auth/logout`. Reusing a rotated or revoked refresh token returns `401`.

See the [Backend Documentation](./backend/README.md) for all endpoints and configuration.

## Documentation

- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)

## Contributing

Describe how developers should contribute to the project.

## License

Specify the project license.
