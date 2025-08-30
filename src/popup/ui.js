// Fonctions liées à l'UI de la popup

import { translateText } from './translation.js';
import { saveTranslation, loadHistory } from './history.js';
import { getSelectionDetails } from './selection.js';

// --- UI Elements ---
let mainView, themeCheckbox, themeIcon, translateButton, historyDiv, resetButton;
let translationSaveContainer, translationResult, saveForm, folderSelect, newFolderNameInput, saveConfirmButton;
let sourceLangSelect, targetLangSelect;
let deleteSelectedButton, selectedCountSpan;
let currentTranslationData = {};


/**
 * Met à jour le thème de l'application (clair/sombre)
 * @param {string} theme - 'light' ou 'dark'
 */
export function updateTheme(theme) {
  // Appliquer la classe CSS appropriée
  document.body.classList.toggle('dark-mode', theme === 'dark');
  
  // Mettre à jour l'état de la case à cocher
  if (themeCheckbox) {
    themeCheckbox.checked = (theme === 'dark');
  }
  
  // Mettre à jour l'icône
  if (themeIcon) {
    themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

export function initUI() {
  // Elements
  mainView = document.getElementById('main-view');
  themeCheckbox = document.getElementById('theme-checkbox');
  themeIcon = document.getElementById('theme-icon');
  translateButton = document.getElementById('translate-button');
  // translationOutput supprimé (plus dans le HTML)
  translationSaveContainer = document.getElementById('translation-save-container');
  translationResult = document.getElementById('translation-result');
  saveForm = document.getElementById('save-form');
  folderSelect = document.getElementById('folder-select');
  newFolderNameInput = document.getElementById('new-folder-name');
  saveConfirmButton = document.getElementById('save-confirm-button');
  historyDiv = document.getElementById('history');
  resetButton = document.getElementById('reset-button');

  sourceLangSelect = document.getElementById('source-lang-select');
  targetLangSelect = document.getElementById('target-lang-select');

  deleteSelectedButton = document.getElementById('delete-selected-button');
  selectedCountSpan = document.getElementById('selected-count');
  // Persistance du choix de langue (optionnel)
  if (sourceLangSelect && targetLangSelect) {
    const langStorageKey = 'memorizeLangPrefs';
    chrome.storage.sync.get(langStorageKey, (data) => {
      if (data[langStorageKey]) {
        const { source, target } = data[langStorageKey];
        if (source) sourceLangSelect.value = source;
        if (target) targetLangSelect.value = target;
      }
    });
    sourceLangSelect.addEventListener('change', () => {
      chrome.storage.sync.set({ [langStorageKey]: { source: sourceLangSelect.value, target: targetLangSelect.value } });
    });
    targetLangSelect.addEventListener('change', () => {
      chrome.storage.sync.set({ [langStorageKey]: { source: sourceLangSelect.value, target: targetLangSelect.value } });
    });
  }

  // Theme
  chrome.storage.sync.get('theme', (data) => {
    const currentTheme = data.theme || 'light';
    updateTheme(currentTheme);
  });
  themeCheckbox.addEventListener('change', () => {
    const newTheme = themeCheckbox.checked ? 'dark' : 'light';
    chrome.storage.sync.set({ theme: newTheme });
    updateTheme(newTheme);
  });

  // Listeners
  resetButton.addEventListener('click', handleResetHistory);
  if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelected);
  translateButton.addEventListener('click', handleTranslate);
  folderSelect.addEventListener('change', () => {
    if (folderSelect.value === '--new--') {
      folderSelect.style.display = 'none';
      newFolderNameInput.style.display = 'inline-block';
      newFolderNameInput.focus();
    } else {
      newFolderNameInput.style.display = 'none';
      folderSelect.style.display = '';
    }
  });
  saveForm.addEventListener('submit', handleSaveConfirm);

  // Initial load
  translationSaveContainer.style.display = 'none';
  loadAndDisplayHistory();
  updateDeleteSelectedButton();
}

// --- Gestion sélection mots ---
const selectedWordIds = new Set();
const selectedFolderIds = new Set();

function updateDeleteSelectedButton() {
  // N'afficher que le nombre de mots sélectionnés (les dossiers ne sont pas supprimés)
  const n = selectedWordIds.size;
  if (deleteSelectedButton && selectedCountSpan) {
    selectedCountSpan.textContent = n;
    deleteSelectedButton.style.display = n > 0 ? '' : 'none';
  }
}

/**
 * Gère la suppression des mots sélectionnés.
 * Les mots peuvent être sélectionnés individuellement ou via la sélection d'un dossier.
 */
function handleDeleteSelected() {
  if (selectedWordIds.size === 0) {
    alert("Aucun mot sélectionné à supprimer.");
    console.log("Mots sélectionnés:", selectedWordIds);
    console.log("Dossiers sélectionnés:", selectedFolderIds);
    return;
  }
  
  // Confirmation de suppression
  const totalWords = selectedWordIds.size;
  if (!confirm(`Supprimer définitivement ${totalWords} mot(s) sélectionné(s) ?`)) return;
  
  // Chargement des données
  const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
  chrome.storage.local.get({ memorizeData: initialData }, (data) => {
    let { folders, words } = data.memorizeData;
    
    // Supprimer tous les mots sélectionnés
    for (const wordId of selectedWordIds) {
      // Supprimer le mot du dictionnaire
      delete words[wordId];
      
      // Supprimer le mot de tous les dossiers
      for (const folderId in folders) {
        const idx = folders[folderId].words.indexOf(wordId);
        if (idx !== -1) folders[folderId].words.splice(idx, 1);
      }
    }
    
    // Sauvegarder les modifications et réinitialiser l'interface
    chrome.storage.local.set({ memorizeData: { folders, words } }, () => {
      loadAndDisplayHistory();
      selectedWordIds.clear();
      selectedFolderIds.clear();
      updateDeleteSelectedButton();
    });
  });
}




async function handleTranslate() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) {
          translationResult.textContent = "Impossible de trouver l'onglet actif.";
      return;
    }
    chrome.scripting.executeScript(
      { target: { tabId: activeTab.id }, func: getSelectionDetails },
      async (injectionResults) => {
        if (chrome.runtime.lastError) {
          translationResult.textContent = 'Erreur : ' + chrome.runtime.lastError.message;
          translationSaveContainer.style.display = 'none';
          return;
        }
        if (!injectionResults || !injectionResults[0] || !injectionResults[0].result) {
          translationResult.textContent = "Aucun texte n'est sélectionné.";
          translationSaveContainer.style.display = 'none';
          return;
        }
        const { selectionText, context } = injectionResults[0].result;
        const sourceURL = activeTab.url;
        if (selectionText) {
          translationResult.textContent = "Traduction en cours...";
          try {
            // Récupère la langue source/cible
            const sourceLang = sourceLangSelect ? sourceLangSelect.value : 'fr';
            const targetLang = targetLangSelect ? targetLangSelect.value : 'en';
            const translatedText = await translateText(selectionText, sourceLang, targetLang);
            // Dossier racine = langue source
            const rootFolderName = sourceLang;
            let count = 0;
            const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
            await new Promise(resolve => {
              chrome.storage.local.get({ memorizeData: initialData }, (data) => {
                const wordId = selectionText.toLowerCase();
                if (data.memorizeData.words[wordId]) {
                  count = data.memorizeData.words[wordId].count;
                }
                // Crée le dossier langue source s'il n'existe pas
                let found = false;
                for (const id in data.memorizeData.folders) {
                  if (data.memorizeData.folders[id].name === rootFolderName) {
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  // Ajoute le dossier langue à la racine
                  const folders = data.memorizeData.folders;
                  const newId = 'f_' + Date.now() + '_' + Math.floor(Math.random()*10000);
                  folders[newId] = { name: rootFolderName, children: [], words: [] };
                  folders.root.children.push(newId);
                  chrome.storage.local.set({ memorizeData: { folders, words: data.memorizeData.words } }, resolve);
                } else {
                  resolve();
                }
              });
            });
            translationResult.innerHTML = `<b>${selectionText}</b> → <b>${translatedText}</b><br><span class='seen-count' style='display:block;font-size:0.85em;color:var(--subtle-text-color);margin-top:2px;'>${count === 0 ? 'nouveau mot' : `mot vu ${count} fois`}</span>`;
            currentTranslationData = { selectionText, translatedText, sourceURL, context };
            prepareSaveForm();
          } catch (e) {
            translationResult.textContent = "Erreur de traduction.";
            translationSaveContainer.style.display = 'none';
          }
        }
      }
    );
  });
}


function prepareSaveForm() {
  const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
  chrome.storage.local.get({ memorizeData: initialData }, (data) => {
    folderSelect.innerHTML = '';
    // Option racine
    const rootOption = document.createElement('option');
    rootOption.value = 'root';
    rootOption.textContent = 'Racine';
    folderSelect.appendChild(rootOption);
    // Autres dossiers
    Object.values(data.memorizeData.folders).forEach(folder => {
      if (folder.name !== 'Racine') {
        const option = document.createElement('option');
        option.value = folder.name;
        option.textContent = folder.name;
        folderSelect.appendChild(option);
      }
    });
    // Option nouveau dossier
    const newOption = document.createElement('option');
    newOption.value = '--new--';
    newOption.textContent = 'Nouveau dossier...';
    folderSelect.appendChild(newOption);
  });
  newFolderNameInput.value = '';
  newFolderNameInput.style.display = 'none';
  folderSelect.style.display = '';
  translationSaveContainer.style.display = 'block';
}


function handleSaveConfirm(e) {
  e.preventDefault();
  let folderName;
  if (folderSelect.value === '--new--') {
    folderName = newFolderNameInput.value.trim();
    if (!folderName) {
      alert("Veuillez entrer un nom pour le nouveau dossier.");
      return;
    }
  } else if (!folderSelect.value || folderSelect.value === 'root') {
    // Si Racine est choisi, on utilise la langue source
    folderName = sourceLangSelect ? sourceLangSelect.value : 'fr';
  } else {
    folderName = folderSelect.value;
  }
  // S'assurer que le dossier langue existe
  const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
  chrome.storage.local.get({ memorizeData: initialData }, (data) => {
    let { folders, words } = data.memorizeData;
    let found = false;
    for (const id in folders) {
      if (folders[id].name === folderName) {
        found = true;
        break;
      }
    }
    if (!found) {
      // Ajoute le dossier langue à la racine
      const newId = 'f_' + Date.now() + '_' + Math.floor(Math.random()*10000);
      folders[newId] = { name: folderName, children: [], words: [] };
      folders.root.children.push(newId);
      chrome.storage.local.set({ memorizeData: { folders, words } }, () => {
        const { selectionText, translatedText, sourceURL, context } = currentTranslationData;
        saveTranslation(selectionText, translatedText, sourceURL, context, folderName).then(() => {
          translationSaveContainer.style.display = 'none';
          translationResult.textContent = '';
          loadAndDisplayHistory();
        });
      });
    } else {
      const { selectionText, translatedText, sourceURL, context } = currentTranslationData;
      saveTranslation(selectionText, translatedText, sourceURL, context, folderName).then(() => {
        translationSaveContainer.style.display = 'none';
        translationResult.textContent = '';
        loadAndDisplayHistory();
      });
    }
  });
}

function handleResetHistory() {
  const confirmation = confirm("Êtes-vous sûr de vouloir vider tout l'historique ? Cette action est irréversible.");
  if (confirmation) {
    const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
    chrome.storage.local.set({ memorizeData: initialData }, () => {
      loadAndDisplayHistory();
    });
  }
}

function loadAndDisplayHistory() {
  loadHistory().then(data => {
    displayHistory(data, historyDiv);
    updateDeleteSelectedButton();
  });
}

// --- Affichage de l'historique (arborescence dossiers/mots) ---
function displayHistory(data, historyDivElement) {
  historyDivElement.innerHTML = '';
  selectedWordIds.clear();
  selectedFolderIds.clear();
  const { folders, words } = data;
  if (!folders || !folders.root) {
    historyDivElement.textContent = "L'historique est vide.";
    updateDeleteSelectedButton();
    return;
  }
  const rootUl = createFolderView(folders.root, folders, words, 0);
  historyDivElement.appendChild(rootUl);
}


function createFolderView(folder, allFolders, allWords, depth) {
  const folderLi = document.createElement('li');
  folderLi.className = 'folder-item';
  folderLi.style.paddingLeft = `${depth * 20}px`;
  
  const titleDiv = document.createElement('div');
  titleDiv.className = 'item-title';
  
  // Ajout case à cocher dossier
  const folderCheckbox = document.createElement('input');
  folderCheckbox.type = 'checkbox';
  folderCheckbox.className = 'folder-checkbox';
  folderCheckbox.style.marginRight = '6px';
  
  // Stocker l'ID du dossier comme attribut de données
  const folderId = Object.keys(allFolders).find(id => allFolders[id] === folder);
  folderCheckbox.dataset.folderId = folderId;
  
  folderCheckbox.addEventListener('change', () => {
    const ul = folderLi.querySelector('ul.folder-content');
    if (!ul) return;
    
    // Sélectionner le dossier dans la liste des dossiers sélectionnés
    if (folderCheckbox.checked) {
      selectedFolderIds.add(folderId);
    } else {
      selectedFolderIds.delete(folderId);
    }
    
    // Développer le dossier pour montrer la sélection visuelle
    if (folderCheckbox.checked && ul.style.display !== 'block') {
      ul.style.display = 'block';
      titleDiv.querySelector('.folder-icon').textContent = '📂';
    }
    
    // Récupérer tous les mots de ce dossier et ses sous-dossiers
    const allFolderWords = getAllWordsInHierarchy(folder, allFolders);
    
    // Mettre à jour selectedWordIds
    allFolderWords.forEach(wordId => {
      if (folderCheckbox.checked) {
        selectedWordIds.add(wordId);
      } else {
        selectedWordIds.delete(wordId);
      }
    });
    
  // Mettre à jour visuellement toutes les cases à cocher des mots dans ce dossier et ses sous-dossiers
  updateWordCheckboxesInElement(ul, folderCheckbox.checked);
    
    updateDeleteSelectedButton();
  });

  // Bouton suppression dossier (poubelle) toujours affiché à gauche du + (hors Racine)
  let deleteBtn = null;
  if (folder.name !== 'Racine') {
    deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Supprimer ce dossier';
    deleteBtn.className = 'delete-folder-btn';
    deleteBtn.style.marginLeft = '2px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Supprimer définitivement le dossier "${folder.name}" et tout son contenu ?`)) return;
      chrome.storage.local.get({ memorizeData: { folders: {}, words: {} } }, (data) => {
        let { folders, words } = data.memorizeData;
        function deleteFolderRecursivelyById(folderId) {
          const f = folders[folderId];
          if (!f) return;
          for (const wordId of f.words) {
            delete words[wordId];
          }
          for (const childId of f.children) {
            deleteFolderRecursivelyById(childId);
          }
          delete folders[folderId];
          for (const id in folders) {
            const idx = folders[id].children.indexOf(folderId);
            if (idx !== -1) folders[id].children.splice(idx, 1);
          }
        }
        let folderId = null;
        for (const id in folders) {
          if (folders[id].name === folder.name) {
            folderId = id;
            break;
          }
        }
        if (folderId) {
          deleteFolderRecursivelyById(folderId);
          chrome.storage.local.set({ memorizeData: { folders, words } }, () => {
            loadAndDisplayHistory();
          });
        }
      });
    });
  }

  // Construction du titre dossier : case à cocher, icône, nom, poubelle, plus
  // Eviter d'utiliser innerHTML après avoir ajouté des éléments, sinon les listeners sont perdus
  while (titleDiv.firstChild) titleDiv.removeChild(titleDiv.firstChild);
  titleDiv.appendChild(folderCheckbox);
  const iconSpan = document.createElement('span');
  iconSpan.className = 'folder-icon';
  iconSpan.textContent = '📁';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'folder-name';
  nameSpan.textContent = folder.name;
  // espace entre checkbox et icônes
  const spaceNode = document.createTextNode(' ');
  titleDiv.appendChild(spaceNode);
  titleDiv.appendChild(iconSpan);
  titleDiv.appendChild(document.createTextNode(' '));
  titleDiv.appendChild(nameSpan);
  if (deleteBtn) titleDiv.appendChild(deleteBtn);
  
  // Bouton ajouter sous-dossier : seulement pour dossiers de langue (pas Racine)
  if (folder.name !== 'Racine') {
    const addSubfolderBtn = document.createElement('button');
    addSubfolderBtn.textContent = '+';
    addSubfolderBtn.title = 'Ajouter un sous-dossier';
    addSubfolderBtn.className = 'add-subfolder-btn';
    addSubfolderBtn.style.marginLeft = '2px';
    addSubfolderBtn.style.fontSize = '1em';
    addSubfolderBtn.style.padding = '0 6px';
    addSubfolderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const subfolderName = prompt('Nom du nouveau sous-dossier :');
      if (!subfolderName) return;
      for (const id in allFolders) {
        if (allFolders[id].name === subfolderName) {
          alert('Un dossier avec ce nom existe déjà.');
          return;
        }
      }
      chrome.storage.local.get({ memorizeData: { folders: {}, words: {} } }, (data) => {
        const { folders, words } = data.memorizeData;
        const newId = 'f_' + Date.now() + '_' + Math.floor(Math.random()*10000);
        folders[newId] = { name: subfolderName, children: [], words: [] };
        for (const id in folders) {
          if (folders[id].name === folder.name) {
            folders[id].children.push(newId);
            break;
          }
        }
        chrome.storage.local.set({ memorizeData: { folders, words } }, () => {
          loadAndDisplayHistory();
        });
      });
    });
  if (deleteBtn) titleDiv.appendChild(addSubfolderBtn);
  }
  
  folderLi.appendChild(titleDiv);
  const contentUl = document.createElement('ul');
  contentUl.className = 'folder-content';
  contentUl.style.display = 'none';

  // 1. Récupérer tous les mots des enfants (récursif)
  const childWordSet = new Set();
  for (const childId of folder.children) {
    const childFolder = allFolders[childId];
    if (childFolder) {
      getAllWordsRecursively(childFolder, allFolders, childWordSet);
    }
  }
  
  // 2. Afficher les mots du dossier courant qui ne sont pas dans les enfants
  for (const wordId of folder.words) {
    if (!childWordSet.has(wordId) && allWords[wordId]) {
      contentUl.appendChild(createWordView(allWords[wordId]));
    }
  }
  
  // 3. Afficher les dossiers enfants
  for (const childId of folder.children) {
    contentUl.appendChild(createFolderView(allFolders[childId], allFolders, allWords, depth + 1));
  }
  
  folderLi.appendChild(contentUl);
  
  titleDiv.addEventListener('click', (e) => {
    // Ne pas déclencher le clic si on clique sur une checkbox ou un bouton
    if (e.target.type === 'checkbox' || e.target.tagName === 'BUTTON') {
      return;
    }
    
    const isExpanded = contentUl.style.display === 'block';
    contentUl.style.display = isExpanded ? 'none' : 'block';
    titleDiv.querySelector('.folder-icon').textContent = isExpanded ? '📁' : '📂';
  });
  
  return folderLi;
}

// Récupère tous les mots d'un dossier et de ses enfants (récursif)
/**
 * Récupère récursivement tous les mots d'un dossier et de ses sous-dossiers.
 * @param {Object} folder - Le dossier à analyser
 * @param {Object} allFolders - Dictionnaire de tous les dossiers
 * @param {Set} wordSet - Set pour collecter les IDs des mots
 */
function getAllWordsRecursively(folder, allFolders, wordSet) {
  if (!folder) return;
  
  // Ajouter les mots directs du dossier
  if (folder.words && Array.isArray(folder.words)) {
    folder.words.forEach(wordId => {
      if (wordId) {
        wordSet.add(wordId);
      }
    });
  }
  
  // Récursion sur les sous-dossiers
  if (folder.children && Array.isArray(folder.children)) {
    folder.children.forEach(childId => {
      const childFolder = allFolders[childId];
      if (childFolder) {
        getAllWordsRecursively(childFolder, allFolders, wordSet);
      }
    });
  }
}


/**
 * Crée la vue d'un mot dans l'interface utilisateur
 * @param {Object} wordData - Données du mot
 * @returns {HTMLElement} L'élément li représentant le mot
 */
function createWordView(wordData) {
  const li = document.createElement('li');
  li.className = 'word-item';
  
  // Stocker l'ID du mot dans l'élément
  const wordId = wordData.original.toLowerCase();
  li.dataset.wordId = wordId;
  
  // Case à cocher pour la sélection
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'word-checkbox';
  checkbox.style.marginRight = '6px';
  
  // Gestion de la sélection du mot
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selectedWordIds.add(wordId);
    } else {
      selectedWordIds.delete(wordId);
    }
    updateDeleteSelectedButton();
  });
  
  // Construction de la ligne du mot avec le compteur de vues
  const itemTitle = document.createElement('div');
  itemTitle.className = 'item-title';
  
  // Compteur de vues
  const countSpan = document.createElement('span');
  countSpan.className = 'word-count';
  countSpan.style.minWidth = '2.2em';
  countSpan.style.display = 'inline-block';
  countSpan.style.textAlign = 'right';
  countSpan.style.fontWeight = '600';
  countSpan.textContent = `(${wordData.count}) `;
  
  // Mot et traduction
  const wordContent = document.createElement('span');
  wordContent.innerHTML = `<b>${wordData.original}</b> → ${wordData.translated}`;
  
  // Assembler la ligne
  itemTitle.appendChild(checkbox);
  itemTitle.appendChild(countSpan);
  itemTitle.appendChild(wordContent);
  li.appendChild(itemTitle);
  
  // Gestion de l'affichage des détails (occurrences)
  li.addEventListener('click', (e) => {
    // Ne pas réagir aux clics sur les liens, checkboxes ou zone de détails
    if (e.target.closest('.details-div') || 
        e.target.tagName === 'A' || 
        e.target.classList.contains('word-checkbox')) {
      return;
    }
    
    li.classList.toggle('expanded');
    let detailsDiv = li.querySelector('.details-div');
    
    if (detailsDiv) {
      detailsDiv.remove();
    } else {
      detailsDiv = document.createElement('div');
      detailsDiv.className = 'details-div';
      
      // Afficher chaque occurrence du mot
      wordData.occurrences.forEach(occ => {
        const p = document.createElement('p');
        p.innerHTML = `
          Trouvé sur: <a href="${occ.url}" target="_blank">${occ.url.substring(0, 40)}...</a><br>
          Contexte: <em>${occ.context.substring(0, 100)}...</em>
        `;
        detailsDiv.appendChild(p);
      });
      
      li.appendChild(detailsDiv);
    }
  });
  
  return li;
}

/**
 * Obtient tous les mots d'un dossier et de ses sous-dossiers sous forme de tableau.
 * @param {Object} folder - Le dossier à analyser
 * @param {Object} allFolders - Dictionnaire de tous les dossiers
 * @returns {string[]} Liste des IDs de mots sans doublons
 */
function getAllWordsInHierarchy(folder, allFolders) {
  if (!folder) return [];
  
  // Créer un Set pour stocker les IDs uniques des mots
  const wordSet = new Set();
  
  // Si le dossier contient directement des mots, les ajouter au Set
  if (folder.words && Array.isArray(folder.words)) {
    folder.words.forEach(wordId => wordSet.add(wordId));
  }
  
  // Récupérer récursivement les mots des sous-dossiers
  getAllWordsRecursively(folder, allFolders, wordSet);
  
  // Convertir le Set en tableau et le retourner
  return Array.from(wordSet);
}

/**
 * Met à jour les cases à cocher de mots dans un sous-arbre DOM et déclenche 'change'
 * pour synchroniser selectedWordIds via leurs listeners individuels.
 */
function updateWordCheckboxesInElement(rootElement, checked) {
  if (!rootElement) return;
  const checkboxes = rootElement.querySelectorAll('input.word-checkbox');
  checkboxes.forEach(cb => {
    // Eviter les dispatch inutiles si l'état est déjà correct
    if (cb.checked !== checked) {
      cb.checked = checked;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}
