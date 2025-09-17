// Gestion centralisée des préférences utilisateur (langue, autofill)

const LANG_KEY = 'memorizeLangPrefs';
const AUTOFILL_KEY = 'quizletAutofillEnabled';

/**
 * Récupère les préférences de langue (source/target).
 * @returns {Promise<{source: string, target: string}>}
 */
export function getLangPrefs() {
  return new Promise(resolve => {
    chrome.storage.sync.get(LANG_KEY, data => {
      resolve(data[LANG_KEY] || { source: 'en', target: 'fr' });
    });
  });
}

/**
 * Définit les préférences de langue (source/target).
 * @param {string} source
 * @param {string} target
 * @returns {Promise<void>}
 */
export function setLangPrefs(source, target) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ [LANG_KEY]: { source, target } }, resolve);
  });
}

/**
 * Récupère l'état d'activation de l'autofill Quizlet.
 * @returns {Promise<boolean>}
 */
export function getAutofillEnabled() {
  return new Promise(resolve => {
    chrome.storage.sync.get(AUTOFILL_KEY, data => {
      resolve(Boolean(data[AUTOFILL_KEY]));
    });
  });
}

/**
 * Définit l'état d'activation de l'autofill Quizlet.
 * @param {boolean} enabled
 * @returns {Promise<void>}
 */
export function setAutofillEnabled(enabled) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ [AUTOFILL_KEY]: enabled }, resolve);
  });
}
