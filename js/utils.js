/**
 * utils.js — wspólne funkcje pomocnicze.
 * Ładowane jako pierwszy plik JS — nie ma zależności.
 */

const Utils = (function() {

  /**
   * Bezpieczny escape HTML — używamy wszędzie gdzie wstawiamy treść użytkownika.
   * Zapobiega XSS.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Renderuje widok podmienia zawartość #main.
   * Wszystkie widoki powinny używać tej funkcji dla spójności.
   */
  function renderView(html) {
    const main = document.getElementById('main');
    if (!main) {
      console.error('Brak elementu #main');
      return;
    }
    main.innerHTML = html;
    // Focus na pierwszym <h1> dla czytników ekranu (WCAG)
    const h1 = main.querySelector('h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      setTimeout(() => h1.focus(), 0);
    }
  }

  /**
   * Pokazuje komunikat toast (alert) — na razie najprostsza wersja przez natywny alert.
   * W Etapie 1 zastąpię go lepszym komponentem.
   */
  function toast(message, type) {
    type = type || 'info';
    console.log('[' + type + '] ' + message);
    // MVP: na razie używamy alertu w błędach, dla info tylko console.
    if (type === 'error') {
      alert(message);
    }
  }

  /**
   * Zarządzanie motywem (jasny / ciemny / wysoki kontrast).
   * Zapisuje wybór w localStorage, stosuje klasę do <html>.
   */
  function applyTheme(themeName) {
    const html = document.documentElement;
    html.classList.remove('high-contrast');

    if (themeName === 'high-contrast') {
      html.classList.add('high-contrast');
      html.setAttribute('data-theme', 'dark');
    } else if (themeName === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.setAttribute('data-theme', 'light');
    }

    try {
      localStorage.setItem('theme', themeName);
    } catch (e) {
      // prywatny mode, ignorujemy
    }
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch (e) {
      return 'light';
    }
  }

  /**
   * Zarządzanie sesją w sessionStorage.
   * Po zamknięciu przeglądarki sesja znika — kolejne odwiedziny wymagają re-whoami.
   */
  function setSessionUser(user) {
    try {
      sessionStorage.setItem('user', JSON.stringify(user));
    } catch (e) {}
  }
  function getSessionUser() {
    try {
      const raw = sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function clearSessionUser() {
    try {
      sessionStorage.removeItem('user');
    } catch (e) {}
  }

  // Publiczny API modułu
  return {
    escapeHtml: escapeHtml,
    renderView: renderView,
    toast: toast,
    applyTheme: applyTheme,
    getStoredTheme: getStoredTheme,
    setSessionUser: setSessionUser,
    getSessionUser: getSessionUser,
    clearSessionUser: clearSessionUser
  };
})();
