// Fonctions liées à l'UI de la popup

import { translateText } from './translation.js';
import { getLangPrefs, setLangPrefs, getAutofillEnabled, setAutofillEnabled } from '../utils/preferences.js';
import { saveTranslation, loadHistory, getHistory } from './history.js';
import { getSelectionDetails } from './selection.js';
import { initTheme } from './theme.js';
import { loadAndDisplayHistory } from './history_ui.js';
// Réexporte updateTheme pour compat rétro si un import obsolète existe ailleurs
export { updateTheme } from './theme.js';

// --- UI Elements ---

let mainView, themeCheckbox, themeIcon, translateButton, historyDiv, resetButton;
let translationSaveContainer, translationResult;
let folderMoveSelect, newFolderMoveNameInput;
let sourceLangSelect, targetLangSelect;
let deleteSelectedButton, selectedCountSpan;
let quizletListTranslateButton;
let currentTranslationData = {};
let quizletAutofillToggle, applyQuizletNowButton;




export function initUI() {
  // Elements
  mainView = document.getElementById('main-view');
  themeCheckbox = document.getElementById('theme-checkbox');
  themeIcon = document.getElementById('theme-icon');
  // Initialisation du thème (déléguée au module theme.js)
  initTheme(themeCheckbox, themeIcon);
  translateButton = document.getElementById('translate-button');
  // translationOutput supprimé (plus dans le HTML)
  translationSaveContainer = document.getElementById('translation-save-container');
  translationResult = document.getElementById('translation-result');
  folderMoveSelect = document.getElementById('folder-move-select');
  newFolderMoveNameInput = document.getElementById('new-folder-move-name');
  historyDiv = document.getElementById('history');
  resetButton = document.getElementById('reset-button');

  sourceLangSelect = document.getElementById('source-lang-select');
  targetLangSelect = document.getElementById('target-lang-select');
  quizletAutofillToggle = document.getElementById('quizlet-autofill-toggle');
  applyQuizletNowButton = document.getElementById('apply-quizlet-now');

  deleteSelectedButton = document.getElementById('delete-selected-button');
  selectedCountSpan = document.getElementById('selected-count');

  quizletListTranslateButton = document.getElementById('quizlet-list-translate-button');
  if (quizletListTranslateButton) {
    quizletListTranslateButton.addEventListener('click', handleQuizletListTranslate);
    // Par défaut, désactive le bouton
    quizletListTranslateButton.classList.add('transparent');
    quizletListTranslateButton.disabled = true;
    // Vérifie si l'onglet actif est une page Quizlet compatible
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url && tab.url.includes('quizlet.com')) {
        quizletListTranslateButton.classList.remove('transparent');
        quizletListTranslateButton.disabled = false;
      }
    });
  }

  // Initialisation de l'historique (déléguée au module history_ui.js)
  // Les sets sont utilisés pour la sélection (à compléter selon besoins)
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
  // Wrapper de rafraîchissement de l'historique pour simplifier les appels
  function refreshHistory() {
    loadAndDisplayHistory(historyDiv, updateDeleteSelectedButton, selectedWordIds, selectedFolderIds, refreshHistory);
  }
  // Rendre accessible dans la portée des handlers ci-dessous
  window.__memorizeRefreshHistory = refreshHistory;
  refreshHistory();
// Handler pour le bouton "Traduire la liste"
async function handleQuizletListTranslate() {
  if (quizletListTranslateButton.disabled) return;
  // Récupère les langues sélectionnées
  const sourceLang = sourceLangSelect ? sourceLangSelect.value : 'fr';
  const targetLang = targetLangSelect ? targetLangSelect.value : 'en';
  // Injection du script dans l'onglet Quizlet
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (sourceLang, targetLang) => {
        // Récupère tous les couples (mot source, champ traduction vide)
        const rows = Array.from(document.querySelectorAll('.ProseMirror'));
        // On suppose alternance : source, traduction, source, traduction...
        let pairs = [];
        for (let i = 0; i < rows.length - 1; i += 2) {
          const sourceDiv = rows[i];
          const targetDiv = rows[i + 1];
          const sourceText = sourceDiv.innerText.trim();
          const targetText = targetDiv.innerText.trim();
          if (sourceText && (!targetText || targetText === '\u200b' || targetText === '')) {
            pairs.push({ sourceDiv, targetDiv, sourceText });
          }
        }
        if (pairs.length === 0) {
          alert('Aucune case à compléter trouvée.');
          return;
        }
        // Fonction de traduction via API MyMemory
        async function translate(text, sourceLang, targetLang) {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
          }
          return '';
        }
        for (const { sourceDiv, targetDiv, sourceText } of pairs) {
          try {
            const translated = await translate(sourceText, sourceLang, targetLang);
            // Remplit le champ cible (ProseMirror)
            targetDiv.innerHTML = `<p>${translated}</p>`;
            // Simule un événement d'entrée pour déclencher la sauvegarde Quizlet
            const event = new Event('input', { bubbles: true });
            targetDiv.dispatchEvent(event);
          } catch (e) {
            targetDiv.innerHTML = `<p>Erreur traduction</p>`;
          }
        }
        alert('Complétion automatique terminée !');
      },
      args: [sourceLang, targetLang]
    });
  });
}
  // Persistance du choix de langue (optionnel)
  if (sourceLangSelect && targetLangSelect) {
    getLangPrefs().then(({ source, target }) => {
      if (source) sourceLangSelect.value = source;
      if (target) targetLangSelect.value = target;
    });
    function updateLangPrefs() {
      setLangPrefs(sourceLangSelect.value, targetLangSelect.value);
    }
    sourceLangSelect.addEventListener('change', updateLangPrefs);
    targetLangSelect.addEventListener('change', updateLangPrefs);
  }

  // Quizlet autofill toggle
  if (quizletAutofillToggle) {
    getAutofillEnabled().then(enabled => {
      quizletAutofillToggle.checked = enabled;
    });
    quizletAutofillToggle.addEventListener('change', () => {
      const enabled = quizletAutofillToggle.checked;
      setAutofillEnabled(enabled);
      // Envoyer message aux onglets Quizlet pour activer/désactiver (robuste)
      robustSendMessageToQuizletTabs({ action: 'setEnabled', enabled });
    });
  }

  if (applyQuizletNowButton) {
    applyQuizletNowButton.addEventListener('click', () => {
      robustSendMessageToQuizletTabs({ action: 'applyNow' });
    });
  }

  /**
   * Envoie un message à tous les onglets Quizlet, avec fallback d'injection
   * si le content script n'est pas présent (évite "Could not establish connection").
   * @param {Object} message
   */
  function robustSendMessageToQuizletTabs(message) {
    chrome.tabs.query({ url: '*://*.quizlet.com/*' }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      tabs.forEach(tab => {
        if (!tab.id) return;
        // Première tentative
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          // Toujours consommer lastError pour éviter "Unchecked runtime.lastError"
          const err = chrome.runtime.lastError;
          if (!err) return; // tout va bien
          // Si le port s'est fermé avant une réponse, c'est généralement non fatal. Si c'est une autre erreur,
          // on tente l'injection du content script et on renvoie après un court délai.
          const msg = (err && err.message) || '';
          if (msg.includes('The message port closed before a response was received')) {
            // rien à faire de plus
            return;
          }
          // Tenter d'injecter puis renvoyer après un petit délai
          try {
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/utils/quizlet_autofill.js'] }, () => {
              // Petite attente pour laisser le script s'installer
              setTimeout(() => {
                try { chrome.tabs.sendMessage(tab.id, message, (r) => { /* consume lastError */ if (chrome.runtime.lastError) {/* ignore */} }); } catch (e) {}
              }, 350);
            });
          } catch (e) {
            // ignore
          }
        });
      });
    });
  }

  // Theme
  // La gestion du thème est entièrement déléguée à initTheme (voir theme.js)

  // Listeners
  resetButton.addEventListener('click', handleResetHistory);
  if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelected);

  // Gestion du déplacement via le dérouleur sous la traduction
  if (folderMoveSelect) {
    folderMoveSelect.addEventListener('change', handleMoveFolderChange);
  }
  if (newFolderMoveNameInput) {
    newFolderMoveNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreateChildFolderAndMove();
      }
    });
  }
  translateButton.addEventListener('click', handleTranslate);

  // Initial load
  translationSaveContainer.style.display = 'none';
  // Initialisation de l'historique via le module dédié
  // Initialisation de l'historique via le module dédié
  function refreshHistory() {
    loadAndDisplayHistory(historyDiv, updateDeleteSelectedButton, selectedWordIds, selectedFolderIds, refreshHistory);
  }
  window.__memorizeRefreshHistory = refreshHistory;
  refreshHistory();
  updateDeleteSelectedButton();

  // --- Suppression des mots sélectionnés ---
  function handleDeleteSelected() {
    if (selectedWordIds.size === 0) {
      alert("Aucun mot sélectionné à supprimer.");
      return;
    }
    const totalWords = selectedWordIds.size;
    if (!confirm(`Supprimer définitivement ${totalWords} mot(s) sélectionné(s) ?`)) return;
    const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
    chrome.storage.local.get({ memorizeData: initialData }, (data) => {
      let { folders, words } = data.memorizeData;
      // Supprimer les mots du dictionnaire et de tous les dossiers
      for (const wordId of selectedWordIds) {
        delete words[wordId];
        for (const folderId in folders) {
          const arr = folders[folderId].words;
          if (Array.isArray(arr)) {
            const idx = arr.indexOf(wordId);
            if (idx !== -1) arr.splice(idx, 1);
          }
        }
      }
      chrome.storage.local.set({ memorizeData: { folders, words } }, () => {
        selectedWordIds.clear();
        selectedFolderIds.clear();
        updateDeleteSelectedButton();
        if (typeof window.__memorizeRefreshHistory === 'function') window.__memorizeRefreshHistory();
      });
    });
  }
  // Brancher le bouton maintenant que le handler est défini dans cette portée
  if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelected);
}

// --- Traduction et sauvegarde ---
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
        if (!selectionText || !selectionText.trim()) {
          translationResult.textContent = "Aucun texte n'est sélectionné.";
          translationSaveContainer.style.display = 'none';
          return;
        }
        // Traduire
        const sourceLang = sourceLangSelect ? sourceLangSelect.value : 'fr';
        const targetLang = targetLangSelect ? targetLangSelect.value : 'en';
        const translatedText = await translateText(selectionText, sourceLang, targetLang);

        // Sauvegarde automatique dans le dossier langue cible
        await saveTranslation(
          selectionText,
          translatedText,
          activeTab.url || '',
          context,
          sourceLang // nom du dossier langue source
        );

        // Récupérer le compteur d'occurrences mis à jour
        const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
        chrome.storage.local.get({ memorizeData: initialData }, (data) => {
          const { words } = data.memorizeData;
          const wordId = selectionText.toLowerCase();
          let count = 0;
          if (words[wordId] && typeof words[wordId].count === 'number') {
            count = words[wordId].count;
          }
          translationResult.innerHTML = `<b>${selectionText}</b> → ${translatedText}` +
            `<div style='font-size:0.95em;color:#888;margin-top:4px;'>Traduit <b>${count}</b> fois</div>`;
          translationSaveContainer.style.display = '';
          // Mémoriser pour la suite (ajout à un autre dossier)
          currentTranslationData = { selectionText, translatedText, sourceURL: activeTab.url || '', context, currentFolder: sourceLang };
          // Déterminer le dossier langue id et mémoriser comme dossier courant
          (async () => {
            const dataMem = await loadHistory();
            const { folders } = dataMem;
            const langId = Object.keys(folders).find(id => (folders[id].name || '').toLowerCase() === sourceLang.toLowerCase());
            currentTranslationData.currentFolderId = langId;
            await populateMoveFolderSelect(sourceLang);
          })();
          // Rafraîchir l’historique
          if (typeof window.__memorizeRefreshHistory === 'function') window.__memorizeRefreshHistory();
        });
      }
    );
  });
}

async function populateMoveFolderSelect(languageName) {
  if (!folderMoveSelect) return;
  const data = await loadHistory(); // { folders, words }
  const { folders } = data;
  // Trouver le dossier langue par nom
  let langFolderId = Object.keys(folders).find(id => (folders[id].name || '').toLowerCase() === (languageName || '').toLowerCase());
  if (!langFolderId) return; // devrait exister car créé par saveTranslation
  const langFolder = folders[langFolderId];
  // Remplir le select: racine langue, enfants, créer…
  folderMoveSelect.innerHTML = '';
  const optRoot = document.createElement('option');
  optRoot.value = `LANG_ROOT:${langFolderId}`;
  optRoot.textContent = 'Dossier langue (racine)';
  folderMoveSelect.appendChild(optRoot);
  // Enfants
  (langFolder.children || []).forEach(childId => {
    const child = folders[childId];
    if (!child) return;
    const opt = document.createElement('option');
    opt.value = `FOLDER:${childId}`;
    opt.textContent = child.name;
    folderMoveSelect.appendChild(opt);
  });
  // Créer
  const optCreate = document.createElement('option');
  optCreate.value = '__create__';
  optCreate.textContent = 'Créer un dossier…';
  folderMoveSelect.appendChild(optCreate);

  // Sélectionner le dossier courant si connu
  if (currentTranslationData.currentFolderId) {
    const val = currentTranslationData.currentFolderId === langFolderId ? `LANG_ROOT:${langFolderId}` : `FOLDER:${currentTranslationData.currentFolderId}`;
    folderMoveSelect.value = val;
  } else {
    folderMoveSelect.value = `LANG_ROOT:${langFolderId}`;
  }
  // Cacher l'input création par défaut
  if (newFolderMoveNameInput) newFolderMoveNameInput.style.display = 'none';
}

async function handleMoveFolderChange() {
  if (!folderMoveSelect) return;
  const value = folderMoveSelect.value;
  if (value === '__create__') {
    if (newFolderMoveNameInput) {
      newFolderMoveNameInput.style.display = 'inline-block';
      newFolderMoveNameInput.focus();
    }
    return;
  }
  // Parse folder id
  const toFolderId = value.startsWith('LANG_ROOT:') ? value.replace('LANG_ROOT:', '') : value.replace('FOLDER:', '');
  const { selectionText } = currentTranslationData || {};
  if (!selectionText) return;
  const wordId = selectionText.toLowerCase();
  const data = await loadHistory();
  const { folders } = data;
  const fromFolderId = currentTranslationData.currentFolderId || null;
  if (!toFolderId || fromFolderId === toFolderId) return;
  // Déplacer: retirer de l'ancien, ajouter au nouveau
  if (fromFolderId && folders[fromFolderId]) {
    folders[fromFolderId].words = (folders[fromFolderId].words || []).filter(w => w !== wordId);
  }
  if (!folders[toFolderId].words.includes(wordId)) {
    folders[toFolderId].words.push(wordId);
  }
  await new Promise(resolve => chrome.storage.local.set({ memorizeData: { folders, words: data.words } }, resolve));
  currentTranslationData.currentFolderId = toFolderId;
  // Rafraîchir historique et re-peupler pour refléter les nouveaux enfants
  if (typeof window.__memorizeRefreshHistory === 'function') window.__memorizeRefreshHistory();
  // Remettre l'input création invisible
  if (newFolderMoveNameInput) newFolderMoveNameInput.style.display = 'none';
}

async function handleCreateChildFolderAndMove() {
  if (!newFolderMoveNameInput || !folderMoveSelect) return;
  const newName = newFolderMoveNameInput.value.trim();
  if (!newName) return;
  const data = await loadHistory();
  const { folders, words } = data;
  const languageName = sourceLangSelect ? sourceLangSelect.value : '';
  const langFolderId = Object.keys(folders).find(id => (folders[id].name || '').toLowerCase() === languageName.toLowerCase());
  if (!langFolderId) return;
  // Créer le dossier enfant
  const newId = 'f_' + Date.now() + '_' + Math.floor(Math.random()*10000);
  folders[newId] = { name: newName, parent: langFolderId, children: [], words: [] };
  folders[langFolderId].children = folders[langFolderId].children || [];
  folders[langFolderId].children.push(newId);
  // Déplacer le mot dans ce nouveau dossier
  const { selectionText } = currentTranslationData || {};
  if (selectionText) {
    const wordId = selectionText.toLowerCase();
    const fromId = currentTranslationData.currentFolderId || langFolderId;
    if (folders[fromId]) {
      folders[fromId].words = (folders[fromId].words || []).filter(w => w !== wordId);
    }
    folders[newId].words.push(wordId);
    currentTranslationData.currentFolderId = newId;
  }
  await new Promise(resolve => chrome.storage.local.set({ memorizeData: { folders, words } }, resolve));
  // UI
  newFolderMoveNameInput.value = '';
  newFolderMoveNameInput.style.display = 'none';
  await populateMoveFolderSelect(languageName);
  folderMoveSelect.value = `FOLDER:${currentTranslationData.currentFolderId}`;
  if (typeof window.__memorizeRefreshHistory === 'function') window.__memorizeRefreshHistory();
}

function handleResetHistory() {
  const confirmation = confirm("Êtes-vous sûr de vouloir vider tout l'historique chronologique ? Cette action est irréversible.");
  if (confirmation) {
    const initialData = { folders: { root: { name: 'Racine', children: [], words: [] } }, words: {} };
    chrome.storage.local.set({ memorizeHistory: [], memorizeData: initialData }, () => {
      if (typeof window.__memorizeRefreshHistory === 'function') window.__memorizeRefreshHistory();
    });
  }
}
