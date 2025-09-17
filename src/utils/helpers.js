// Fonctions utilitaires réutilisables



/**
 * Traduit un texte d'une langue source vers une langue cible via l'API MyMemory.
 * @param {string} text
 * @param {string} sourceLang - code langue source (ex: 'fr')
 * @param {string} targetLang - code langue cible (ex: 'en')
 * @returns {Promise<string>} Le texte traduit
 */
export async function translateText(text, sourceLang = 'fr', targetLang = 'en') {
  if (!text || !text.trim()) return '';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (e) {
    // Optionnel: log ou gestion d'erreur
  }
  return '';
}
