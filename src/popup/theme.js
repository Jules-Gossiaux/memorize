// Gestion du thème clair/sombre pour la popup

/**
 * Applique le thème (clair/sombre) à la popup.
 * @param {string} theme - 'light' ou 'dark'
 * @param {HTMLElement} [themeCheckbox] - Checkbox à synchroniser
 * @param {HTMLElement} [themeIcon] - Icône à synchroniser
 */
export function updateTheme(theme, themeCheckbox, themeIcon) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  if (themeCheckbox) themeCheckbox.checked = (theme === 'dark');
  if (themeIcon) themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

/**
 * Initialise la gestion du thème (checkbox, icône, stockage)
 * @param {HTMLElement} themeCheckbox
 * @param {HTMLElement} themeIcon
 */
export function initTheme(themeCheckbox, themeIcon) {
  chrome.storage.sync.get('theme', (data) => {
    const currentTheme = data.theme || 'light';
    updateTheme(currentTheme, themeCheckbox, themeIcon);
  });
  if (themeCheckbox) {
    themeCheckbox.addEventListener('change', () => {
      const newTheme = themeCheckbox.checked ? 'dark' : 'light';
      chrome.storage.sync.set({ theme: newTheme });
      updateTheme(newTheme, themeCheckbox, themeIcon);
    });
  }
}
