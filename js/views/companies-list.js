/**
 * views/companies-list.js — lista firm.
 *
 * Strategia ładowania: jednorazowy fetch wszystkich firm + cache 5 min w sessionStorage.
 * Filtrowanie i sortowanie lokalnie. Cache invaliduje się po edycji.
 */

const CompaniesListView = (function() {

  const CACHE_KEY = 'cache_companies_list';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const LOOKUPS_CACHE_KEY = 'cache_lookups_companies';

  function render() {
    // Render kontener z topbar od razu - dane doładujemy
    const html =
      Topbar.render() +
      '<main id="main" class="container">' +
        '<div class="page-header">' +
          '<h1>Firmy</h1>' +
          '<div class="page-actions">' +
            '<button type="button" id="btn-refresh" class="secondary outline" aria-label="Odśwież listę firm">↻ Odśwież</button>' +
            '<button type="button" id="btn-export" class="secondary outline" aria-label="Eksport do CSV">Eksport CSV</button>' +
            '<button type="button" id="btn-new-company">+ Nowa firma</button>' +
          '</div>' +
        '</div>' +
        '<div class="filters-bar" id="filters-bar"></div>' +
        '<div id="companies-table"></div>' +
      '</main>';

    Utils.renderView(html);
    Topbar.attachHandlers();
    attachActionHandlers();
    loadAndRender(false);
  }

  function attachActionHandlers() {
    document.getElementById('btn-refresh').addEventListener('click', function() {
      loadAndRender(true);
    });
    document.getElementById('btn-new-company').addEventListener('click', function() {
      CompanyFormView.openCreate(function(saved) {
        invalidateCache();
        loadAndRender(false);
        Toast.success('Firma "' + saved.name + '" utworzona');
        // Opcjonalnie: od razu otwieramy kartę nowej firmy
        Router.navigate('#company/' + saved.company_id);
      });
    });
    document.getElementById('btn-export').addEventListener('click', exportCsv);
  }

  function loadAndRender(forceFresh) {
    const cached = !forceFresh ? readCache() : null;
    if (cached) {
      renderTable(cached.companies, cached.lookups);
      return;
    }

    Spinner.wrap(
      Promise.all([
        Api.get('companies_list'),
        Api.get('lookups', { categories: 'industry,company_tag' })
      ]),
      'Ładowanie firm...'
    ).then(function(results) {
      const compResp = results[0];
      const lookupsResp = results[1];

      if (!compResp.ok) {
        Toast.error(compResp.message || 'Nie udało się pobrać firm');
        return;
      }
      const companies = compResp.companies || [];
      const lookups = lookupsResp.ok ? (lookupsResp.lookups || {}) : {};

      writeCache({ companies: companies, lookups: lookups });
      renderTable(companies, lookups);
    }, function(err) {
      Toast.error(err.message || 'Błąd połączenia');
    });
  }

  function renderTable(companies, lookups) {
    // Mapa branż dla wyświetlania labela zamiast value
    const industryMap = {};
    (lookups.industry || []).forEach(function(l) { industryMap[l.value] = l.label; });

    const tableEl = document.getElementById('companies-table');
    if (!tableEl) return;

    Table.render(tableEl, {
      keyField: 'company_id',
      searchableFields: ['name', 'industry', 'tags', 'notes', 'www', 'primary_owner'],
      searchPlaceholder: 'Szukaj po nazwie, branży, tagach, notatkach...',
      emptyMessage: 'Nie masz jeszcze żadnych firm. Dodaj pierwszą.',
      defaultSortBy: 'last_interaction_at',
      defaultSortDir: 'desc',
      columns: [
        {
          key: 'name', label: 'Nazwa', sortable: true,
          render: function(row) {
            return '<a href="#company/' + Utils.escapeHtml(row.company_id) + '">' +
                   Utils.escapeHtml(row.name || '(bez nazwy)') + '</a>';
          }
        },
        {
          key: 'industry', label: 'Branża', sortable: true,
          render: function(row) {
            const label = industryMap[row.industry] || row.industry;
            return label ? '<span class="badge">' + Utils.escapeHtml(label) + '</span>' : '<span class="muted">—</span>';
          }
        },
        {
          key: 'tags', label: 'Tagi', sortable: false,
          render: function(row) {
            if (!row.tags) return '<span class="muted">—</span>';
            const tags = String(row.tags).split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; });
            if (tags.length === 0) return '<span class="muted">—</span>';
            const visible = tags.slice(0, 3);
            const rest = tags.length - visible.length;
            return visible.map(function(t) {
              return '<span class="tag">' + Utils.escapeHtml(t) + '</span>';
            }).join(' ') + (rest > 0 ? ' <span class="muted">+' + rest + '</span>' : '');
          }
        },
        {
          key: 'primary_owner', label: 'Opiekun', sortable: true,
          render: function(row) {
            if (!row.primary_owner) return '<span class="muted">—</span>';
            // Inicjały z emaila
            const initial = String(row.primary_owner).charAt(0).toUpperCase();
            return '<span class="avatar-mini" aria-hidden="true">' + Utils.escapeHtml(initial) + '</span>' +
                   '<span class="avatar-name">' + Utils.escapeHtml(shortEmail(row.primary_owner)) + '</span>';
          }
        },
        {
          key: 'contacts_count', label: 'Kontakty', sortable: true,
          render: function(row) {
            return '<span class="num">' + (row.contacts_count || 0) + '</span>';
          }
        },
        {
          key: 'active_benefits_count', label: 'Benefity', sortable: true,
          render: function(row) {
            const n = row.active_benefits_count || 0;
            return n > 0 ? '<span class="badge badge-info">' + n + '</span>' : '<span class="muted">—</span>';
          }
        },
        {
          key: 'last_interaction_at', label: 'Ostatnia interakcja', sortable: true,
          render: function(row) {
            if (!row.last_interaction_at) return '<span class="muted">—</span>';
            return '<time datetime="' + Utils.escapeHtml(row.last_interaction_at) + '" title="' +
                   formatDate(row.last_interaction_at) + '">' +
                   relativeTime(row.last_interaction_at) + '</time>';
          }
        }
      ],
      rows: companies,
      onRowClick: function(row) {
        Router.navigate('#company/' + row.company_id);
      }
    });
  }

  function exportCsv() {
    const cached = readCache();
    if (!cached || !cached.companies || cached.companies.length === 0) {
      Toast.error('Brak danych do eksportu');
      return;
    }

    const headers = ['ID', 'Nazwa', 'Branża', 'Tagi', 'WWW', 'Opiekun główny', 'Backup editors',
                    'Liczba kontaktów', 'Aktywne benefity', 'Ostatnia interakcja',
                    'Notatki', 'Utworzona', 'Utworzona przez'];

    const rows = cached.companies.map(function(c) {
      return [
        c.company_id || '',
        c.name || '',
        c.industry || '',
        c.tags || '',
        c.www || '',
        c.primary_owner || '',
        c.backup_editors || '',
        c.contacts_count || 0,
        c.active_benefits_count || 0,
        c.last_interaction_at ? formatDate(c.last_interaction_at) : '',
        (c.notes || '').replace(/\r?\n/g, ' '),
        c.created_at ? formatDate(c.created_at) : '',
        c.created_by || ''
      ];
    });

    const today = new Date().toISOString().split('T')[0];
    Utils.downloadCsv('firmy_' + today + '.csv', headers, rows);
  }

  // -------------- cache --------------

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.timestamp) return null;
      if (Date.now() - obj.timestamp > CACHE_TTL_MS) return null;
      return obj.data;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {}
  }

  function invalidateCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  // -------------- helpers --------------

  function shortEmail(email) {
    if (!email) return '';
    const at = email.indexOf('@');
    if (at === -1) return email;
    return email.substring(0, at);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pl-PL', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'przed chwilą';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + ' ' + Table.plural(min, 'min temu', 'min temu', 'min temu');
    const h = Math.floor(min / 60);
    if (h < 24) return h + ' ' + Table.plural(h, 'godz. temu', 'godz. temu', 'godz. temu');
    const days = Math.floor(h / 24);
    if (days < 30) return days + ' ' + Table.plural(days, 'dzień temu', 'dni temu', 'dni temu');
    const months = Math.floor(days / 30);
    if (months < 12) return months + ' ' + Table.plural(months, 'miesiąc temu', 'miesiące temu', 'miesięcy temu');
    const years = Math.floor(days / 365);
    return years + ' ' + Table.plural(years, 'rok temu', 'lata temu', 'lat temu');
  }

  return {
    render: render,
    invalidateCache: invalidateCache
  };
})();
