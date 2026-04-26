/**
 * components/table.js — uniwersalny komponent listy/tabeli z RWD.
 *
 * Strategia: na desktopie renderuje <table>, na mobile karty.
 * Decyzja przez media query w CSS — nie JS-em (lepsza wydajność, lepiej z czytnikami).
 *
 * Filtrowanie i sortowanie po stronie klienta — backend zwraca pełen zestaw,
 * komponent sam to obsługuje. Strategia opisana w specyfikacji rozdz. 6.3.
 *
 * API:
 *   Table.render(containerEl, {
 *     columns: [
 *       { key: 'name', label: 'Nazwa', sortable: true,
 *         render: function(row) { return '<a href="...">'+row.name+'</a>'; } },
 *       { key: 'industry', label: 'Branża', sortable: true },
 *       { key: 'actions', label: '', render: ..., sortable: false }
 *     ],
 *     rows: [{...}, {...}],
 *     emptyMessage: 'Brak firm.',
 *     pageSize: 25,                            // domyślnie 25
 *     mobileCardRender: function(row) { ... }, // override układu karty na mobile
 *     onRowClick: function(row, e) { ... },    // klik w wiersz/kartę
 *     keyField: 'company_id'                   // dla unikalnych kluczy w DOM
 *   })
 */

const Table = (function() {

  let stateMap = new WeakMap(); // container -> { sortBy, sortDir, page, filter, options }

  function render(container, options) {
    options = options || {};
    options.pageSize = options.pageSize || 25;

    let state = stateMap.get(container);
    if (!state || state.lastOptionsKey !== JSON.stringify({ cols: options.columns.map(function(c) { return c.key; }) })) {
      state = {
        sortBy: options.defaultSortBy || null,
        sortDir: options.defaultSortDir || 'desc',
        page: 1,
        filter: '',
        lastOptionsKey: JSON.stringify({ cols: options.columns.map(function(c) { return c.key; }) })
      };
      stateMap.set(container, state);
    }
    state.options = options;

    rerender(container);
  }

  function rerender(container) {
    const state = stateMap.get(container);
    if (!state) return;
    const opts = state.options;

    // Filtrowanie (jeśli włączone search)
    let filtered = opts.rows;
    if (state.filter && opts.searchableFields) {
      const q = state.filter.toLowerCase();
      filtered = opts.rows.filter(function(row) {
        for (let i = 0; i < opts.searchableFields.length; i++) {
          const v = row[opts.searchableFields[i]];
          if (v && String(v).toLowerCase().indexOf(q) !== -1) return true;
        }
        return false;
      });
    }

    // Sortowanie
    if (state.sortBy) {
      const dir = state.sortDir === 'asc' ? 1 : -1;
      filtered = filtered.slice().sort(function(a, b) {
        const va = a[state.sortBy];
        const vb = b[state.sortBy];
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb), 'pl') * dir;
      });
    }

    // Paginacja
    const totalPages = Math.max(1, Math.ceil(filtered.length / opts.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const startIdx = (state.page - 1) * opts.pageSize;
    const pageRows = filtered.slice(startIdx, startIdx + opts.pageSize);

    // Render
    container.innerHTML = '';

    // Toolbar (search + counter)
    if (opts.searchableFields) {
      const toolbar = document.createElement('div');
      toolbar.className = 'table-toolbar';
      toolbar.innerHTML =
        '<input type="search" class="table-search" placeholder="' +
        (opts.searchPlaceholder || 'Szukaj...') +
        '" value="' + Utils.escapeHtml(state.filter) + '" aria-label="Wyszukiwarka">' +
        '<span class="table-counter" aria-live="polite">' +
        filtered.length + ' ' + plural(filtered.length, 'wynik', 'wyniki', 'wyników') +
        '</span>';
      container.appendChild(toolbar);
      const searchInput = toolbar.querySelector('.table-search');
      searchInput.addEventListener('input', function() {
        state.filter = searchInput.value;
        state.page = 1;
        rerender(container);
        // przywróć focus po rerenderze
        const newInput = container.querySelector('.table-search');
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
      });
    }

    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'table-empty';
      empty.textContent = state.filter ? 'Brak wyników dla zadanego wyszukiwania.' : (opts.emptyMessage || 'Brak danych.');
      container.appendChild(empty);
      return;
    }

    // Wrapper żeby przełączać desktop/mobile w CSS
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.appendChild(buildTable(pageRows, opts, state, container));
    wrap.appendChild(buildCards(pageRows, opts));
    container.appendChild(wrap);

    // Paginacja
    if (totalPages > 1) {
      container.appendChild(buildPagination(state.page, totalPages, container));
    }
  }

  function buildTable(rows, opts, state, container) {
    const table = document.createElement('table');
    table.className = 'data-table';

    // Nagłówek
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    opts.columns.forEach(function(col) {
      const th = document.createElement('th');
      th.scope = 'col';
      if (col.sortable) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sort-btn';
        let arrow = '';
        if (state.sortBy === col.key) {
          arrow = state.sortDir === 'asc' ? ' ↑' : ' ↓';
          th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
        } else {
          th.setAttribute('aria-sort', 'none');
        }
        btn.innerHTML = Utils.escapeHtml(col.label) + arrow;
        btn.addEventListener('click', function() {
          if (state.sortBy === col.key) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortBy = col.key;
            state.sortDir = 'asc';
          }
          rerender(container);
        });
        th.appendChild(btn);
      } else {
        th.textContent = col.label;
      }
      if (col.thClass) th.className = col.thClass;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    rows.forEach(function(row) {
      const tr = document.createElement('tr');
      if (opts.keyField) tr.setAttribute('data-key', row[opts.keyField] || '');
      opts.columns.forEach(function(col) {
        const td = document.createElement('td');
        td.setAttribute('data-label', col.label);
        if (col.tdClass) td.className = col.tdClass;
        td.innerHTML = renderCellContent(col, row);
        tr.appendChild(td);
      });
      if (opts.onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', function(e) {
          // nie wywołujemy gdy klik był w link/przycisk/input
          if (e.target.closest('a,button,input,select,textarea')) return;
          opts.onRowClick(row, e);
        });
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  function buildCards(rows, opts) {
    const list = document.createElement('div');
    list.className = 'data-cards';
    list.setAttribute('role', 'list');

    rows.forEach(function(row) {
      const card = document.createElement('article');
      card.className = 'data-card';
      card.setAttribute('role', 'listitem');
      if (opts.mobileCardRender) {
        card.innerHTML = opts.mobileCardRender(row);
      } else {
        // Default: tytułowa kolumna jako h3, pozostałe jako lista
        const titleCol = opts.columns[0];
        let html = '<h3 class="card-title">' + renderCellContent(titleCol, row) + '</h3>';
        for (let i = 1; i < opts.columns.length; i++) {
          const c = opts.columns[i];
          if (!c.label) continue;
          html += '<div class="card-row"><span class="card-label">' + Utils.escapeHtml(c.label) + ':</span> ' +
                  '<span class="card-value">' + renderCellContent(c, row) + '</span></div>';
        }
        card.innerHTML = html;
      }
      if (opts.onRowClick) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function(e) {
          if (e.target.closest('a,button,input,select,textarea')) return;
          opts.onRowClick(row, e);
        });
      }
      list.appendChild(card);
    });
    return list;
  }

  function renderCellContent(col, row) {
    if (col.render) {
      return col.render(row);
    }
    const val = row[col.key];
    if (val === null || val === undefined || val === '') return '<span class="muted">—</span>';
    return Utils.escapeHtml(String(val));
  }

  function buildPagination(page, totalPages, container) {
    const nav = document.createElement('nav');
    nav.className = 'table-pagination';
    nav.setAttribute('aria-label', 'Paginacja wyników');

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.textContent = '◀ Poprzednia';
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener('click', function() {
      const state = stateMap.get(container);
      state.page--;
      rerender(container);
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = 'Następna ▶';
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener('click', function() {
      const state = stateMap.get(container);
      state.page++;
      rerender(container);
    });

    const info = document.createElement('span');
    info.className = 'page-info';
    info.textContent = 'Strona ' + page + ' z ' + totalPages;

    nav.appendChild(prevBtn);
    nav.appendChild(info);
    nav.appendChild(nextBtn);
    return nav;
  }

  function plural(n, one, few, many) {
    n = Math.abs(n);
    if (n === 1) return one;
    const last = n % 10;
    const lastTwo = n % 100;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
    return many;
  }

  return {
    render: render,
    plural: plural
  };
})();
