# SmartCaisse

Application de gestion des subventions accordées aux employés dans la cantine de l'entreprise.

## Présentation

SmartCaisse permet de gérer les bénéficiaires, de calculer la part prise en charge par l'entreprise et d'enregistrer les transactions de subvention. Le backend expose une API FastAPI sécurisée et le frontend React consomme cette API.

## Objectifs

- Gérer les comptes des bénéficiaires (employés).
- Calculer la part de l'entreprise dans la subvention des employés.
- Sécuriser les transactions monétaires (authentification par jetons, puis empreinte digitale).

## Stack technique

- **Backend** : Python, FastAPI, SQLAlchemy, PostgreSQL, Docker, `uv`.
- **Frontend** : React, JavaScript, Tailwind CSS.

## Lancer le projet

Chaque bloc ci-dessous précise le dossier depuis lequel exécuter les commandes. Les chemins partent de la racine du dépôt `SmartCaisse/`.

### 1. Configuration — depuis la racine du dépôt

```bash
cp .env.example .env
# Windows PowerShell : Copy-Item .env.example .env
```

Le fichier `.env` à la racine est le **seul** fichier de configuration du projet : il est utilisé par Docker Compose, le backend et l'agent biométrique (`server/`). Ne le commettez jamais.

### 2. PostgreSQL — depuis la racine du dépôt

```bash
docker compose -f backend/compose.yml up -d
docker compose -f backend/compose.yml ps
```

### 3. Backend — depuis le dossier `backend/`

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run python -m src.seed        # une seule fois sur une base neuve
uv run uvicorn src.main:app --reload
```

API : `http://localhost:8000` · Swagger : `http://localhost:8000/docs`

### 4. Frontend — depuis le dossier `frontend/` (second terminal)

```bash
cd frontend
pnpm install
pnpm dev
```

Application : `http://localhost:5173`

### 5. Agent biométrique — depuis le dossier `server/` (Windows uniquement, troisième terminal)

```bash
cd server
uv python install cpython-3.12-windows-x86
uv sync
uv run python src/agent.py
```

Pour tester le lecteur seul : `uv run python src/test.py` depuis `server/`.

La configuration détaillée, les tests et les autres commandes sont décrits dans la documentation dédiée :

- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)
- [Agent biométrique](./server/README.md)

## Structure

La structure de chaque partie est maintenue dans son propre README :

- [Structure du backend](./backend/README.md#structure-du-projet)
- [Structure du frontend](./frontend/README.md#structure-du-projet)

## Documentation

- [Backend](./backend/README.md) — installation, authentification, administration des bénéficiaires, parcours caissier et rapports.
- [Frontend](./frontend/README.md) — installation, dépendances, connexion de test et structure.

## Contribuer

Respectez les règles décrites dans [AGENTS.md](./AGENTS.md) et [backend/AGENTS.md](./backend/AGENTS.md). Utilisez des messages de commit Convention Commits et ne commettez jamais le fichier `.env` ni les secrets.

## Licence

À définir par l'équipe.
