/**
 * app.js — bootstrap aplikacji SPA.
 */

const App = (function() {

  function init() {
    Utils.applyTheme(Utils.getStoredTheme());

    if (!Api.isConfigured()) {
      LoginView.render({
        error: 'not_configured',
        message: 'URL backendu Apps Script nie został ustawiony w pliku js/api.js. Zobacz README, krok 8.'
      });
      return;
    }

    Spinner.show('Sprawdzanie sesji...');
    Auth.checkSession(false)
      .then(function(user) {
        Spinner.hide();
        if (user) {
          Router.start();
        } else {
          LoginView.render();
        }
      })
      .catch(function(err) {
        Spinner.hide();
        LoginView.render(err);
      });
  }

  function navigateToHome() {
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#dashboard';
    }
    Router.start();
    Router.dispatch();
  }

  function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    const user = Auth.currentUser();
    if (!user) return;
    Auth.checkSession(true).then(function(u) {
      if (!u) {
        Utils.clearSessionUser();
        LoginView.render({ error: 'not_authorized', email: user.email });
      }
    }).catch(function() {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    navigateToHome: navigateToHome,
    init: init
  };
})();
