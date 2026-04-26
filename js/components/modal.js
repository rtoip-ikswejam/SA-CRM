/**
 * components/modal.js — generyczny modal dialog.
 *
 * Cechy WCAG:
 *  - role="dialog" + aria-modal
 *  - focus trap (Tab nie ucieka poza modal)
 *  - Esc zamyka
 *  - po zamknięciu focus wraca na element wywołujący
 *
 * API:
 *   Modal.open({
 *     title: 'Edytuj firmę',
 *     content: '<p>...</p>' lub HTMLElement,
 *     size: 'small'|'medium'|'large' (default: medium),
 *     onClose: function() {...}        // wywołane po zamknięciu
 *   })
 *   Modal.close()
 */

const Modal = (function() {

  let activeModal = null;
  let activeOnClose = null;
  let triggerElement = null;
  let keydownHandler = null;
  let firstFocusable = null;
  let lastFocusable = null;

  function open(options) {
    options = options || {};

    // Jeśli już otwarty, zamknij poprzedni najpierw
    if (activeModal) close();

    triggerElement = document.activeElement;

    const size = options.size || 'medium';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog modal-' + size;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'modal-title');

    const titleId = 'modal-title';
    const header = document.createElement('header');
    header.className = 'modal-header';
    header.innerHTML =
      '<h2 id="' + titleId + '">' + Utils.escapeHtml(options.title || '') + '</h2>' +
      '<button type="button" class="modal-close" aria-label="Zamknij okno">&times;</button>';

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof options.content === 'string') {
      body.innerHTML = options.content;
    } else if (options.content instanceof HTMLElement) {
      body.appendChild(options.content);
    }

    dialog.appendChild(header);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    // Close button
    header.querySelector('.modal-close').addEventListener('click', close);

    activeModal = overlay;
    activeOnClose = options.onClose || null;

    // Focus trap setup
    setupFocusTrap(dialog);

    // Esc & Tab handlers
    keydownHandler = function(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        handleTab(e);
      }
    };
    document.addEventListener('keydown', keydownHandler);

    // Focus pierwszego inputa albo close buttona
    setTimeout(function() {
      const firstInput = dialog.querySelector('input, select, textarea, button:not(.modal-close)');
      if (firstInput) {
        firstInput.focus();
      } else {
        header.querySelector('.modal-close').focus();
      }
    }, 50);
  }

  function setupFocusTrap(dialog) {
    const focusables = dialog.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length > 0) {
      firstFocusable = focusables[0];
      lastFocusable = focusables[focusables.length - 1];
    }
  }

  function handleTab(e) {
    if (!firstFocusable || !lastFocusable) return;
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  function close() {
    if (!activeModal) return;
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
    document.body.classList.remove('modal-open');
    if (activeModal.parentNode) {
      activeModal.parentNode.removeChild(activeModal);
    }
    const onClose = activeOnClose;
    activeModal = null;
    activeOnClose = null;
    firstFocusable = null;
    lastFocusable = null;

    // Przywróć focus na element wywołujący
    if (triggerElement && triggerElement.focus) {
      try { triggerElement.focus(); } catch (e) {}
    }
    triggerElement = null;

    if (onClose) {
      try { onClose(); } catch (e) { console.error(e); }
    }
  }

  function isOpen() {
    return activeModal !== null;
  }

  return {
    open: open,
    close: close,
    isOpen: isOpen
  };
})();
