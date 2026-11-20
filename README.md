# SmartCaisse

Application de gestion des subventions accordées aux employés dans la cantine de l'entreprise.

## Présentation

SmartCaisse permet de gérer les bénéficiaires, de calculer la part prise en charge par l'entreprise et d'enregistrer les transactions de subvention. Le backend expose une API FastAPI sécurisée et le frontend React consomme cette API.

## Objectifs

- Gérer les comptes des bénéficiaires (employés).
- Calculer la part de l'entreprise dans la subvention des employés.
- Sécuriser les transactions monétaires (authentification par jetons, puis FaceID).

## Stack technique

- **Backend** : Python, FastAPI, SQLAlchemy, PostgreSQL, Docker, `uv`.
- **Frontend** : React, JavaScript, Tailwind CSS.

## Installation et démarrage

La configuration, la création de l'environnement virtuel, les migrations, le seed, le serveur FastAPI et les tests sont décrits dans la documentation dédiée :

- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)

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
