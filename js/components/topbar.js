/**
 * components/topbar.js — pasek górny z menu nawigacyjnym.
 *
 * Renderowany na każdym ekranie po zalogowaniu (oprócz logowania).
 * Zawiera: logo, menu główne, info o userze, przycisk wylogowania.
 * Na mobile: menu chowane pod przyciskiem hamburger.
 */

const Topbar = (function() {

  function render() {
    const user = Auth.currentUser();
    if (!user) return '';

    return (
      '<header class="topbar" role="banner">' +
        '<div class="topbar-brand">' +
          '<a href="#dashboard" aria-label="Strona główna">' +
            '<img src="pics/logo-icon.svg" alt="" aria-hidden="true">' +
            '<span class="brand-name">Stodoła CRM</span>' +
          '</a>' +
        '</div>' +
        '<nav class="topbar-nav" role="navigation" aria-label="Menu główne">' +
          '<button type="button" class="hamburger" aria-label="Otwórz menu" aria-expanded="false" aria-controls="main-menu">☰</button>' +
          '<ul id="main-menu">' +
            navLink('#dashboard', 'Dashboard') +
            navLink('#companies', 'Firmy') +
            navLinkDisabled('#contacts', 'Kontakty', 'Etap 1B') +
            navLinkDisabled('#tasks', 'Taski', 'Etap 1D') +
            navLinkDisabled('#documents', 'Dokumenty', 'Etap 3') +
            navLinkDisabled('#reports', 'Raporty', 'Etap 2') +
            (Auth.isAdmin() ? navLinkDisabled('#admin', 'Admin', 'Etap 4') : '') +
          '</ul>' +
        '</nav>' +
        '<div class="topbar-user">' +
          '<span class="user-name">' + Utils.escapeHtml(user.display_name || user.email) + '</span>' +
          ' <span class="user-role">(' + Utils.escapeHtml(user.role) + ')</span> ' +
          '<button type="button" id="btn-logout" class="compact-control secondary outline">Wyloguj</button>' +
        '</div>' +
      '</header>'
    );
  }

  function navLink(href, label) {
    const currentHash = window.location.hash || '#dashboard';
    const isActive = currentHash === href || currentHash.startsWith(href + '/');
    return '<li>' +
      '<a href="' + href + '"' + (isActive ? ' aria-current="page" class="active"' : '') + '>' +
      Utils.escapeHtml(label) +
      '</a></li>';
  }

  function navLinkDisabled(href, label, reason) {
    return '<li><span class="nav-disabled" title="Dostępne w ' + Utils.escapeHtml(reason) + '">' +
      Utils.escapeHtml(label) + '</span></li>';
  }

  /**
   * Podpina handlery do wyrenderowanego topbara.
   * Wywołać po wstawieniu HTML do DOM-a.
   */
  function attachHandlers() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', Auth.logout);
    }
    const hamburger = document.querySelector('.hamburger');
    const menu = document.getElementById('main-menu');
    if (hamburger && menu) {
      hamburger.addEventListener('click', function() {
        const isOpen = menu.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      // zamknij menu po kliknięciu w link (na mobile)
      menu.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() {
          menu.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  return {
    render: render,
    attachHandlers: attachHandlers
  };
})();
