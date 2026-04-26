/**
 * app.js — główny plik aplikacji SPA.
 *
 * Zadania:
 *  1. Bootstrap przy starcie — stosowanie motywu, sprawdzenie sesji
 *  2. Routing — decyzja który widok pokazać
 *  3. Obsługa zdarzeń globalnych (visibilitychange dla auto-refresh)
 *
 * W Etapie 0 routing jest uproszczony: albo ekran logowania, albo dashboard.
 * W Etapie 1 rozbudujemy o hash-based routing (#companies, #contacts, ...).
 */

const App = (function() {

  /**
   * Inicjalizacja aplikacji. Wywoływana po załadowaniu DOMa.
   */
  function init() {
    // 1. Zastosuj zapisany motyw jak najszybciej (przed renderowaniem UI),
    // żeby uniknąć FOUC (flash of unstyled content)
    Utils.applyTheme(Utils.getStoredTheme());

    // 2. Sprawdź, czy backend jest skonfigurowany
    if (!Api.isConfigured()) {
      LoginView.render({
        error: 'not_configured',
        message: 'URL backendu Apps Script nie został ustawiony w pliku js/api.js. ' +
                 'Zobacz README, krok 8. Wklej tam URL zdeployowanego Web App ' +
                 '(w formacie https://script.google.com/macros/s/.../exec).'
      });
      return;
    }

    // 3. Sprawdź sesję
    Auth.checkSession(false)
      .then(user => {
        if (user) {
          navigateToHome();
        } else {
          LoginView.render();
        }
      })
      .catch(err => {
        // Błąd przy whoami — pokazujemy ekran logowania z komunikatem
        LoginView.render(err);
      });
  }

  /**
   * Przejście do ekranu głównego po zalogowaniu.
   * W Etapie 0 to tylko dashboard. W Etapie 1 dojdą inne widoki.
   */
  function navigateToHome() {
    DashboardView.render();
  }

  /**
   * Auto-refresh po powrocie do zakładki (np. user przełącza się między Gmailem a CRM).
   * Sprawdzamy sesję ponownie — mogła wygasnąć po stronie Google.
   */
  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      const user = Auth.currentUser();
      if (user) {
        // Sesja w cache, sprawdzamy w tle czy jeszcze aktywna
        Auth.checkSession(true)
          .then(u => {
            if (!u) {
              // Sesja wygasła — wracamy do logowania
              LoginView.render({ error: 'not_authorized', email: user.email });
            }
          })
          .catch(() => {
            // Błąd sieci — ignorujemy, user zauważy przy kolejnej akcji
          });
      }
    }
  }

  // Uruchamiamy po załadowaniu DOMa
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM już załadowany
    init();
  }

  document.addEventListener('visibilitychange', onVisibilityChange);

  // Publiczny API (używany przez widoki do nawigacji)
  return {
    navigateToHome: navigateToHome,
    init: init
  };
})();
