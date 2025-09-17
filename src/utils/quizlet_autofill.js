
// Content script Quizlet autofill : IIFE pour éviter pollution globale et double injection
(function() {
  if (window.__memorizeQuizletAutofillLoaded) return;
  window.__memorizeQuizletAutofillLoaded = true;

  // --- Variables internes ---
  const DEBOUNCE_MS = 700;
  function debug() {}

  // Mutualisé : voir src/utils/helpers.js pour la source unique de vérité
  async function translateText(text, sourceLang = 'fr', targetLang = 'en') {
    // Copie stricte de la fonction helpers.translateText (pas d'import possible en content script)
    if (!text || !text.trim()) return '';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    } catch (e) {}
    return '';
  }

  // Mutualisé : voir src/utils/preferences.js pour la source unique de vérité
  function getLangPrefs() {
    // Copie stricte de src/utils/preferences.js (pas d'import possible en content script)
    return new Promise(resolve => {
      chrome.storage.sync.get('memorizeLangPrefs', data => {
        resolve(data['memorizeLangPrefs'] || { source: 'en', target: 'fr' });
      });
    });
  }

  function getEnabledFlag() {
    // Copie stricte de src/utils/preferences.js (pas d'import possible en content script)
    return new Promise(resolve => {
      chrome.storage.sync.get('quizletAutofillEnabled', data => {
        resolve(Boolean(data['quizletAutofillEnabled']));
      });
    });
  }

  function isEmptyProse(editor) {
    if (!editor) return true;
    const text = editor.textContent || '';
    return text.trim() === '';
  }

  function setProseContent(editor, html) {
    if (!editor) return;
    editor.innerHTML = `<p>${html}</p>`;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function findRows() {
    const rows = [];
    const wordContainers = document.querySelectorAll('div[label="word"]');
    wordContainers.forEach(wc => {
      let parent = wc.parentElement;
      while (parent && !parent.querySelector('div[label="definition"]')) {
        parent = parent.parentElement;
      }
      if (parent) rows.push(parent);
    });
    return rows;
  }

  function attachToRow(row, prefs) {
    try {
      const sourceEditor = row.querySelector('div[label="word"] .ProseMirror[contenteditable="true"]') || row.querySelector('div[label="word"] .ProseMirror');
      const targetEditor = row.querySelector('div[label="definition"] .ProseMirror[contenteditable="true"]') || row.querySelector('div[label="definition"] .ProseMirror');
      if (!sourceEditor || !targetEditor) return null;

      let timer = null;
      // On stocke la référence du callback pour pouvoir le retirer
      const onChange = async () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const text = (sourceEditor.textContent || '').trim();
          if (!text) return;
          if (!isEmptyProse(targetEditor)) return;
          const translated = await translateText(text, prefs.source || 'en', prefs.target || 'fr');
          if (translated) {
            const escaped = translated.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            setProseContent(targetEditor, escaped);
            debug('filled', text, '->', translated);
          }
        }, DEBOUNCE_MS);
      };

      const mo = new MutationObserver(onChange);
      mo.observe(sourceEditor, { childList: true, subtree: true, characterData: true });
      sourceEditor.addEventListener('input', onChange);
      // On retourne la référence du callback pour pouvoir le retirer
      return { mo, sourceEditor, targetEditor, onChange };
    } catch (e) {
      debug('attach error', e);
      return null;
    }
  }

  let attached = new Map();
  let globalObserver = null;

  async function startAutofill() {
    const enabled = await getEnabledFlag();
    if (!enabled) return stopAutofill();
    const prefs = await getLangPrefs();
    debug('startAutofill', prefs);
    const rows = findRows();
    rows.forEach(row => {
      if (attached.has(row)) return;
      const info = attachToRow(row, prefs);
      if (info) attached.set(row, info);
    });
    if (!globalObserver) {
      globalObserver = new MutationObserver(async (mutList) => {
        for (const m of mutList) {
          if (m.addedNodes && m.addedNodes.length) {
            const prefs2 = await getLangPrefs();
            m.addedNodes.forEach(node => {
              if (!(node instanceof HTMLElement)) return;
              if (node.querySelector && (node.querySelector('div[label="word"]') || node.querySelector('div[label="definition"]'))) {
                let row = node;
                while (row && !row.querySelector('div[label="word"]')) row = row.parentElement;
                if (row && !attached.has(row)) {
                  const info = attachToRow(row, prefs2);
                  if (info) attached.set(row, info);
                }
              }
            });
          }
        }
      });
      globalObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  function stopAutofill() {
    if (!(attached instanceof Map)) attached = new Map();
    attached.forEach((info, row) => {
      try {
        if (info.mo) info.mo.disconnect();
        if (info.sourceEditor && info.onChange) info.sourceEditor.removeEventListener('input', info.onChange);
      } catch (e) {}
    });
    attached = new Map();
    if (globalObserver) {
      globalObserver.disconnect();
      globalObserver = null;
    }
  }

  // Listener messages popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.action) return;
    if (msg.action === 'setEnabled') {
      if (msg.enabled) startAutofill(); else stopAutofill();
      try { sendResponse && sendResponse({ ok: true }); } catch (e) {}
      return true;
    }
    if (msg.action === 'applyNow') {
      startAutofill();
      try { sendResponse && sendResponse({ ok: true }); } catch (e) {}
      return true;
    }
  });

  // Au chargement, démarrer si activé
  (async () => {
    try {
      const enabled = await getEnabledFlag();
      if (enabled) startAutofill();
    } catch (e) {
      debug('startup error', e);
    }
  })();

})();
