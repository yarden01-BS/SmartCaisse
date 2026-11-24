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

Depuis le dossier `frontend` :

```bash
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

Les mêmes commandes fonctionnent avec `npm` (`npm install`, `npm run dev`, ...).

## Connexion à l'API (espace caissière)

Le formulaire envoie l'e-mail et le mot de passe à `POST /auth/login` sur le backend Python. Seuls les comptes avec le rôle `cashier` peuvent ouvrir la caisse. Le jeton d'accès est conservé dans la session du navigateur et utilisé en bearer sur `GET /me` pour récupérer le profil réel ; le cookie de rafraîchissement reste géré par le serveur.

Le backend doit être démarré sur `http://localhost:8000`. Pour utiliser une autre adresse, définir `VITE_API_URL` dans un fichier `.env` à la racine de `frontend/` (par exemple `VITE_API_URL=http://localhost:8000`).

Une fois connecté, l'écran de caisse consomme l'API : bénéficiaires actifs (`GET /cashier/beneficiaries`), bons enregistrés et transactions (`GET/POST /cashier/purchase-orders`), et état financier (`GET /cashier/reports`). Les données métier ne sont plus simulées dans le frontend : le matricule affiché est `beneficiaries.matricule` renvoyé par le serveur, et un bon est identifié par l'`id` renvoyé par le backend (`order_number` n'existe plus).

La répartition 50 % / plafond 1 000 FCFA affichée avant validation est un aperçu calculé localement ; le serveur recalcule les parts lors du paiement. La reconnaissance faciale et l'envoi d'e-mail restent simulés côté navigateur. Les comptes de développement sont créés par `python -m src.seed` côté backend.

## Connexion de test (espace administrateur)

| Espace          | Nom    | Mot de passe |
| --------------- | ------ | ------------ |
| Administrateur  | `admin` | `1234`       |

Le compte administrateur de test est défini dans `src/features/admin/utils.js` (`COMPTE_ADMIN_TEST`). Depuis chaque écran de connexion, un lien permet de passer à l'autre espace. Ces identifiants sont codés en dur pour les tests ; ils devront être remplacés par une vraie authentification via l'API (le backend `develop` prévoit par exemple `admin@smartcaisse.com` / `password123`).

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
│   │   │   ├── components/     # sidebar, formulaires, listes, modales
│   │   │   ├── hooks/          # auth admin, comptes, bénéficiaires, signature faciale
│   │   │   ├── pages/          # AdminPage
│   │   │   ├── index.js        # API publique de la feature
│   │   │   └── utils.js        # compte de test, signatures faciales, matricules
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
