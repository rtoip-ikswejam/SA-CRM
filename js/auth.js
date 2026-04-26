/**
 * auth.js — zarządzanie sesją użytkownika w przeglądarce.
 *
 * Strategia:
 *  - Przy starcie aplikacji wywołujemy whoami do backendu
 *  - Jeśli OK — zapisujemy usera w sessionStorage i wchodzimy do dashboardu
 *  - Jeśli brak uprawnień — pokazujemy ekran logowania z info
 *  - Jeśli brak sesji Google — przeglądarka zostanie przekierowana przez Apps Script
 */

const Auth = (function() {

  /**
   * Sprawdza status zalogowania. Zwraca Promise<user | null>.
   *
   * Pierwsze wywołanie woła backend. Kolejne używają cache w sessionStorage
   * (żeby przy przełączaniu widoków nie bombardować backendu).
   *
   * Parametr `force=true` wymusza świeże wywołanie nawet jeśli cache jest.
   */
  function checkSession(force) {
    if (!force) {
      const cached = Utils.getSessionUser();
      if (cached) {
        return Promise.resolve(cached);
      }
    }

    return Api.get('whoami')
      .then(response => {
        if (response.ok && response.user) {
          Utils.setSessionUser(response.user);
          return response.user;
        } else {
          Utils.clearSessionUser();
          return null;
        }
      })
      .catch(err => {
        Utils.clearSessionUser();
        // Zwracamy błąd dalej — wyższa warstwa zdecyduje, czy pokazać komunikat
        return Promise.reject(err);
      });
  }

  /**
   * Wylogowanie. Czyści sesję lokalną i przekierowuje na ekran logowania.
   * Uwaga: nie wylogowuje z Google — user nadal ma tam sesję.
   * Żeby pełnie wylogować, musi się wylogować z Google osobno.
   */
  function logout() {
    Utils.clearSessionUser();
    // Hard reload zamiast tylko przełączenia widoku — chcemy świeży stan
    window.location.hash = '';
    window.location.reload();
  }

  /**
   * Zwraca aktualnego usera z cache (bez wywołania backendu).
   * Zwraca null jeśli nie zalogowany.
   */
  function currentUser() {
    return Utils.getSessionUser();
  }

  /**
   * Sprawdza czy aktualny user jest adminem.
   */
  function isAdmin() {
    const user = currentUser();
    return user && user.role === 'admin';
  }

  return {
    checkSession: checkSession,
    logout: logout,
    currentUser: currentUser,
    isAdmin: isAdmin
  };
})();
