// Fonctions liées à l'historique et à la gestion des dossiers/mots
import { getMemorizeData, setMemorizeData } from './storage.js';

/**
 * Ajoute une traduction à l'historique et au dossier choisi.
 * @param {string} original
 * @param {string} translated
 * @param {string} url
 * @param {string} context
 * @param {string} folderName
 * @returns {Promise<void>}
 */
/**
 * Ajoute une traduction à l'historique et au dossier choisi.
 * @param {string} original - Le mot original
 * @param {string} translated - La traduction
 * @param {string} url - L'URL où le mot a été trouvé
 * @param {string} context - Le contexte du mot
 * @param {string} folderName - Le nom du dossier où ranger le mot
 * @returns {Promise<void>}
 */
export async function saveTranslation(original, translated, url, context, folderName) {
  const data = await getMemorizeData();
  let { folders, words } = data;
  const now = new Date().toISOString();
  const wordId = original.toLowerCase();

  // Créer la structure du mot s'il n'existe pas encore
  if (!words[wordId]) {
    words[wordId] = { 
      original, 
      translated, 
      count: 0,
      occurrences: []
    };
  }

  // Trouver ou créer le dossier cible
  let folderId = Object.keys(folders).find(id => 
    folders[id].name.toLowerCase() === folderName.toLowerCase()
  );
  
  if (!folderId) {
    folderId = `folder-${Date.now()}`;
    folders[folderId] = { 
      name: folderName, 
      parent: 'root', 
      children: [], 
      words: [] 
    };
    folders.root.children.push(folderId);
  }

  // Incrémenter le compteur à chaque nouvelle vue du mot
  words[wordId].count++;
  
  // Ajouter la nouvelle occurrence en premier (plus récente)
  words[wordId].occurrences.unshift({ 
    url, 
    context, 
    date: now 
  });
  
  // Ajouter le mot au dossier s'il n'y est pas déjà
  if (!folders[folderId].words.includes(wordId)) {
    folders[folderId].words.push(wordId);
  }


  await setMemorizeData({ folders, words });
}

/**
 * Récupère l'historique complet.
 * @returns {Promise<Object>}
 */
export function loadHistory() {
  return getMemorizeData();
}
