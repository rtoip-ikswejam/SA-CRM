/**
 * views/company-detail.js — karta firmy (Etap 1A: tylko zakładka Przegląd).
 *
 * W kolejnych sub-etapach dojdą zakładki:
 *  - Etap 1B: Kontakty, Kanały
 *  - Etap 1C: Interakcje
 *  - Etap 1D: Benefity, Taski
 *  - Etap 3:  Dokumenty
 */

const CompanyDetailView = (function() {

  let currentCompany = null;
  let currentLookups = null;

  function render(companyId) {
    if (!companyId) {
      Toast.error('Brak ID firmy');
      Router.navigate('#companies');
      return;
    }

    // Bazowy szkielet
    const html =
      Topbar.render() +
      '<main id="main" class="container">' +
        '<div id="company-content"></div>' +
      '</main>';
    Utils.renderView(html);
    Topbar.attachHandlers();

    Spinner.wrap(
      Promise.all([
        Api.get('company_overview', { id: companyId }),
        Api.get('lookups', { categories: 'industry,company_tag' })
      ]),
      'Ładowanie firmy...'
    ).then(function(results) {
      const overviewResp = results[0];
      const lookupsResp = results[1];

      if (!overviewResp.ok) {
        renderError(overviewResp);
        return;
      }
      currentCompany = overviewResp.company;
      currentLookups = lookupsResp.ok ? (lookupsResp.lookups || {}) : {};
      currentCompany._permissions = overviewResp.permissions || {};
      renderContent();
    }, function(err) {
      Toast.error(err.message || 'Błąd połączenia');
    });
  }

  function renderError(resp) {
    document.getElementById('company-content').innerHTML =
      '<div class="alert alert-error" role="alert">' +
        '<strong>Nie znaleziono firmy</strong><br>' +
        Utils.escapeHtml(resp.message || 'Mogła zostać usunięta lub nie masz uprawnień.') +
      '</div>' +
      '<p><a href="#companies">← Wróć do listy firm</a></p>';
  }

  function renderContent() {
    const c = currentCompany;
    const canEdit = !!(c._permissions && c._permissions.can_edit);

    // Mapa branż dla wyświetlenia label
    const industryMap = {};
    (currentLookups.industry || []).forEach(function(l) { industryMap[l.value] = l.label; });
    const industryLabel = industryMap[c.industry] || c.industry || '';

    // Tagi
    const tags = (c.tags || '').split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; });

    const html =
      '<nav aria-label="Breadcrumb" class="breadcrumbs">' +
        '<a href="#companies">Firmy</a> › ' +
        '<span aria-current="page">' + Utils.escapeHtml(c.name || '') + '</span>' +
      '</nav>' +

      '<div class="company-header">' +
        '<div class="company-header-main">' +
          '<h1>' + Utils.escapeHtml(c.name || '') +
            (c.deleted ? ' <span class="badge badge-warn">USUNIĘTA</span>' : '') +
          '</h1>' +
          '<div class="company-meta">' +
            (industryLabel ? '<span class="badge">' + Utils.escapeHtml(industryLabel) + '</span> ' : '') +
            tags.map(function(t) { return '<span class="tag">' + Utils.escapeHtml(t) + '</span>'; }).join(' ') +
          '</div>' +
          '<div class="company-meta-secondary">' +
            'Opiekun główny: <strong>' + Utils.escapeHtml(c.primary_owner || '—') + '</strong>' +
            (c.backup_editors ? ' · Wsparcie: ' + Utils.escapeHtml(c.backup_editors) : '') +
          '</div>' +
        '</div>' +
        '<div class="company-header-actions">' +
          (canEdit ? '<button type="button" id="btn-edit-company">Edytuj firmę</button>' : '') +
          (canEdit ? '<button type="button" id="btn-delete-company" class="secondary outline">Usuń</button>' : '') +
        '</div>' +
      '</div>' +

      // Tabs - na razie tylko Przegląd, reszta disabled
      '<div class="tabs" role="tablist" aria-label="Sekcje karty firmy">' +
        '<button role="tab" aria-selected="true" class="tab active" data-tab="overview">Przegląd</button>' +
        '<button role="tab" aria-selected="false" class="tab disabled" disabled title="Etap 1B">Kontakty</button>' +
        '<button role="tab" aria-selected="false" class="tab disabled" disabled title="Etap 1C">Interakcje</button>' +
        '<button role="tab" aria-selected="false" class="tab disabled" disabled title="Etap 1D">Benefity</button>' +
        '<button role="tab" aria-selected="false" class="tab disabled" disabled title="Etap 1D">Taski</button>' +
        '<button role="tab" aria-selected="false" class="tab disabled" disabled title="Etap 3">Dokumenty</button>' +
      '</div>' +

      '<div class="tab-panel" role="tabpanel">' +
        renderOverview(c, canEdit) +
      '</div>';

    document.getElementById('company-content').innerHTML = html;
    attachHandlers();
  }

  function renderOverview(c, canEdit) {
    return (
      '<section class="overview-section">' +
        '<h2>Notatki</h2>' +
        (c.notes
          ? '<div class="notes-content">' + Utils.escapeHtml(c.notes).replace(/\n/g, '<br>') + '</div>'
          : '<p class="muted">Brak notatek. ' + (canEdit ? 'Kliknij "Edytuj firmę" aby dodać.' : '') + '</p>') +
      '</section>' +

      '<section class="overview-section">' +
        '<h2>Strona WWW</h2>' +
        (c.www
          ? '<p><a href="' + Utils.escapeHtml(normalizeUrl(c.www)) + '" target="_blank" rel="noopener noreferrer">' +
            Utils.escapeHtml(c.www) + '</a></p>'
          : '<p class="muted">Brak adresu WWW</p>') +
      '</section>' +

      '<section class="overview-section">' +
        '<h2>Metadane</h2>' +
        '<dl class="meta-list">' +
          '<dt>ID firmy</dt><dd><code>' + Utils.escapeHtml(c.company_id) + '</code></dd>' +
          '<dt>Utworzona</dt><dd>' + formatDate(c.created_at) +
            (c.created_by ? ' przez ' + Utils.escapeHtml(c.created_by) : '') + '</dd>' +
          '<dt>Ostatnia edycja</dt><dd>' + formatDate(c.updated_at) +
            (c.updated_by ? ' przez ' + Utils.escapeHtml(c.updated_by) : '') + '</dd>' +
        '</dl>' +
      '</section>' +

      '<section class="overview-section overview-coming-soon">' +
        '<h2>Wkrótce</h2>' +
        '<p class="muted">Pozostałe zakładki (Kontakty, Interakcje, Benefity, Taski, Dokumenty) zostaną dodane w kolejnych etapach implementacji.</p>' +
      '</section>'
    );
  }

  function attachHandlers() {
    const editBtn = document.getElementById('btn-edit-company');
    if (editBtn) {
      editBtn.addEventListener('click', function() {
        CompanyFormView.openEdit(currentCompany, currentLookups, function(saved) {
          // Po edycji - odświeżamy widok i invalidujemy cache listy
          CompaniesListView.invalidateCache();
          Toast.success('Firma zaktualizowana');
          render(saved.company_id);
        });
      });
    }
    const delBtn = document.getElementById('btn-delete-company');
    if (delBtn) {
      delBtn.addEventListener('click', confirmDelete);
    }
  }

  function confirmDelete() {
    const c = currentCompany;
    if (!c) return;

    const content = document.createElement('div');
    content.innerHTML =
      '<p>Czy na pewno chcesz usunąć firmę <strong>' + Utils.escapeHtml(c.name) + '</strong>?</p>' +
      '<p class="muted">Firma zostanie ukryta, ale dane pozostaną w systemie. ' +
      'Administrator może ją przywrócić.</p>' +
      '<div class="form-actions">' +
        '<button type="button" id="confirm-delete-cancel" class="secondary outline">Anuluj</button>' +
        '<button type="button" id="confirm-delete-ok" class="danger">Usuń firmę</button>' +
      '</div>';

    Modal.open({
      title: 'Potwierdź usunięcie',
      content: content,
      size: 'small'
    });

    content.querySelector('#confirm-delete-cancel').addEventListener('click', Modal.close);
    content.querySelector('#confirm-delete-ok').addEventListener('click', function() {
      Modal.close();
      Spinner.wrap(
        Api.post('company_delete', { id: c.company_id }, {}),
        'Usuwanie...'
      ).then(function(resp) {
        if (resp.ok) {
          CompaniesListView.invalidateCache();
          Toast.success(resp.message || 'Firma usunięta');
          Router.navigate('#companies');
        } else {
          Toast.error(resp.message || 'Nie udało się usunąć');
        }
      }, function(err) {
        Toast.error(err.message || 'Błąd połączenia');
      });
    });
  }

  function normalizeUrl(url) {
    if (!url) return '';
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) return url;
    return 'https://' + url;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pl-PL', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  return {
    render: render
  };
})();
