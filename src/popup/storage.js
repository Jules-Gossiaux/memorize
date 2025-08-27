// Fonctions liées à la gestion du stockage (chrome.storage)

/**
 * Récupère les données de mémorisation depuis le stockage local.
 * @returns {Promise<Object>}
 */
export function getMemorizeData() {
  const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
  return new Promise(resolve => {
    chrome.storage.local.get({ memorizeData: initialData }, data => {
      resolve(data.memorizeData);
    });
  });
}

/**
 * Sauvegarde les données de mémorisation dans le stockage local.
 * @param {Object} memorizeData
 * @returns {Promise<void>}
 */
export function setMemorizeData(memorizeData) {
  return new Promise(resolve => {
    chrome.storage.local.set({ memorizeData }, () => resolve());
  });
}
