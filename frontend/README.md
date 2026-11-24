# SmartCaisse — Frontend

Frontend de la cantine SIAT. Deux espaces sont disponibles :

- **Espace caissière** (`/caisse`) : saisie des commandes, vérification faciale du client par webcam, bons de commande imprimables en PDF et rapports financiers par travailleur.
- **Espace administrateur** (`/admin`) : gestion des comptes utilisateurs et enregistrement du personnel client (travailleurs / stagiaires) avec capture des traits faciaux.

La racine `/` redirige vers l'espace caissière.

## Prérequis

- [Node.js](https://nodejs.org/) **18 ou supérieur**
- Un navigateur avec accès à la webcam (pour la reconnaissance faciale)
- [pnpm](https://pnpm.io/) (ou npm)

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

## Connexion (mode test)

| Espace          | Nom                          | Mot de passe |
| --------------- | ---------------------------- | ------------ |
| Caissière       | N'importe lequel (ex. Sarah) | `1234`       |
| Administrateur  | `admin`                      | `1234`       |

Le compte administrateur de test est défini dans `src/features/admin/utils.js` (`COMPTE_ADMIN_TEST`). Depuis chaque écran de connexion, un lien permet de passer à l'autre espace. Ces identifiants sont codés en dur pour les tests ; ils devront être remplacés par une vraie authentification via l'API (le backend `develop` prévoit par exemple `admin@smartcaisse.com` / `password123`).

## Structure du projet

```
frontend/
├── dist/
│   └── assets/                 # build de production (généré)
├── index.html
├── package.json
├── package-lock.json
├── pnpm-lock.yaml
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── README.md
├── src/
│   ├── App.jsx                 # routes : /caisse et /admin
│   ├── features/
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   │   ├── AdminHeader.jsx
│   │   │   │   ├── AdminLoginScreen.jsx
│   │   │   │   ├── AdminSidebar.jsx
│   │   │   │   ├── CompteForm.jsx
│   │   │   │   ├── ComptesListSection.jsx
│   │   │   │   ├── DialogModal.jsx
│   │   │   │   ├── TravailleurForm.jsx
│   │   │   │   └── TravailleursSection.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAdminAuth.js
│   │   │   │   ├── useComptes.js
│   │   │   │   ├── useFaceSignature.js
│   │   │   │   └── useTravailleurs.js
│   │   │   ├── pages/
│   │   │   │   └── AdminPage.jsx
│   │   │   ├── index.js        # API publique de la feature
│   │   │   └── utils.js        # signatures faciales, matricules
│   │   └── caissiere/
│   │       ├── components/
│   │       │   ├── BonPdfModal.jsx
│   │       │   ├── CaisseHeader.jsx
│   │       │   ├── ClientSelect.jsx
│   │       │   ├── CommandeSection.jsx
│   │       │   ├── EmailModal.jsx
│   │       │   ├── FaceVerification.jsx
│   │       │   ├── HistoriqueBons.jsx
│   │       │   ├── LoginScreen.jsx
│   │       │   ├── ProfilSection.jsx
│   │       │   ├── RapportChart.jsx
│   │       │   ├── RapportSection.jsx
│   │       │   └── RapportTable.jsx
│   │       ├── hooks/
│   │       │   ├── useCommandes.js
│   │       │   └── useFaceVerification.js
│   │       ├── pages/
│   │       │   └── CaissePage.jsx
│   │       ├── index.js        # API publique de la feature
│   │       ├── mockData.js     # données de test
│   │       └── utils.js        # calculs, agrégations, impression PDF
│   ├── index.css               # Tailwind CSS global
│   └── main.jsx                # point d'entrée React
├── vite.config.js
├── .gitignore
└── .oxlintrc.json
```

Chaque feature expose uniquement ce qui est exporté dans son `index.js`.

## Dépendances principales

- React + React Router (`react-router-dom`)
- Tailwind CSS
- lucide-react (icônes)

## Dépannage

- **Page blanche** : vérifie que `App.jsx` enveloppe l'application dans un `<BrowserRouter>`, et ouvre la console du navigateur (F12) pour lire l'erreur.
- **Page sans style** : Tailwind CSS n'est pas configuré ou n'est pas importé dans le CSS global.
- **Caméra non détectée** : autorise l'accès à la webcam dans le navigateur. Sans caméra, l'application passe en mode test et génère tout de même une signature ou une validation.
