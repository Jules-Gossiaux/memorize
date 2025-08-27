// Fonctions d'injection et de récupération de la sélection sur la page

/**
 * Fonction à injecter dans la page pour récupérer la sélection et le contexte.
 * @returns {{selectionText: string, context: string}}
 */
export function getSelectionDetails() {
  const selection = window.getSelection();
  const selectionText = selection ? selection.toString() : '';
  let context = '';
  if (selection && selection.anchorNode) {
    context = selection.anchorNode.textContent || '';
  }
  return { selectionText, context };
}
