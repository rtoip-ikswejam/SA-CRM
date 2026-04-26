/**
 * api.js — wrapper na wywołania do Apps Script Web App.
 *
 * UWAGA: używamy JSONP zamiast fetch. Apps Script Web App nie wspiera CORS
 * (zwraca 302 redirect bez Access-Control-Allow-Origin), więc fetch z innej
 * domeny (jak GitHub Pages) jest blokowany przez przeglądarkę.
 *
 * JSONP omija ten problem przez dodanie elementu <script src="...">,
 * który nie jest CORS-restricted. Apps Script musi zwracać odpowiedź jako
 * wywołanie funkcji callback, np. callback123({"ok":true,...}).
 *
 * Ograniczenie JSONP: wszystkie dane idą jako URL params (limit ~8000 znaków).
 * Dla małych żądań (login, listy, edycje) to wystarczy. Duże uploady zostaną
 * obsłużone osobnym mechanizmem od Etapu 3.
 *
 * BACKEND_URL: wklej URL swojego Apps Script Web App (krok 8 README).
 */

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxT4rS1YnAhdBTBS5FkgOu5iq_p3u7NmChw7p_fH8SnecD7pOpj_tf0BykbP7HlU80/exe';

const Api = (function() {

  let callbackCounter = 0;
  const REQUEST_TIMEOUT_MS = 30000; // Apps Script max ~30s

  /**
   * Wywołuje akcję backendu metodą GET przez JSONP.
   * Zwraca Promise z odpowiedzią JSON.
   */
  function get(action, params) {
    return jsonp(Object.assign({ action: action }, params || {}));
  }

  /**
   * Wywołuje akcję backendu metodą POST przez JSONP.
   * Body jest serializowany do JSON i wysyłany jako parametr `body` w URL.
   *
   * Backend powinien parsować e.parameter.body przez JSON.parse — albo
   * używać params jeśli body jest pusty.
   */
  function post(action, params, body) {
    const allParams = Object.assign({ action: action }, params || {});
    if (body && Object.keys(body).length > 0) {
      allParams.body = JSON.stringify(body);
    }
    allParams._method = 'POST'; // marker dla backendu (routing taki sam jak GET)
    return jsonp(allParams);
  }

  /**
   * Główna funkcja JSONP.
   * Tworzy unikalny callback, dodaje <script>, czeka na wywołanie callbacka
   * albo timeout / error.
   */
  function jsonp(params) {
    return new Promise(function(resolve, reject) {
      callbackCounter++;
      const callbackName = 'crmCb_' + Date.now() + '_' + callbackCounter;

      const allParams = Object.assign({}, params, { callback: callbackName });
      const query = buildQuery(allParams);
      const url = BACKEND_URL + (BACKEND_URL.indexOf('?') === -1 ? '?' : '&') + query;

      // Sanity check długości URL
      if (url.length > 7500) {
        reject({
          ok: false,
          error: 'request_too_large',
          message: 'Żądanie jest zbyt duże (' + url.length + ' znaków URL). ' +
                   'Skontaktuj się z administratorem.'
        });
        return;
      }

      let cleaned = false;
      let timeoutHandle = null;
      let script = null;

      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }

      // Globalny callback wywoływany przez Apps Script
      window[callbackName] = function(data) {
        cleanup();
        resolve(data);
      };

      script = document.createElement('script');
      script.src = url;
      script.async = true;

      script.onerror = function() {
        cleanup();
        reject({
          ok: false,
          error: 'network_error',
          message: 'Błąd połączenia z serwerem. Sprawdź:\n' +
                   '1) czy URL backendu w api.js jest poprawny\n' +
                   '2) czy Apps Script Web App jest zdeployowany\n' +
                   '3) czy masz aktywne połączenie internetowe'
        });
      };

      timeoutHandle = setTimeout(function() {
        if (cleaned) return;
        cleanup();
        reject({
          ok: false,
          error: 'timeout',
          message: 'Backend nie odpowiada (timeout ' + (REQUEST_TIMEOUT_MS / 1000) + ' s). ' +
                   'Spróbuj ponownie.'
        });
      }, REQUEST_TIMEOUT_MS);

      document.head.appendChild(script);
    });
  }

  /**
   * Konstruuje query string z obiektu params.
   */
  function buildQuery(params) {
    const parts = [];
    Object.keys(params).forEach(function(key) {
      const val = params[key];
      if (val === null || val === undefined) return;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    });
    return parts.join('&');
  }

  /**
   * Weryfikacja, czy BACKEND_URL jest skonfigurowany.
   */
  function isConfigured() {
    return BACKEND_URL &&
           BACKEND_URL.indexOf('TUTAJ_WKLEJ_URL') === -1 &&
           BACKEND_URL.indexOf('script.google.com') !== -1;
  }

  return {
    get: get,
    post: post,
    isConfigured: isConfigured,
    BACKEND_URL: BACKEND_URL
  };
})();
