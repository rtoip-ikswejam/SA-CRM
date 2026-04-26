/**
 * components/toast.js — system powiadomień typu toast.
 *
 * Pokazuje krótkie komunikaty na dole ekranu, znikające po kilku sekundach.
 * Trzy typy: success, error, info.
 *
 * Zastępuje natywny alert() z Etapu 0 — od teraz używamy toast wszędzie.
 *
 * API:
 *   Toast.success('Firma zapisana')
 *   Toast.error('Nie udało się zapisać')
 *   Toast.info('Ładowanie...')
 */

const Toast = (function() {

  const DURATION_MS = 4000;
  const ERROR_DURATION_MS = 7000; // błędy zostają dłużej

  let container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
    return container;
  }

  function show(message, type) {
    type = type || 'info';
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');

    // Przycisk zamknięcia
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Zamknij powiadomienie');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function() { dismiss(el); });

    const msgEl = document.createElement('div');
    msgEl.className = 'toast-message';
    msgEl.textContent = String(message);

    el.appendChild(msgEl);
    el.appendChild(closeBtn);

    ensureContainer().appendChild(el);

    // Animacja wejścia
    requestAnimationFrame(function() {
      el.classList.add('visible');
    });

    // Auto-dismiss
    const duration = type === 'error' ? ERROR_DURATION_MS : DURATION_MS;
    setTimeout(function() { dismiss(el); }, duration);
  }

  function dismiss(el) {
    if (!el) return;
    el.classList.remove('visible');
    setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }

  return {
    success: function(msg) { show(msg, 'success'); },
    error: function(msg) { show(msg, 'error'); },
    info: function(msg) { show(msg, 'info'); }
  };
})();
