# SmartCaisse — Frontend

Application de caisse pour la cantine SIAT : saisie des commandes, vérification faciale du client par webcam, bons de commande imprimables en PDF, et rapports financiers par travailleur.

## Prérequis

- [Node.js](https://nodejs.org/) **18 ou supérieur**
- Un navigateur avec accès à la webcam (pour la reconnaissance faciale)

Vérifier les versions installées :

```bash
node -v
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

Vérifier l'installation :

```bash
pnpm -v
```

> Après l'installation, ferme et rouvre le terminal si la commande `pnpm` n'est pas reconnue.

## Installation du projet

Depuis le dossier `frontend` :

```bash
cd frontend
pnpm install
```

## Lancer le projet

Mode développement :

```bash
pnpm dev
```

L'application est disponible sur [http://localhost:5173](http://localhost:5173) (le port exact s'affiche dans le terminal).

Autres commandes utiles :

| Commande         | Description                              |
| ---------------- | ---------------------------------------- |
| `pnpm dev`       | Lance le serveur de développement        |
| `pnpm build`     | Génère la version de production (`dist`) |
| `pnpm preview`   | Prévisualise la version de production    |
| `pnpm lint`      | Vérifie le code avec ESLint              |

> Les scripts disponibles dépendent de ton `package.json`.

## Connexion

Le formulaire envoie l'e-mail et le mot de passe à `POST /auth/login` sur le backend Python. Seuls les comptes avec le rôle `cashier` peuvent ouvrir la caisse. Le jeton d'accès est conservé dans la session du navigateur et utilisé en bearer sur `GET /me` pour récupérer le profil réel ; le cookie de rafraîchissement reste géré par le serveur.

Le backend doit être démarré sur `http://localhost:8000`. Pour utiliser une autre adresse, définir `VITE_API_URL` dans un fichier `.env` à la racine de `frontend/` (par exemple `VITE_API_URL=http://localhost:8000`).

Une fois connecté, l'écran de caisse consomme l'API : bénéficiaires actifs (`GET /cashier/beneficiaries`), bons enregistrés et transactions (`GET/POST /cashier/purchase-orders`), et état financier (`GET /cashier/reports`). Les données métier ne sont plus simulées dans le frontend : le matricule affiché est `beneficiaries.matricule` renvoyé par le serveur, et un bon est identifié par l'`id` renvoyé par le backend (`order_number` n'existe plus).

La répartition 50 % / plafond 1 000 FCFA affichée avant validation est un aperçu calculé localement ; le serveur recalcule les parts lors du paiement. La reconnaissance faciale et l'envoi d'e-mail restent simulés côté navigateur. Les comptes de développement sont créés par `python -m src.seed` côté backend.

## Structure du projet

```
src/
├── App.jsx
└── features/
    └── caissiere/
        ├── api.js         # appels API (auth, bénéficiaires, bons, rapports)
        ├── components/    # composants d'interface (formulaire, rapport, modales...)
        ├── hooks/         # logique réutilisable (commandes, vérification faciale)
        ├── pages/         # page principale CaissePage
        ├── schemas/       # validation (réservé)
        ├── types/         # types (réservé)
        ├── utils.js       # calculs et impression PDF
        └── index.js       # API publique de la feature
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
- **Page sans style** : Tailwind CSS n'est pas configuré ou n'est pas importé dans le CSS global.
- **Caméra non détectée** : autorise l'accès à la webcam dans le navigateur. Sans caméra, l'application passe en mode test et valide l'identité automatiquement.
- **`pnpm` non reconnu** : rouvre le terminal ou réinstalle pnpm avec l'une des méthodes ci-dessus.
