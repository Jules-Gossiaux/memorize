// Gestion de l'affichage et des interactions de l'historique, dossiers et mots
import { loadHistory } from './history.js';

// --- Fonctions utilitaires mutualisées ---
function getAllWordsRecursively(folder, allFolders, wordSet) {
  if (!folder) return;
  if (folder.words && Array.isArray(folder.words)) {
    folder.words.forEach(wordId => {
      if (wordId) wordSet.add(wordId);
    });
  }
  if (folder.children && Array.isArray(folder.children)) {
    folder.children.forEach(childId => {
      const childFolder = allFolders[childId];
      if (childFolder) getAllWordsRecursively(childFolder, allFolders, wordSet);
    });
  }
}

function getAllWordsInHierarchy(folder, allFolders) {
  if (!folder) return [];
  const wordSet = new Set();
  if (folder.words && Array.isArray(folder.words)) {
    folder.words.forEach(wordId => wordSet.add(wordId));
  }
  getAllWordsRecursively(folder, allFolders, wordSet);
  return Array.from(wordSet);
}

function updateWordCheckboxesInElement(rootElement, checked) {
  if (!rootElement) return;
  const checkboxes = rootElement.querySelectorAll('input.word-checkbox');
  checkboxes.forEach(cb => {
    if (cb.checked !== checked) {
      cb.checked = checked;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

// --- Affichage arborescent de l'historique ---
export function displayHistory(data, historyDivElement, updateDeleteSelectedButton, selectedWordIds, selectedFolderIds, refreshFn) {
  historyDivElement.innerHTML = '';
  selectedWordIds.clear();
  selectedFolderIds.clear();
  const { folders, words } = data;
  if (!folders || !folders.root) {
    historyDivElement.textContent = "L'historique est vide.";
    updateDeleteSelectedButton();
    return;
  }
  const rootUl = createFolderView(folders.root, folders, words, 0, updateDeleteSelectedButton, selectedWordIds, selectedFolderIds, refreshFn);
  historyDivElement.appendChild(rootUl);
}

function createFolderView(folder, allFolders, allWords, depth, updateDeleteSelectedButton, selectedWordIds, selectedFolderIds, refreshFn) {
  const folderLi = document.createElement('li');
  folderLi.className = 'folder-item';
  folderLi.style.paddingLeft = `${depth * 20}px`;
  const titleDiv = document.createElement('div');
  titleDiv.className = 'item-title';
  const folderCheckbox = document.createElement('input');
  folderCheckbox.type = 'checkbox';
  folderCheckbox.className = 'folder-checkbox';
  folderCheckbox.style.marginRight = '6px';
  const folderId = Object.keys(allFolders).find(id => allFolders[id] === folder);
  folderCheckbox.dataset.folderId = folderId;
  folderCheckbox.addEventListener('change', () => {
    const ul = folderLi.querySelector('ul.folder-content');
    if (!ul) return;
    if (folderCheckbox.checked) {
      selectedFolderIds.add(folderId);
    } else {
      selectedFolderIds.delete(folderId);
    }
    if (folderCheckbox.checked && ul.style.display !== 'block') {
      ul.style.display = 'block';
      titleDiv.querySelector('.folder-icon').textContent = '📂';
    }
    const allFolderWords = getAllWordsInHierarchy(folder, allFolders);
    allFolderWords.forEach(wordId => {
      if (folderCheckbox.checked) {
        selectedWordIds.add(wordId);
      } else {
        selectedWordIds.delete(wordId);
      }
    });
    updateWordCheckboxesInElement(ul, folderCheckbox.checked);
    updateDeleteSelectedButton();
  });
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
            if (typeof refreshFn === 'function') refreshFn();
          });
        }
      });
    });
  }
  while (titleDiv.firstChild) titleDiv.removeChild(titleDiv.firstChild);
  titleDiv.appendChild(folderCheckbox);
  const iconSpan = document.createElement('span');
  iconSpan.className = 'folder-icon';
  iconSpan.textContent = '📁';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'folder-name';
  nameSpan.textContent = folder.name;
  const spaceNode = document.createTextNode(' ');
  titleDiv.appendChild(spaceNode);
  titleDiv.appendChild(iconSpan);
  titleDiv.appendChild(document.createTextNode(' '));
  titleDiv.appendChild(nameSpan);
  if (deleteBtn) titleDiv.appendChild(deleteBtn);
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
          if (typeof refreshFn === 'function') refreshFn();
        });
      });
    });
    titleDiv.appendChild(addSubfolderBtn);
  }
  if (folder.name === 'Racine') {
    const addLangFolderBtn = document.createElement('button');
    addLangFolderBtn.textContent = '+';
    addLangFolderBtn.title = 'Ajouter un dossier langue à la racine';
    addLangFolderBtn.className = 'add-langfolder-btn';
    addLangFolderBtn.style.marginLeft = '8px';
    addLangFolderBtn.style.fontSize = '1em';
    addLangFolderBtn.style.padding = '0 6px';
    addLangFolderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let lang = 'fr';
      const select = document.getElementById('source-lang-select');
      if (select && select.value) lang = select.value;
      for (const id in allFolders) {
        if (allFolders[id].name === lang) {
          alert('Un dossier pour cette langue existe déjà.');
          return;
        }
      }
      chrome.storage.local.get({ memorizeData: { folders: {}, words: {} } }, (data) => {
        const { folders, words } = data.memorizeData;
        const newId = 'f_' + Date.now() + '_' + Math.floor(Math.random()*10000);
        folders[newId] = { name: lang, children: [], words: [] };
        folders.root.children.push(newId);
        chrome.storage.local.set({ memorizeData: { folders, words } }, () => {
          if (typeof refreshFn === 'function') refreshFn();
        });
      });
    });
    titleDiv.appendChild(addLangFolderBtn);
  }
  folderLi.appendChild(titleDiv);
  const contentUl = document.createElement('ul');
  contentUl.className = 'folder-content';
  contentUl.style.display = 'none';
  const childWordSet = new Set();
  for (const childId of folder.children) {
    const childFolder = allFolders[childId];
    if (childFolder) getAllWordsRecursively(childFolder, allFolders, childWordSet);
  }
  for (const wordId of folder.words) {
    if (!childWordSet.has(wordId) && allWords[wordId]) {
      contentUl.appendChild(createWordView(allWords[wordId], updateDeleteSelectedButton, selectedWordIds));
    }
  }
  for (const childId of folder.children) {
    contentUl.appendChild(createFolderView(allFolders[childId], allFolders, allWords, depth + 1, updateDeleteSelectedButton, selectedWordIds, selectedFolderIds, refreshFn));
  }
  folderLi.appendChild(contentUl);
  titleDiv.addEventListener('click', (e) => {
    if (e.target.type === 'checkbox' || e.target.tagName === 'BUTTON') return;
    const isExpanded = contentUl.style.display === 'block';
    contentUl.style.display = isExpanded ? 'none' : 'block';
    titleDiv.querySelector('.folder-icon').textContent = isExpanded ? '📁' : '📂';
  });
  return folderLi;
}

function createWordView(wordData, updateDeleteSelectedButton, selectedWordIds) {
  const li = document.createElement('li');
  li.className = 'word-item';
  const wordId = wordData.original.toLowerCase();
  li.dataset.wordId = wordId;
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'word-checkbox';
  checkbox.style.marginRight = '6px';
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selectedWordIds.add(wordId);
    } else {
      selectedWordIds.delete(wordId);
    }
    updateDeleteSelectedButton();
  });
  const itemTitle = document.createElement('div');
  itemTitle.className = 'item-title';
  const countSpan = document.createElement('span');
  countSpan.className = 'word-count';
  countSpan.style.minWidth = '2.2em';
  countSpan.style.display = 'inline-block';
  countSpan.style.textAlign = 'right';
  countSpan.style.fontWeight = '600';
  countSpan.textContent = `(${wordData.count}) `;
  const wordContent = document.createElement('span');
  wordContent.innerHTML = `<b>${wordData.original}</b> → ${wordData.translated}`;
  itemTitle.appendChild(checkbox);
  itemTitle.appendChild(countSpan);
  itemTitle.appendChild(wordContent);
  li.appendChild(itemTitle);
  li.addEventListener('click', (e) => {
    if (e.target.closest('.details-div') || e.target.tagName === 'A' || e.target.classList.contains('word-checkbox')) return;
    li.classList.toggle('expanded');
    let detailsDiv = li.querySelector('.details-div');
    if (detailsDiv) {
      detailsDiv.remove();
    } else {
      detailsDiv = document.createElement('div');
      detailsDiv.className = 'details-div';
      wordData.occurrences.forEach(occ => {
        const p = document.createElement('p');
        p.innerHTML = `Trouvé sur: <a href="${occ.url}" target="_blank">${occ.url.substring(0, 40)}...</a><br>Contexte: <em>${occ.context.substring(0, 100)}...</em>`;
        detailsDiv.appendChild(p);
      });
      li.appendChild(detailsDiv);
    }
  });
  return li;
}

export function loadAndDisplayHistory(historyDivElement, updateDeleteSelectedButton, selectedWordIds, selectedFolderIds, refreshFn) {
  loadHistory().then(data => {
    displayHistory(data, historyDivElement, updateDeleteSelectedButton, selectedWordIds, selectedFolderIds, refreshFn);
  });
}
