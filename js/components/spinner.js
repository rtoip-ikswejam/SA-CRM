/**
 * components/spinner.js — globalny wskaźnik ładowania.
 *
 * Apps Script ma cold-start (kilka sekund przy pierwszym wywołaniu),
 * więc bez wskaźnika user myśli że nic się nie dzieje.
 *
 * Spinner pokazuje overlay z animowaną ikoną logo + komunikatem.
 * Jest stackable: jeśli kilka requestów leci równocześnie, każdy podnosi
 * counter, ostatni go opuszcza i overlay znika.
 *
 * API:
 *   Spinner.show('Ładowanie firm...')   - pokazuje (z opcjonalnym tekstem)
 *   Spinner.hide()                       - ukrywa (zmniejsza licznik)
 *   Spinner.wrap(promise, 'tekst')      - automatycznie show/hide wokół promise
 */

const Spinner = (function() {

  let counter = 0;
  let overlay = null;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'spinner-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'Ładowanie');
    overlay.innerHTML =
      '<div class="spinner-content">' +
        '<img src="pics/logo-icon.svg" alt="" class="spinner-icon" aria-hidden="true">' +
        '<div class="spinner-message" id="spinner-message">Ładowanie...</div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function show(message) {
    counter++;
    const el = ensureOverlay();
    if (message) {
      const msgEl = document.getElementById('spinner-message');
      if (msgEl) msgEl.textContent = message;
    }
    el.classList.add('visible');
  }

  function hide() {
    counter = Math.max(0, counter - 1);
    if (counter === 0 && overlay) {
      overlay.classList.remove('visible');
    }
  }

  function reset() {
    counter = 0;
    if (overlay) overlay.classList.remove('visible');
  }

  /**
   * Owija Promise w show/hide. Bezpieczne wobec błędów.
   * Użycie: return Spinner.wrap(Api.get('companies_list'), 'Ładowanie firm...');
   */
  function wrap(promise, message) {
    show(message);
    return promise.then(
      function(v) { hide(); return v; },
      function(err) { hide(); return Promise.reject(err); }
    );
  }

  return {
    show: show,
    hide: hide,
    reset: reset,
    wrap: wrap
  };
})();
