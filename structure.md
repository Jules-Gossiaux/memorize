memorize/
│
├── background.js
├── manifest.json
├── améliorations.md
├── popup.html
├── popup.css
├── images/
│
├── src/
│   ├── popup/
│   │   ├── index.js         # Point d'entrée de la popup
│   │   ├── ui.js            # Fonctions liées à l'UI
│   │   ├── storage.js       # Fonctions de gestion du stockage
│   │   ├── translation.js   # Fonctions de traduction
│   │   ├── selection.js     # Fonctions d'injection et de récupération de sélection
│   │   └── history.js       # Fonctions liées à l'historique
│   └── utils/
│       └── helpers.js       # Fonctions utilitaires réutilisables
│
└── tests/
    └── popup.test.js        # (optionnel) Tests unitaires