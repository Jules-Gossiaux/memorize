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
export async function saveTranslation(original, translated, url, context, folderName) {
  const data = await getMemorizeData();
  let { folders, words } = data;
  const now = new Date().toISOString();
  const wordId = original.toLowerCase();

  if (!words[wordId]) {
    words[wordId] = { original, translated, count: 0, occurrences: [] };
  }
  words[wordId].count++;
  words[wordId].occurrences.unshift({ url, context, date: now });

  let folderId = Object.keys(folders).find(id => folders[id].name.toLowerCase() === folderName.toLowerCase());
  if (!folderId) {
    folderId = `folder-${Date.now()}`;
    folders[folderId] = { name: folderName, parent: 'root', children: [], words: [] };
    folders.root.children.push(folderId);
  }

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
