# Project Name

A management application to handle employee subside in the company cafeteria

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
project/
├── backend/
├── frontend/
├── docker-compose.yml
└── README.md
```

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

## Documentation

- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)

## Contributing

Describe how developers should contribute to the project.

## License

Specify the project license.
