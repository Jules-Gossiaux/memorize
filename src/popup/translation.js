// Fonctions liées à la traduction

/**
 * Traduit un texte de l'anglais vers le français via l'API MyMemory.
 * @param {string} text
 * @returns {Promise<string>} Le texte traduit
 */
export async function translateText(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.responseData && data.responseData.translatedText) {
    return data.responseData.translatedText;
  }
  throw new Error('Traduction non disponible');
}
