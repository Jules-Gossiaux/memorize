// Fonctions liées à l'UI de la popup
import { translateText } from './translation.js';
import { saveTranslation, loadHistory } from './history.js';
import { getSelectionDetails } from './selection.js';

// Ici, tu pourras regrouper toutes les fonctions d'affichage, de gestion d'événements, etc.
// Exemple :

export function updateTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  // ...
}

// ... Autres fonctions d'UI à migrer depuis popup.js ...
