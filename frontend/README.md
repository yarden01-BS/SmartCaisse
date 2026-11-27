# SmartCaisse — Frontend

Application de la cantine SIAT. Deux espaces sont disponibles :

- **Espace caissière** (`/caisse`) : saisie des commandes, vérification faciale du client par webcam, bons de commande imprimables en PDF et rapports financiers, le tout connecté à l'API backend.
- **Espace administrateur** (`/admin`) : gestion des comptes utilisateurs, création et liste des bénéficiaires (travailleurs / stagiaires) avec recherche par nom ou matricule, modification, suppression et capture des traits faciaux.

La racine `/` redirige vers l'espace caissière.

## Prérequis

- [Node.js](https://nodejs.org/) **18 ou supérieur**
- Un navigateur avec accès à la webcam (pour la reconnaissance faciale)
- [pnpm](https://pnpm.io/) (ou npm)
- Le backend FastAPI démarré sur `http://localhost:8000` (voir `../backend/README.md`)

Vérifier les versions installées :

```bash
node -v
pnpm -v
```

## Démarrage rapide (pas à pas)

Les commandes ci-dessous partent de la racine du dépôt `SmartCaisse/`.

### 1. Configuration et backend (premier terminal)

Depuis la **racine du dépôt** :

```bash
cp .env.example .env
# Windows PowerShell : Copy-Item .env.example .env
docker compose -f backend/compose.yml up -d
```

Puis depuis le dossier **`backend/`** :

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run python -m src.seed        # une seule fois sur une base neuve
uv run uvicorn src.main:app --reload
```

L'API est alors disponible sur `http://localhost:8000`.

### 2. Frontend (second terminal, depuis la racine du dépôt)

```bash
cd frontend
pnpm install
pnpm dev
```

### 3. Ouvrir l'application

`http://localhost:5173`

### 4. Identifiants de démonstration

- Caissière : `cashier@smartcaisse.com` / `password123`
- Administrateur : `admin@smartcaisse.com` / `password123`

### 5. Vérifications utiles (depuis `frontend/`)

```bash
pnpm lint
pnpm test
pnpm build
```

## Installer pnpm

Choisis **une** des méthodes ci-dessous.

### Option 1 : avec npm

```bash
npm install -g pnpm
```

### Option 2 : avec Corepack (fourni avec Node.js)

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

### Option 3 : Windows (PowerShell)

```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

> Après l'installation, ferme et rouvre le terminal si la commande `pnpm` n'est pas reconnue.

## Installation et démarrage

Depuis la racine du dépôt, placez-vous dans le dossier `frontend/` :

```bash
cd frontend
pnpm install
pnpm dev
```

L'application est disponible sur [http://localhost:5173](http://localhost:5173) (le port exact s'affiche dans le terminal).

| Commande       | Description                              |
| -------------- | ---------------------------------------- |
| `pnpm dev`     | Lance le serveur de développement        |
| `pnpm build`   | Génère la version de production (`dist`) |
| `pnpm preview` | Prévisualise la version de production    |
| `pnpm lint`    | Vérifie le code avec oxlint              |
| `pnpm test`    | Exécute les tests Vitest (jsdom)         |
| `pnpm test:watch` | Relance les tests en mode watch       |

Les tests couvrent notamment l'authentification admin, le mapping des endpoints et le fait qu'aucune donnée de gestion n'est chargée avant l'ouverture de la session (évite le popup « Chargement impossible » sur l'écran de connexion).

Les mêmes commandes fonctionnent avec `npm` (`npm install`, `npm run dev`, ...).

## Connexion à l'API (espace caissière)

Le formulaire envoie l'e-mail et le mot de passe à `POST /auth/login` sur le backend Python. Seuls les comptes avec le rôle `cashier` peuvent ouvrir la caisse. Le jeton d'accès est conservé dans la session du navigateur et utilisé en bearer sur `GET /me` pour récupérer le profil réel ; le cookie de rafraîchissement reste géré par le serveur.

Le backend doit être démarré sur `http://localhost:8000`. Le fichier `.env` à la racine du dépôt configure le backend et Docker ; Vite lit ses propres variables depuis `frontend/.env`. Pour utiliser une autre adresse d'API, définir `VITE_API_URL=http://localhost:8000` dans `frontend/.env`.

Une fois connecté, l'écran de caisse consomme l'API : bénéficiaires actifs (`GET /cashier/beneficiaries`), bons enregistrés et transactions (`GET/POST /cashier/purchase-orders`), et état financier (`GET /cashier/reports`). Les données métier ne sont plus simulées dans le frontend : le matricule affiché est `beneficiaries.matricule` renvoyé par le serveur, et un bon est identifié par l'`id` renvoyé par le backend (`order_number` n'existe plus).

La répartition 50 % / plafond 1 000 FCFA affichée avant validation est un aperçu calculé localement ; le serveur recalcule les parts lors du paiement. La reconnaissance faciale et l'envoi d'e-mail restent simulés côté navigateur. Les comptes de développement sont créés par `python -m src.seed` côté backend.

## Connexion (espace administrateur)

| Espace         | Identifiant               | Mot de passe  |
| -------------- | ------------------------- | ------------- |
| Administrateur | `admin@smartcaisse.com`   | `password123` |

L'espace administrateur s'authentifie via `POST /auth/login` et vérifie le rôle `admin` avec `GET /me`. Le jeton d'accès est conservé dans la session du navigateur. Comme pour la caisse, définir `VITE_API_URL` pour utiliser une autre adresse de backend.

Les comptes et les bénéficiaires affichés dans `/admin` proviennent exclusivement de l'API :

| Ressource      | Endpoints utilisés                                                                 |
| -------------- | ---------------------------------------------------------------------------------- |
| Comptes        | `GET/POST /admin/accounts`, `PATCH/DELETE /admin/accounts/{id}`                     |
| Bénéficiaires  | `GET/POST /beneficiaries`, `PATCH/DELETE /beneficiaries/{id}`, `POST .../suspend`   |

Si un popup « Chargement impossible » affiche `Not Found`, le backend en cours d'exécution est antérieur à ces endpoints : arrêtez-le puis relancez `uvicorn src.main:app` depuis `backend/`.

## Structure du projet

```text
frontend/
├── .gitignore
├── index.html
├── package.json
├── pnpm-lock.yaml
├── README.md
├── src/
│   ├── App.jsx                 # routes : /caisse et /admin
│   ├── features/
│   │   ├── admin/
│   │   │   ├── api.js          # appels API (auth, comptes, bénéficiaires)
│   │   │   ├── components/     # sidebar, formulaires, listes, modales
│   │   │   ├── hooks/          # auth admin, comptes, bénéficiaires
│   │   │   ├── pages/          # AdminPage
│   │   │   ├── index.js        # API publique de la feature
│   │   │   └── utils.js        # signatures faciales, matricules
│   │   └── caissiere/
│   │       ├── api.js          # appels API (auth, bénéficiaires, bons, rapports)
│   │       ├── components/     # composants d'interface
│   │       ├── hooks/          # commandes, vérification faciale
│   │       ├── pages/          # CaissePage
│   │       ├── utils.js        # calculs et impression PDF
│   │       └── index.js        # API publique de la feature
│   ├── index.css               # Tailwind CSS global
│   └── main.jsx                # point d'entrée React
└── vite.config.js
```

Chaque feature expose uniquement ce qui est exporté dans son `index.js`.

## Dépendances principales

- React + React Router (`react-router-dom`)
- Tailwind CSS
- lucide-react (icônes)

Si une dépendance manque :

```bash
pnpm add react-router-dom lucide-react
```

## Dépannage

- **Page blanche** : vérifie que `App.jsx` enveloppe l'application dans un `<BrowserRouter>`, et ouvre la console du navigateur (F12) pour lire l'erreur.
- **Erreurs de connexion API** : vérifie que le backend tourne sur `http://localhost:8000` et que `VITE_API_URL` est correct.
- **Page sans style** : Tailwind CSS n'est pas configuré ou n'est pas importé dans le CSS global.
- **Caméra non détectée** : autorise l'accès à la webcam dans le navigateur. Sans caméra, l'application passe en mode test et valide l'identité automatiquement.
- **`pnpm` non reconnu** : rouvre le terminal ou réinstalle pnpm avec l'une des méthodes ci-dessus.
