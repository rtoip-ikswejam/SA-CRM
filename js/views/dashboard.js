/**
 * views/dashboard.js — Dashboard (Etap 0: wersja minimalna).
 *
 * Na tym etapie pokazujemy tylko:
 *  - topbar z logo, nazwą usera i rolą
 *  - komunikat powitalny "Witaj [imię]"
 *  - potwierdzenie, że system działa (wersja backendu)
 *  - przycisk wylogowania
 *
 * W Etapie 1 wypełnimy go zgodnie ze specyfikacją (kafelki statystyk, taski itp.).
 */

const DashboardView = (function() {

  function render() {
    const user = Auth.currentUser();
    if (!user) {
      // Nie powinno się zdarzyć, ale defensywnie — wracamy do logowania
      LoginView.render();
      return;
    }

    const firstName = (user.display_name || user.email).split(' ')[0];
    const today = new Date().toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html =
      '<header class="topbar" role="banner">' +
        '<div class="brand">' +
          '<img src="pics/logo-icon.svg" alt="" aria-hidden="true">' +
          '<span>Stodoła Artystów CRM</span>' +
        '</div>' +
        '<div class="user-info">' +
          '<strong>' + Utils.escapeHtml(user.display_name || user.email) + '</strong> ' +
          '(' + Utils.escapeHtml(user.role) + ') ' +
          '<button type="button" id="btn-logout" class="compact-control secondary outline" aria-label="Wyloguj się">Wyloguj</button>' +
        '</div>' +
      '</header>' +

      '<div class="dashboard-container">' +
        '<div class="welcome">' +
          '<h1>Witaj ' + Utils.escapeHtml(firstName) + '!</h1>' +
          '<p>Dziś jest ' + Utils.escapeHtml(today) + '.</p>' +
        '</div>' +

        '<div class="alert alert-success" role="status">' +
          '<strong>System działa poprawnie</strong><br>' +
          'Jesteś zalogowany jako <code>' + Utils.escapeHtml(user.email) + '</code> z rolą <code>' + Utils.escapeHtml(user.role) + '</code>.' +
        '</div>' +

        '<article>' +
          '<h2>Status systemu</h2>' +
          '<p>To jest minimalna wersja systemu (Etap 0 z planu wdrożenia). ' +
          'Na tym etapie zweryfikowaliśmy, że:</p>' +
          '<ul>' +
            '<li>Arkusz Google jest zainicjalizowany (14 zakładek)</li>' +
            '<li>Apps Script backend odpowiada i rozpoznaje użytkowników z whitelisty</li>' +
            '<li>Frontend na GitHub Pages poprawnie komunikuje się z backendem</li>' +
            '<li>Autoryzacja przez OAuth Google działa</li>' +
          '</ul>' +
          '<p>Następny etap (Etap 1 — MVP) wprowadzi:</p>' +
          '<ul>' +
            '<li>Zarządzanie firmami i kontaktami</li>' +
            '<li>Rejestr interakcji z historią</li>' +
            '<li>Uproszczone benefity i taski</li>' +
            '<li>Eksport CSV</li>' +
          '</ul>' +
        '</article>' +

        renderThemeSwitcher() +

      '</div>';

    Utils.renderView(html);
    attachHandlers();
  }

  function renderThemeSwitcher() {
    const currentTheme = Utils.getStoredTheme();
    return '<article>' +
             '<h2>Ustawienia</h2>' +
             '<div class="theme-switcher">' +
               '<label for="theme-select-dash">Motyw:</label> ' +
               '<select id="theme-select-dash" class="compact-control" aria-label="Wybór motywu kolorystycznego">' +
                 '<option value="light"' + (currentTheme === 'light' ? ' selected' : '') + '>Jasny</option>' +
                 '<option value="dark"' + (currentTheme === 'dark' ? ' selected' : '') + '>Ciemny</option>' +
                 '<option value="high-contrast"' + (currentTheme === 'high-contrast' ? ' selected' : '') + '>Wysoki kontrast</option>' +
               '</select>' +
             '</div>' +
           '</article>';
  }

  function attachHandlers() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', Auth.logout);
    }
    const themeSelect = document.getElementById('theme-select-dash');
    if (themeSelect) {
      themeSelect.addEventListener('change', function(e) {
        Utils.applyTheme(e.target.value);
      });
    }
  }

  return {
    render: render
  };
})();
