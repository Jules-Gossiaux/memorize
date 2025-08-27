# Plan de l'application "Memorize" (extension Chrome)

## Objectif général
Créer une extension Chrome pour traduire des mots ou phrases sélectionnés, sauvegarder les traductions, organiser le vocabulaire par dossiers, et offrir des outils pour faciliter l'étude et la gestion du vocabulaire dans une langue cible.

## Fonctionnalités principales (actuelles)
- Traduction de texte sélectionné (API MyMemory, anglais → français)
- Sauvegarde de la traduction et du contexte (URL, phrase, date)
- Organisation des mots par dossiers (arborescence)
- Historique des traductions consultable
- Thème clair/sombre
- Réinitialisation de l'historique
- Interface popup ergonomique

## Fonctionnalités techniques
- Utilisation de `chrome.storage.local` pour la persistance
- Injection de script pour récupérer la sélection et le contexte
- Découpage du code en modules (UI, stockage, traduction, historique, sélection, utilitaires)
- Code commenté, structuré et scalable

## Fonctionnalités à venir / améliorations (court terme)
- [ ] Ne pas afficher la liste d'un dossier parent mais ajouter les mots des dossiers enfants à sa liste. Afficher seulement la liste des dossiers enfants + mots qui ne se trouvent que dans le dossier parent et pas dans le dossier enfant.
- [ ] Compléter les inputs automatiquement

## Fonctionnalités à venir / améliorations (court terme)
- [ ] Exporter l'historique en CSV
- [ ] Choisir si on veut exporter avec phrases, avec mots ou les deux
- [ ] Sélectionner les mots souhaités avec cases à cocher + dossier (si dossier coché, tous les mots de sa liste le sont aussi)
- [ ] Scanner des listes de mots

## Structure du code (voir arborescence du dossier `src/`)
- `src/popup/` : modules principaux de la popup (UI, stockage, traduction, historique, sélection)
- `src/utils/` : fonctions utilitaires
- `tests/` : tests unitaires (à venir)

## Sécurité & bonnes pratiques
- Respect des permissions minimales dans le manifest
- Pas de code sensible ou de données personnelles stockées
- Utilisation de conventions modernes (ESM, commentaires JSDoc)
- Code modulaire, lisible, maintenable et évolutif

---

*Ce plan est à mettre à jour à chaque évolution majeure de l'application.*
