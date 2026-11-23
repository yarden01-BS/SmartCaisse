# Backend

Backend de SmartCaisse : logique métier, accès à la base de données, authentification et points d'entrée de l'API FastAPI.

## Structure du projet

```text
backend/
├── migrations/                # Configuration et historique des migrations Alembic
│   └── versions/              # Scripts de migration de la base de données
└── src/                       # Code source de l'application FastAPI
    ├── core/                  # Configuration, utilitaires partagés et sécurité bcrypt/JWT
    │   ├── config.py
    │   └── security.py
    ├── db/                    # Connexion, sessions et modèles SQLAlchemy
    │   ├── database.py
    │   ├── session.py
    │   └── models.py
    ├── modules/               # Domaines métier de l'application
    │   ├── admin/
    │   ├── auth/
    │   ├── beneficiary/
    │   ├── cashier/
    │   └── users/
    ├── main.py                # Point d'entrée FastAPI et enregistrement des routeurs
    ├── seed.py                # Données fictives de développement et comptes de démonstration
    └── tests/                 # Tests automatisés (pytest)
```

### Rôle des dossiers

| Dossier | Description |
|---|---|
| `migrations/` | Configuration et historique des migrations de base de données gérées par Alembic. |
| `migrations/versions/` | Contient les scripts de migration individuels. |
| `src/` | Code source de l'application backend. |
| `src/core/` | Configuration centrale, utilitaires partagés et helpers de sécurité bcrypt/JWT. |
| `src/db/` | Configuration de la base, gestion des connexions, modèles SQLAlchemy et utilitaires associés. |
| `src/modules/` | Modules applicatifs organisés par domaine métier. |
| `src/modules/admin/` | Fonctionnalités et logique métier liées aux administrateurs. |
| `src/modules/auth/` | Route de connexion et dépendances de jetons partagées avec les autres modules. |
| `src/modules/beneficiary/` | Création, modification et suspension des bénéficiaires (administrateurs uniquement). |
| `src/modules/cashier/` | Bons de commande, transactions et rapports comptables (caissiers uniquement). |
| `src/modules/users/` | Profil du compte connecté, exposé via `GET /me`. |
| `src/main.py` | Point d'entrée de l'application FastAPI ; enregistre les routeurs. |
| `src/seed.py` | Insère des données de développement, dont les comptes de démonstration. |
| `src/tests/` | Tests automatisés du backend. |

### Organisation d'un module

Chaque module suit une convention de nommage cohérente. Les fichiers sont préfixés par l'entité ou le domaine correspondant afin de rendre leur responsabilité explicite.

| Convention | Responsabilité |
|---|---|
| `{entity}_router.py` | Points d'entrée de l'API et gestion des requêtes HTTP. |
| `{entity}_schemas.py` | Schémas Pydantic de validation et de sérialisation. |
| `{entity}_service.py` | Logique métier et opérations applicatives. |
| `{entity}_repo.py` | Requêtes et opérations de persistance en base de données. |

Chaque module conserve sa propre séparation des responsabilités : routage, validation, logique métier et accès aux données restent indépendants. Le module `auth` contient également `auth_deps.py`, qui regroupe les dépendances de validation des jetons réutilisées par les autres modules.

## Architecture

Le backend suit une architecture modulaire : les fonctionnalités sont organisées par domaine métier. Chaque module gère ses propres fonctionnalités et sa logique métier, tandis que les éléments partagés sont centralisés dans `core/` et ceux liés à la base de données dans `db/`.

## Démarrage complet (de la base de données à FastAPI)

Cette procédure est à suivre exactement pour un nouvel environnement. Les commandes des étapes 1 à 3 se lancent depuis la **racine du dépôt**, les suivantes depuis le dossier `backend`.

### 1. Créer le fichier `.env`

La configuration est lue exclusivement depuis le fichier `.env` placé à la racine du dépôt. Il est utilisé par Docker Compose (PostgreSQL) et par le backend (SQLAlchemy, JWT, cookies).

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Ne commettez jamais ce fichier. Ajustez les valeurs si besoin, en particulier `SECRET_KEY` hors développement. Aucune valeur de configuration n'est codée en dur dans le code.

### 2. Démarrer PostgreSQL

```bash
# Depuis le dossier backend
docker compose --env-file ../.env up -d
```

Le service `db` doit passer à l'état `healthy`. Le port `5432` doit être disponible. Pour arrêter la base : `docker compose down` ; pour supprimer aussi les données : `docker compose down -v`.

### 3. Installer les dépendances et créer `.venv`

```bash
cd backend
uv sync
```

`uv sync` crée l'environnement virtuel dans `backend/.venv` et installe les dépendances de `pyproject.toml` et `uv.lock`. Il n'est pas nécessaire de l'activer : toutes les commandes `uv run` l'utilisent automatiquement. Pour l'activer manuellement :

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

N'utilisez jamais `pip install` dans ce projet.

### 4. Appliquer les migrations

```bash
uv run alembic upgrade head
```

Cette commande crée le schéma de base et doit être exécutée avant le premier lancement et après chaque nouvelle migration.

### 5. Insérer les données de démonstration (facultatif mais recommandé)

```bash
uv run python -m src.seed
```

Le script crée 3 bénéficiaires, 1 caissier et exactement 2 comptes : un administrateur lié au premier bénéficiaire et un caissier. Il ajoute aussi 20 bons de commande, 20 transactions et 8 rapports. Il **ajoute** des données : ne l'exécutez qu'une seule fois sur une base neuve, sinon les adresses e-mail de démonstration provoqueront une erreur.

Comptes créés (mot de passe `password123`) :

- `admin@smartcaisse.com` (administrateur, lié à un bénéficiaire) ;
- `cashier@smartcaisse.com` (caissier).

### 6. Lancer le serveur FastAPI

```bash
# Développement : rechargement automatique à chaque modification
uv run uvicorn src.main:app --reload

# Production ou test sans rechargement
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
```

Le point d'entrée est bien `src.main:app` depuis le dossier `backend`. N'utilisez pas `app.main:app`, qui n'existe pas dans ce dépôt.

- API : http://localhost:8000
- Documentation Swagger : http://localhost:8000/docs

### 7. Vérifier l'installation

```bash
uv run pytest
uv run ruff check src migrations
uv run ruff format --check src migrations
uv run pyrefly check src
```

Les tests utilisent la base définie dans le `.env` racine. Si les tests échouent avec une erreur de connexion, vérifiez que Docker est démarré, que `docker compose ps` indique `healthy` et que les migrations sont appliquées.

## Authentification

Les comptes administrateurs et caissiers utilisent les mêmes routes de connexion. Les mots de passe sont hachés avec bcrypt et les jetons sont des JWT signés en HS256.

Deux jetons sont émis :

- **Jeton d'accès** — courte durée (`ACCESS_TOKEN_EXPIRE_MINUTES`). Il est renvoyé dans le corps JSON et envoyé par le client dans l'en-tête `Authorization: Bearer <access_token>`.
- **Jeton de rafraîchissement** — longue durée (`REFRESH_TOKEN_EXPIRE_MINUTES`). Il est stocké uniquement dans un cookie `HttpOnly` nommé `refresh_token` et utilisé seulement par `/auth/refresh` et `/auth/logout`.

### 1. Connexion

`POST /auth/login`

```json
{
  "email": "admin@smartcaisse.com",
  "password": "password123"
}
```

Réponse en cas de succès (`200`) :

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "account_id": 15,
  "role": "admin"
}
```

Le jeton de rafraîchissement figure uniquement dans l'en-tête `Set-Cookie`, jamais dans le corps JSON. Une adresse inconnue, un mot de passe incorrect ou un compte inactif renvoie `401` avec `{"detail": "Invalid email or password"}` et aucun cookie n'est défini.

Le cookie utilise `HttpOnly`, `SameSite=Lax` et `Path=/`. L'attribut `Secure` est contrôlé par `COOKIE_SECURE` : `false` en développement local, `true` en production HTTPS.

### 2. Lire le profil connecté

`GET /me` exige l'en-tête `Authorization: Bearer <access_token>`. Le cookie de rafraîchissement est volontairement **refusé** sur les routes protégées : un jeton de rafraîchissement utilisé comme jeton d'accès renvoie `401`.

L'identifiant du compte provient de la revendication `sub` du jeton, jamais du corps de la requête : la réponse correspond donc toujours au compte authentifié.

Réponse (`200`) pour un administrateur :

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

Pour un caissier, `profile` contient `id`, `first_name`, `last_name`, `company` et `is_active`. Un jeton absent ou invalide, ou un compte supprimé ou inactif, renvoie `401`.

### 3. Rafraîchir le jeton

`POST /auth/refresh` lit le cookie `refresh_token`. Il valide la signature, la revendication `exp` et la revendication `type=refresh`, puis vérifie la table `revoked_tokens`.

En cas de succès :

1. le `jti` de l'ancien jeton est enregistré comme révoqué (rotation) ;
2. un nouveau jeton d'accès et un nouveau jeton de rafraîchissement sont émis ;
3. le nouveau cookie est posé et le nouveau jeton d'accès est renvoyé dans le corps JSON.

Un jeton expiré, mal formé, révoqué ou déjà utilisé renvoie `401`. Un cookie absent renvoie également `401`.

### 4. Se déconnecter

`POST /auth/logout` enregistre le `jti` du jeton contenu dans le cookie comme révoqué et efface le cookie. La réponse est `{"detail": "Logged out"}`. Le jeton d'accès étant sans état, il reste valable jusqu'à son expiration : le client doit le supprimer.

La table de révocation est créée par la migration `1de417ce039b_add_revoked_refresh_tokens.py`.

### Exemple avec curl

Sous Windows, utilisez `curl.exe` à la place de `curl`.

```bash
# Connexion : enregistre le cookie et lit le jeton d'accès dans la réponse JSON
curl -c cookies.txt -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d '{"email":"admin@smartcaisse.com","password":"password123"}'

# Utilisation du jeton d'accès comme jeton bearer
curl -H "Authorization: Bearer <access_token>" http://localhost:8000/me

# Rotation du jeton de rafraîchissement (le cookie est envoyé automatiquement)
curl -b cookies.txt -c cookies.txt -X POST http://localhost:8000/auth/refresh

# Révocation du jeton et suppression du cookie
curl -b cookies.txt -c cookies.txt -X POST http://localhost:8000/auth/logout
```

### Paramètres d'authentification

Toutes les variables sont lues depuis le fichier `.env` à la racine du dépôt (copiez d'abord `.env.example`). Il n'existe aucune valeur par défaut codée en dur.

| Variable | Exemple | Description |
|---|---|---|
| `SECRET_KEY` | chaîne aléatoire longue | Clé de signature et de vérification des JWT. À remplacer par une valeur longue et aléatoire en production. |
| `ALGORITHM` | `HS256` | Algorithme de signature des JWT. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Durée de vie du jeton d'accès, en minutes. |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | `10080` | Durée de vie du jeton de rafraîchissement, en minutes (7 jours) ; définit aussi le `Max-Age` du cookie. |
| `COOKIE_SECURE` | `false` | À passer à `true` en production pour n'envoyer le cookie qu'en HTTPS. |

Modifier `SECRET_KEY` invalide tous les jetons existants.

## Administration des bénéficiaires

Ces routes sont accessibles **uniquement aux comptes administrateurs**. Elles exigent `Authorization: Bearer <access_token>` ; un jeton de caissier renvoie `403` et l'absence de jeton renvoie `401`.

| Méthode | Chemin | Description |
|---|---|---|
| `GET` | `/beneficiaries` | Lister les employés (bénéficiaires), avec tri et filtre. |
| `POST` | `/beneficiaries` | Créer un bénéficiaire actif. |
| `PATCH` | `/beneficiaries/{id}` | Modifier uniquement les champs fournis. |
| `POST` | `/beneficiaries/{id}/suspend` | Passer `is_active` à `false`. |

Corps de création :

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "profession": "Teacher",
  "situation": "permanent"
}
```

`situation` accepte `permanent` ou `stagiare`. Réponse (`201`) :

```json
{
  "id": 13,
  "first_name": "Jane",
  "last_name": "Doe",
  "profession": "Teacher",
  "situation": "permanent",
  "is_active": true,
  "created_at": "2026-11-20T01:39:18.500427Z"
}
```

La modification accepte n'importe quel sous-ensemble de `first_name`, `last_name`, `profession` et `situation`. Un identifiant inconnu renvoie `404`. La suspension conserve les données et ne fait que basculer `is_active`.

### Lister les employés

`GET /beneficiaries` renvoie un tableau JSON. Paramètres de requête :

| Paramètre | Valeurs | Défaut | Description |
|---|---|---|---|
| `sort` | `old`, `recent` | `recent` | Tri par date de création : les plus anciens ou les plus récents d'abord. |
| `is_active` | `true`, `false` | aucun | Ne garder que les employés actifs ou inactifs. Omettre pour les renvoyer tous. |

Exemples :

```text
GET /beneficiaries
GET /beneficiaries?sort=old
GET /beneficiaries?is_active=false
GET /beneficiaries?sort=old&is_active=true
```

Une valeur invalide pour `sort` ou `is_active` renvoie `422`.

## Parcours caissier

Ces routes sont accessibles **uniquement aux comptes caissiers**. Elles exigent `Authorization: Bearer <access_token>` ; un jeton d'administrateur renvoie `403` et l'absence de jeton renvoie `401`. Un caissier ne peut traiter que les commandes qu'il a lui-même enregistrées.

| Méthode | Chemin | Description |
|---|---|---|
| `POST` | `/cashier/purchase-orders` | Enregistrer un bon de commande remis par un bénéficiaire. |
| `POST` | `/cashier/purchase-orders/{id}/transactions` | Effectuer le paiement et enregistrer la répartition de la subvention. |
| `GET` | `/cashier/reports` | Renvoyer la ventilation comptable des transactions du caissier. |

### Règles de subvention

- L'entreprise prend en charge **50 %** du montant de la commande ; le bénéficiaire paie les 50 % restants.
- La contribution de l'entreprise est plafonnée à **1 000 FCFA par commande**.
- Au-delà de **2 000 FCFA**, la part de l'entreprise reste à 1 000 FCFA et le bénéficiaire paie toute la différence.
- Les montants sont arrondis au FCFA le plus proche et `company_share + customer_share` est toujours égal à `total_amount`.

| Total de la commande | Part entreprise | Part client |
|---:|---:|---:|
| 1 000 | 500 | 500 |
| 2 000 | 1 000 | 1 000 |
| 2 001 | 1 000 | 1 001 |
| 2 500 | 1 000 | 1 500 |

### 1. Enregistrer la commande

`POST /cashier/purchase-orders`

```json
{
  "beneficiary_id": 16,
  "order_number": "PO-00042",
  "amount": 2500
}
```

Réponse (`201`) :

```json
{
  "id": 41,
  "beneficiary_id": 16,
  "account_id": 25,
  "order_number": "PO-00042",
  "amount": 2500.0,
  "order_date": "2026-11-20T10:30:00Z"
}
```

Un bénéficiaire inconnu ou inactif renvoie `404`.

### 2. Effectuer la transaction

`POST /cashier/purchase-orders/41/transactions` n'attend aucun corps de requête : la répartition est calculée par le backend.

Réponse (`201`) :

```json
{
  "id": 9,
  "purchase_order_id": 41,
  "order_number": "PO-00042",
  "beneficiary_id": 16,
  "account_id": 25,
  "total_amount": 2500,
  "customer_share": 1500,
  "company_share": 1000,
  "created_at": "2026-11-20T10:31:00Z"
}
```

Une commande inconnue renvoie `404`. Payer deux fois la même commande renvoie `409`.

### 3. Traçabilité comptable

`GET /cashier/reports` agrège les transactions enregistrées du caissier par jour. Chaque ligne et les totaux généraux séparent explicitement les montants :

```json
{
  "transaction_count": 1,
  "total_amount": 2500,
  "customer_share": 1500,
  "company_share": 1000,
  "periods": [
    {
      "period": "2026-11-20",
      "transaction_count": 1,
      "total_amount": 2500,
      "customer_share": 1500,
      "company_share": 1000
    }
  ]
}
```

## Base de données

Les opérations sont réalisées avec SQLAlchemy en asynchrone. Alembic gère les migrations de schéma et Docker héberge PostgreSQL. La table `revoked_tokens` conserve les identifiants `jti` des jetons de rafraîchissement révoqués.

## Commandes utiles

Toutes les commandes ci-dessous se lancent depuis `backend` avec l'environnement créé par `uv sync`.

### Migrations Alembic

```bash
# Appliquer toutes les migrations
uv run alembic upgrade head

# Créer une migration après une modification de modèle
uv run alembic revision --autogenerate -m "description du changement"

# Annuler la dernière migration
uv run alembic downgrade -1

# Afficher la version courante
uv run alembic current
```

Toujours relire le fichier généré dans `migrations/versions/` avant d'exécuter `uv run alembic upgrade head`.

### Tests et qualité

```bash
uv run pytest
uv run ruff check src migrations
uv run ruff format --check src migrations
uv run pyrefly check src
```

### Gestion des dépendances

```bash
# Ajouter une dépendance
uv add nom-du-paquet

# Ajouter une dépendance de développement (tests, linters)
uv add --dev nom-du-paquet

# Supprimer une dépendance
uv remove nom-du-paquet
```

`uv add` maintient `pyproject.toml` et `uv.lock` synchronisés. N'utilisez pas `pip install`.

### Workflow typique

1. Modifier un modèle.
2. `uv run alembic revision --autogenerate -m "message"`.
3. Relire le fichier de migration généré.
4. `uv run alembic upgrade head`.
5. `uv run uvicorn src.main:app --reload`.
6. `uv run pytest` puis les commandes de lint.
