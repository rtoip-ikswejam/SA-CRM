/**
 * views/dashboard.js — Dashboard.
 *
 * Etap 1A: minimalny dashboard z powitaniem, statusem systemu i quick actions.
 * Etap 1D: rozbudujemy o kafelki statystyk, taski, aktywność.
 */

const DashboardView = (function() {

  function render() {
    const user = Auth.currentUser();
    if (!user) {
      LoginView.render();
      return;
    }

    const firstName = (user.display_name || user.email).split(' ')[0];
    const today = new Date().toLocaleDateString('pl-PL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const html =
      Topbar.render() +
      '<main id="main" class="container">' +
        '<div class="welcome">' +
          '<h1>Witaj, ' + Utils.escapeHtml(firstName) + '!</h1>' +
          '<p class="muted">Dziś jest ' + Utils.escapeHtml(today) + '.</p>' +
        '</div>' +

        '<section class="quick-actions">' +
          '<h2>Szybki start</h2>' +
          '<div class="quick-action-grid">' +
            '<a href="#companies" class="quick-action">' +
              '<div class="qa-icon" aria-hidden="true">📁</div>' +
              '<div class="qa-text">' +
                '<strong>Firmy</strong>' +
                '<span>Przeglądaj listę firm partnerskich</span>' +
              '</div>' +
            '</a>' +
            '<button type="button" class="quick-action" id="qa-new-company">' +
              '<div class="qa-icon" aria-hidden="true">＋</div>' +
              '<div class="qa-text">' +
                '<strong>Nowa firma</strong>' +
                '<span>Dodaj firmę partnerską do bazy</span>' +
              '</div>' +
            '</button>' +
          '</div>' +
        '</section>' +

        '<section class="quick-actions">' +
          '<h2>Status systemu</h2>' +
          '<div class="alert alert-info" role="status">' +
            '<strong>Etap 1A — zarządzanie firmami</strong><br>' +
            'Aktywne moduły: Firmy (lista, karta firmy, edycja, soft-delete).<br>' +
            'Kolejne moduły (Kontakty, Interakcje, Benefity, Taski, Dokumenty, Raporty) ' +
            'pojawią się w kolejnych etapach implementacji.' +
          '</div>' +
        '</section>' +

        '<section class="settings-block">' +
          '<h2>Ustawienia</h2>' +
          '<div class="theme-switcher">' +
            '<label for="theme-select-dash">Motyw kolorystyczny:</label> ' +
            '<select id="theme-select-dash" class="compact-control" aria-label="Wybór motywu">' +
              themeOption('light', 'Jasny') +
              themeOption('dark', 'Ciemny') +
              themeOption('high-contrast', 'Wysoki kontrast') +
            '</select>' +
          '</div>' +
        '</section>' +
      '</main>';

    Utils.renderView(html);
    Topbar.attachHandlers();
    attachHandlers();
  }

  function themeOption(value, label) {
    const current = Utils.getStoredTheme();
    return '<option value="' + value + '"' + (current === value ? ' selected' : '') + '>' +
           Utils.escapeHtml(label) + '</option>';
  }

  function attachHandlers() {
    const newCompanyBtn = document.getElementById('qa-new-company');
    if (newCompanyBtn) {
      newCompanyBtn.addEventListener('click', function() {
        CompanyFormView.openCreate(function(saved) {
          CompaniesListView.invalidateCache();
          Toast.success('Firma "' + saved.name + '" utworzona');
          Router.navigate('#company/' + saved.company_id);
        });
      });
    }
    const themeSelect = document.getElementById('theme-select-dash');
    if (themeSelect) {
      themeSelect.addEventListener('change', function(e) {
        Utils.applyTheme(e.target.value);
      });
    }
  }

  return { render: render };
})();
