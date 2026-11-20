# SmartCaisse

Application de gestion des subventions accordées aux employés dans la cantine de l'entreprise.

## Présentation

SmartCaisse permet de gérer les bénéficiaires, de calculer la part prise en charge par l'entreprise et d'enregistrer les transactions de subvention. Le backend expose une API FastAPI sécurisée ; le frontend React sera ajouté au fur et à mesure du développement.

## Objectifs

- Gérer les comptes des bénéficiaires (employés).
- Calculer la part de l'entreprise dans la subvention des employés.
- Sécuriser les transactions monétaires (authentification par jetons, puis FaceID).

## Stack technique

- **Backend** : Python, FastAPI, SQLAlchemy, PostgreSQL, Docker, `uv`.
- **Frontend (prévu)** : React, JavaScript, Tailwind CSS.

## Organisation du dépôt

| Dossier / fichier | Rôle |
|---|---|
| `backend/` | API FastAPI, modèles, migrations, tests et documentation détaillée. Voir [backend/README.md](./backend/README.md). |
| `.env.example` | Modèle de configuration à copier vers `.env` à la racine. |
| `compose.yaml` | Service PostgreSQL utilisé en développement. |
| `AGENTS.md` | Règles de travail du dépôt. |
| `backend/AGENTS.md` | Règles spécifiques au backend. |

> Le frontend React n'est pas encore présent dans le dépôt : aucun README dédié n'existe pour l'instant.

## Installation et démarrage

Les procédures complètes (configuration `.env`, création de `.venv` avec `uv sync`, PostgreSQL via Docker, migrations Alembic, données de démonstration, serveur FastAPI et tests) se trouvent dans la [documentation backend](./backend/README.md).

## Documentation

- [Backend](./backend/README.md) — installation, structure détaillée, authentification, bénéficiaires, caisse et rapports.
- Frontend — à venir (aucun README dédié pour l'instant).

## Contribuer

Respectez les règles décrites dans [AGENTS.md](./AGENTS.md) et [backend/AGENTS.md](./backend/AGENTS.md). Utilisez des messages de commit Convention Commits et ne commettez jamais le fichier `.env` ni les secrets.

## Licence

À définir par l'équipe.
