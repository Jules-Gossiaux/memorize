// Fonctions utilitaires réutilisables

/**
 * Formate une date ISO en format lisible.
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}
