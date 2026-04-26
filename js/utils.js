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
   * Pokazuje komunikat — używa Toast jeśli dostępny, inaczej console.
   * (Toast może nie być załadowany przy pierwszym renderze).
   */
  function toast(message, type) {
    type = type || 'info';
    if (typeof Toast !== 'undefined' && Toast[type]) {
      Toast[type](message);
    } else {
      console.log('[' + type + '] ' + message);
    }
  }

  /**
   * Pobiera plik CSV po stronie klienta.
   * Format: UTF-8 z BOM, separator średnik (Excel PL friendly).
   *
   * @param {string} filename - nazwa pliku
   * @param {Array<string>} headers - nagłówki kolumn
   * @param {Array<Array<any>>} rows - wiersze danych
   */
  function downloadCsv(filename, headers, rows) {
    const SEP = ';';
    const BOM = '\uFEFF';
    const escape = function(v) {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.indexOf(SEP) !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const lines = [];
    // Komentarz z metadanymi (Excel zignoruje wiersz zaczynający się od #)
    lines.push('# Eksport z Stodoła CRM, ' + new Date().toLocaleString('pl-PL'));
    lines.push(headers.map(escape).join(SEP));
    rows.forEach(function(row) {
      lines.push(row.map(escape).join(SEP));
    });

    const csv = BOM + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 100);
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
    downloadCsv: downloadCsv,
    applyTheme: applyTheme,
    getStoredTheme: getStoredTheme,
    setSessionUser: setSessionUser,
    getSessionUser: getSessionUser,
    clearSessionUser: clearSessionUser
  };
})();
