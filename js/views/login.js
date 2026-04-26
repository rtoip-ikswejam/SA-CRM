/**
 * views/login.js — ekran logowania.
 *
 * Jedyny ekran, który user widzi zanim zostanie zalogowany.
 * Po kliknięciu "Zaloguj" — wywołuje whoami. Apps Script automatycznie
 * przekieruje na Google OAuth jeśli user nie jest zalogowany w Google.
 */

const LoginView = (function() {

  /**
   * Renderuje ekran logowania.
   * Parametr `errorInfo` (opcjonalny) to obiekt z informacją o błędzie
   * z poprzedniej próby logowania.
   */
  function render(errorInfo) {
    const errorHtml = errorInfo ? renderError(errorInfo) : '';

    const html =
      '<section class="login-screen" role="region" aria-label="Ekran logowania">' +
        '<img src="pics/logo-main.svg" alt="Stodoła Artystów CRM" class="logo">' +
        '<h1>System zarządzania kontaktami</h1>' +
        '<p class="tagline">Stowarzyszenie Stodoła Artystów</p>' +
        errorHtml +
        '<button type="button" class="btn-google" id="btn-login" aria-label="Zaloguj się do systemu za pomocą konta Google">' +
          '<span aria-hidden="true">▶</span> Zaloguj się kontem Google' +
        '</button>' +
        '<p class="help-text">' +
          'Dostęp do systemu wymaga konta Google dodanego do listy użytkowników. ' +
          'Jeśli Twoje konto nie zostało jeszcze dodane, skontaktuj się z administratorem.' +
        '</p>' +
        renderThemeSwitcher() +
        '<p class="footer">Stodoła Artystów CRM · wersja 0.1</p>' +
      '</section>';

    Utils.renderView(html);
    attachHandlers();
  }

  function renderError(errorInfo) {
    let title = 'Nie udało się zalogować';
    let message = 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';

    if (errorInfo.error === 'not_authorized') {
      title = 'Brak dostępu';
      message = 'Twój adres email (' + Utils.escapeHtml(errorInfo.email || 'nieznany') + ') nie jest na liście użytkowników systemu. ' +
                'Skontaktuj się z administratorem, aby uzyskać dostęp.';
    } else if (errorInfo.error === 'network_error') {
      title = 'Błąd połączenia';
      message = 'Nie udało się połączyć z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.';
    } else if (errorInfo.error === 'no_session') {
      title = 'Problem z konfiguracją';
      message = errorInfo.message || 'Backend nie zwraca emaila użytkownika. Skontaktuj się z administratorem systemu.';
    } else if (errorInfo.error === 'not_configured') {
      title = 'Aplikacja nie jest skonfigurowana';
      message = 'URL backendu (Apps Script) nie został ustawiony w pliku js/api.js. Zobacz README, krok 8.';
    } else if (errorInfo.message) {
      message = Utils.escapeHtml(errorInfo.message);
    }

    return '<div class="alert alert-error" role="alert">' +
             '<strong>' + Utils.escapeHtml(title) + '</strong><br>' +
             message +
           '</div>';
  }

  function renderThemeSwitcher() {
    const currentTheme = Utils.getStoredTheme();
    return '<div class="theme-switcher">' +
             '<label for="theme-select">Motyw:</label>' +
             '<select id="theme-select" class="compact-control" aria-label="Wybór motywu kolorystycznego">' +
               option('light', 'Jasny', currentTheme) +
               option('dark', 'Ciemny', currentTheme) +
               option('high-contrast', 'Wysoki kontrast', currentTheme) +
             '</select>' +
           '</div>';
  }

  function option(value, label, current) {
    const selected = value === current ? ' selected' : '';
    return '<option value="' + value + '"' + selected + '>' + label + '</option>';
  }

  function attachHandlers() {
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) {
      loginBtn.addEventListener('click', handleLogin);
    }
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', function(e) {
        Utils.applyTheme(e.target.value);
      });
    }
  }

  function handleLogin() {
    if (!Api.isConfigured()) {
      render({
        error: 'not_configured',
        message: 'URL backendu nie został ustawiony w pliku js/api.js. Zobacz README, krok 8.'
      });
      return;
    }

    const btn = document.getElementById('btn-login');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Logowanie...';
    }

    Auth.checkSession(true)
      .then(user => {
        if (user) {
          // Sukces — App zareaguje na zmianę stanu
          App.navigateToHome();
        } else {
          // whoami zwróciło ok:false
          render({ error: 'not_authorized' });
        }
      })
      .catch(err => {
        render(err);
      });
  }

  return {
    render: render
  };
})();
