/**
 * router.js — prosty hash-based routing.
 *
 * URL-e:
 *   #dashboard            -> DashboardView.render()
 *   #companies            -> CompaniesListView.render()
 *   #company/cmp_0001     -> CompanyDetailView.render('cmp_0001')
 *
 * Strategia: rejestrujemy listenery hashchange, parsujemy hash, dispatcher
 * wywołuje odpowiedni handler.
 *
 * Tylko zalogowani userzy mogą używać routera. Niezalogowani widzą login.
 */

const Router = (function() {

  const routes = [
    { pattern: /^#?dashboard$/, handler: function() { DashboardView.render(); } },
    { pattern: /^#?companies$/, handler: function() { CompaniesListView.render(); } },
    { pattern: /^#?company\/(.+)$/, handler: function(match) { CompanyDetailView.render(match[1]); } },
  ];

  // Trasy dla "zarezerwowanych" widoków - wyświetlamy placeholder
  const placeholderRoutes = [
    { pattern: /^#?contacts/, name: 'Kontakty', stage: 'Etap 1B' },
    { pattern: /^#?tasks/, name: 'Taski', stage: 'Etap 1D' },
    { pattern: /^#?documents/, name: 'Dokumenty', stage: 'Etap 3' },
    { pattern: /^#?reports/, name: 'Raporty', stage: 'Etap 2' },
    { pattern: /^#?admin/, name: 'Panel admina', stage: 'Etap 4' },
  ];

  let started = false;

  function start() {
    if (started) return;
    started = true;
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  function dispatch() {
    // Wymagaj zalogowania
    if (!Auth.currentUser()) {
      LoginView.render();
      return;
    }

    const hash = window.location.hash || '#dashboard';

    for (let i = 0; i < routes.length; i++) {
      const m = hash.match(routes[i].pattern);
      if (m) {
        try {
          routes[i].handler(m);
        } catch (err) {
          console.error('Router error:', err);
          renderError('Wystąpił błąd przy ładowaniu widoku.', err);
        }
        return;
      }
    }

    // Placeholder routes
    for (let i = 0; i < placeholderRoutes.length; i++) {
      if (hash.match(placeholderRoutes[i].pattern)) {
        renderPlaceholder(placeholderRoutes[i]);
        return;
      }
    }

    // 404
    renderNotFound(hash);
  }

  function navigate(hash) {
    if (window.location.hash === hash) {
      // Hash już taki sam — wymuś rerender
      dispatch();
    } else {
      window.location.hash = hash;
    }
  }

  function renderPlaceholder(route) {
    const html =
      Topbar.render() +
      '<main id="main" class="container">' +
        '<h1>' + Utils.escapeHtml(route.name) + '</h1>' +
        '<div class="alert alert-info" role="status">' +
          'Ten moduł zostanie zaimplementowany w ' + Utils.escapeHtml(route.stage) + '. ' +
          '<a href="#dashboard">Wróć do dashboardu →</a>' +
        '</div>' +
      '</main>';
    Utils.renderView(html);
    Topbar.attachHandlers();
  }

  function renderNotFound(hash) {
    const html =
      Topbar.render() +
      '<main id="main" class="container">' +
        '<h1>Nie znaleziono strony</h1>' +
        '<p>Adres <code>' + Utils.escapeHtml(hash) + '</code> nie pasuje do żadnego widoku.</p>' +
        '<p><a href="#dashboard">Wróć do dashboardu →</a></p>' +
      '</main>';
    Utils.renderView(html);
    Topbar.attachHandlers();
  }

  function renderError(message, err) {
    const html =
      Topbar.render() +
      '<main id="main" class="container">' +
        '<h1>Błąd</h1>' +
        '<div class="alert alert-error" role="alert">' +
          Utils.escapeHtml(message) +
          (err && err.message ? '<br><small>' + Utils.escapeHtml(err.message) + '</small>' : '') +
        '</div>' +
        '<p><a href="#dashboard">Wróć do dashboardu →</a></p>' +
      '</main>';
    Utils.renderView(html);
    Topbar.attachHandlers();
  }

  return {
    start: start,
    navigate: navigate,
    dispatch: dispatch
  };
})();
