# Plan de l'application "Memorize" (extension Chrome)

## Objectif général
Créer une extension Chrome pour traduire des mots ou phrases sélectionnés, sauvegarder les traductions, organiser le vocabulaire par dossiers, et offrir des outils pour faciliter l'étude et la gestion du vocabulaire dans une langue cible.


## Fonctionnalités principales (actuelles)
- Traduction de texte sélectionné (API MyMemory, multilingue via sélecteur de langue)
- Sélecteur de langue source/cible dans l'interface (ex : [Français] → [English])
- Sauvegarde de la traduction et du contexte (URL, phrase, date)
- Organisation des mots par dossiers (arborescence)
- Dossiers racine par langue cible (ex : fr, en, es, de...)
- Création automatique d'un dossier langue si besoin lors de l'ajout d'un mot
- Historique des traductions consultable
- Thème clair/sombre
- Réinitialisation de l'historique
- Interface popup ergonomique


## Fonctionnalités techniques
- Utilisation de `chrome.storage.local` pour la persistance
- Injection de script pour récupérer la sélection et le contexte
- Découpage du code en modules (UI, stockage, traduction, historique, sélection, utilitaires)
- Code commenté, structuré et scalable
- API de traduction paramétrable (source/target)
- Gestion dynamique des dossiers racine par langue


## Problèmes à régler
- Ajouter des logs d’erreur ou un mode debug activable.
- Préparer l’extension à l’internationalisation (i18n) si besoin.
- Séparer la logique métier (gestion dossiers/mots) de l’UI pour faciliter l’évolution.


## Fonctionnalités à venir / améliorations (court terme)
- [V] Ne pas afficher la liste d'un dossier parent mais ajouter les mots des dossiers enfants à sa liste. Afficher seulement la liste des dossiers enfants + mots qui ne se trouvent que dans le dossier parent et pas dans le dossier enfant.
- [V] Pouvoir sélectionner des mots pour différentes taches, pour l'instant la seule tache est de supprimer seulement les mots cochés
- [V] Créer des sous-dossiers
- [V] Ajout d'un sélecteur de langue source/cible dans l'interface
- [V] Création automatique de dossiers racine par langue cible
- [V] Sélectionner les mots souhaités avec cases à cocher + dossier (si dossier coché, tous les mots de sa liste le sont aussi)
- [V] Compléter les inputs automatiquement sur quizlet
- [V] Ajouter un historique en plus des listes
- [V] Ajouter un bouton + pour ajouter des dossiers au dossier racine
- [V] Lorsque l' on appuye sur le bouton "Traduire le texte selectionne", le compteur de vues du mot s' actualise (pour l' instant, seulement lorsque l' on sauvegarde le mot)
- [V] lorsque l'on créée un dossier lors de la traduction d'un mot, il s'ajoute dans le dossier racine au lieu du dossier langue
- [ ] L'autocompletion quizlet ne fonctionne plus


## Fonctionnalités à venir / améliorations (court terme)
- [ ] Aucun dossier ne doit se trouver en dehors d' un dossier langue (ex: pour un mot anglais, le dossier ne doit pas se trouver en dehors du dossier en)
- [ ] Completer une liste quizlet avec une liste memorize
- [ ] Ajouter une option clic droit
- [ ] Trouver une meilleure api de traduction
- [ ] Exporter l'historique en CSV
- [ ] Choisir si on veut exporter/completer une liste quizlet avec phrases, avec mots ou les deux
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
