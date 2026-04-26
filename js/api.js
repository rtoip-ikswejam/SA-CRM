/**
 * api.js — wrapper na wywołania do Apps Script Web App.
 *
 * WAŻNE: Wklej URL swojego Apps Script Web App w stałą BACKEND_URL poniżej.
 * URL kopiujesz z okna deployu (krok 6 w README).
 *
 * Wygląda tak:
 *   https://script.google.com/macros/s/AKfyc.../exec
 */

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwhnqdgnohwsExM3Uyw0cMrZJyCn85_UXXRUd9HR0p0kHB8usV1GiyqgxHvg1i851Y/exec';

const Api = (function() {

  /**
   * Wywołuje akcję backendu metodą GET.
   * Zwraca Promise z odpowiedzią JSON.
   *
   * Parametr `params` to obiekt, zostanie skonwertowany na query string.
   */
  function get(action, params) {
    const query = buildQuery(Object.assign({ action: action }, params || {}));
    const url = BACKEND_URL + (BACKEND_URL.indexOf('?') === -1 ? '?' : '&') + query;

    return fetch(url, {
      method: 'GET',
      redirect: 'follow',
      // Nie ustawiamy credentials — Apps Script używa własnej sesji Google
    })
      .then(handleResponse)
      .catch(handleFetchError);
  }

  /**
   * Wywołuje akcję backendu metodą POST z body w formacie JSON.
   *
   * UWAGA: Apps Script Web App ma specyficzne zachowanie CORS —
   * nie akceptuje preflight requestów z niestandardowymi nagłówkami.
   * Dlatego wysyłamy body jako text/plain (mimo że to JSON w środku).
   * Apps Script parsuje e.postData.contents niezależnie od Content-Type.
   */
  function post(action, params, body) {
    const query = buildQuery(Object.assign({ action: action }, params || {}));
    const url = BACKEND_URL + (BACKEND_URL.indexOf('?') === -1 ? '?' : '&') + query;

    return fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        // Celowo text/plain — inaczej CORS preflight rozwali to
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(body || {})
    })
      .then(handleResponse)
      .catch(handleFetchError);
  }

  /**
   * Konstruuje query string z obiektu params.
   */
  function buildQuery(params) {
    const parts = [];
    Object.keys(params).forEach(key => {
      const val = params[key];
      if (val === null || val === undefined) return;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    });
    return parts.join('&');
  }

  function handleResponse(response) {
    if (!response.ok) {
      return Promise.reject({
        ok: false,
        error: 'http_error',
        status: response.status,
        message: 'Backend zwrócił status ' + response.status
      });
    }
    return response.json().catch(err => {
      return Promise.reject({
        ok: false,
        error: 'invalid_json',
        message: 'Backend zwrócił nieprawidłowy JSON: ' + err.message
      });
    });
  }

  function handleFetchError(err) {
    // Jeśli err to już sformatowany obiekt z naszego handleResponse, przekazujemy dalej
    if (err && err.ok === false) return Promise.reject(err);

    // Inaczej to błąd sieci / CORS
    return Promise.reject({
      ok: false,
      error: 'network_error',
      message: 'Błąd połączenia z serwerem: ' + (err && err.message || err)
    });
  }

  /**
   * Weryfikacja, czy BACKEND_URL jest skonfigurowany.
   * Wywoływana przy starcie aplikacji.
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
