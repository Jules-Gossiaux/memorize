# Instructions de développement pour Memorize (github.md)

## Objectif
Créer une extension Chrome professionnelle, sécurisée, claire et scalable pour la traduction et la gestion de vocabulaire.

## Règles et bonnes pratiques
- **Code modulaire** : séparer la logique métier, l'UI, le stockage, etc. dans des modules dédiés.
- **Clarté** : privilégier des noms de fonctions/variables explicites, des commentaires JSDoc, et une structure de dossier claire.
- **Scalabilité** : anticiper l'ajout de nouvelles fonctionnalités (dossiers, modules, tests).
- **Sécurité** : limiter les permissions dans le manifest, ne jamais stocker de données sensibles, valider les entrées utilisateur.
- **Modernité** : utiliser ES Modules, conventions modernes JS, et CSS variables pour le thème.
- **Maintenabilité** : factoriser le code, éviter la duplication, documenter les modules et les fonctions publiques.
- **Tests** : prévoir un dossier `tests/` pour les tests unitaires et d'intégration.

## Structure recommandée
- `src/popup/` : tous les modules JS de la popup (UI, stockage, historique, traduction, sélection)
- `src/utils/` : fonctions utilitaires
- `tests/` : tests unitaires
- `images/` : ressources graphiques
- `plan.md` : plan fonctionnel et technique
- `améliorations.md` : backlog/améliorations (fusionné dans le plan)

## Commentaires et documentation
- Utiliser JSDoc pour chaque fonction exportée
- Ajouter des commentaires pour expliquer les choix d'architecture
- Documenter les modules et leur usage

## Objectif final
Avoir un code :
- Propre, lisible, commenté
- Facilement maintenable et évolutif
- Sécurisé et conforme aux standards Chrome Extension
- Prêt à accueillir de nouvelles fonctionnalités

---

*Mettre à jour ce fichier à chaque évolution majeure ou changement d'organisation.*

## Automatisation
Toutes les modifications, migrations ou refontes de code demandées à l'IA seront réalisées automatiquement par l'IA, sans demander de validation intermédiaire, sauf indication contraire de l'utilisateur.