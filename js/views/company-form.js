/**
 * views/company-form.js — modal dodawania i edycji firmy.
 *
 * Używa Modal.open() do wyświetlenia. Po zapisie wywołuje onSaved(savedCompany).
 *
 * API:
 *   CompanyFormView.openCreate(onSaved)
 *   CompanyFormView.openEdit(company, lookups, onSaved)
 */

const CompanyFormView = (function() {

  function openCreate(onSaved) {
    // Najpierw potrzebujemy lookups dla branż
    Spinner.wrap(
      Api.get('lookups', { categories: 'industry,company_tag' }),
      'Ładowanie...'
    ).then(function(resp) {
      const lookups = resp.ok ? (resp.lookups || {}) : {};
      doOpen(null, lookups, onSaved);
    }, function(err) {
      Toast.error(err.message || 'Nie udało się załadować');
    });
  }

  function openEdit(company, lookups, onSaved) {
    // Lookups powinno być dostępne, ale na wszelki wypadek pobieramy
    if (!lookups || !lookups.industry) {
      Spinner.wrap(
        Api.get('lookups', { categories: 'industry,company_tag' }),
        'Ładowanie...'
      ).then(function(resp) {
        const lk = resp.ok ? (resp.lookups || {}) : {};
        doOpen(company, lk, onSaved);
      });
    } else {
      doOpen(company, lookups, onSaved);
    }
  }

  function doOpen(company, lookups, onSaved) {
    const isEdit = !!company;
    const title = isEdit ? 'Edycja firmy' : 'Nowa firma';

    const industries = lookups.industry || [];
    const companyTags = lookups.company_tag || [];

    const form = document.createElement('form');
    form.id = 'company-form';
    form.setAttribute('novalidate', '');
    form.innerHTML = buildFormHtml(company, industries, companyTags);

    Modal.open({
      title: title,
      content: form,
      size: 'medium'
    });

    attachFormHandlers(form, company, isEdit, onSaved);
  }

  function buildFormHtml(company, industries, companyTags) {
    const c = company || {};

    const industryOpts = industries.map(function(i) {
      const sel = c.industry === i.value ? ' selected' : '';
      return '<option value="' + Utils.escapeHtml(i.value) + '"' + sel + '>' +
             Utils.escapeHtml(i.label) + '</option>';
    }).join('');

    const currentTags = (c.tags || '').split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; });
    const tagsCheckboxes = companyTags.map(function(t) {
      const checked = currentTags.indexOf(t.value) !== -1 ? ' checked' : '';
      return '<label class="tag-checkbox">' +
             '<input type="checkbox" name="tag" value="' + Utils.escapeHtml(t.value) + '"' + checked + '> ' +
             Utils.escapeHtml(t.label) +
             '</label>';
    }).join('');

    return (
      '<div class="form-row">' +
        '<label for="cf-name">Nazwa firmy <span class="required" aria-label="wymagane">*</span></label>' +
        '<input type="text" id="cf-name" name="name" required maxlength="200" ' +
               'value="' + Utils.escapeHtml(c.name || '') + '" autocomplete="off">' +
        '<div class="field-error" id="err-name" role="alert"></div>' +
      '</div>' +

      '<div class="form-row">' +
        '<label for="cf-industry">Branża <span class="required" aria-label="wymagane">*</span></label>' +
        '<select id="cf-industry" name="industry" required>' +
          (c.industry ? '' : '<option value="">— wybierz —</option>') +
          industryOpts +
        '</select>' +
        '<div class="field-error" id="err-industry" role="alert"></div>' +
      '</div>' +

      '<div class="form-row">' +
        '<label for="cf-www">Strona WWW</label>' +
        '<input type="url" id="cf-www" name="www" maxlength="500" ' +
               'value="' + Utils.escapeHtml(c.www || '') + '" placeholder="https://..." autocomplete="off">' +
        '<small class="form-hint">Główny adres WWW. Dodatkowe (jak Linkedin czy social) będą w kanałach kontaktowych (Etap 1B).</small>' +
      '</div>' +

      (companyTags.length > 0
        ? '<div class="form-row">' +
            '<fieldset>' +
              '<legend>Tagi firmy</legend>' +
              '<div class="tag-checkboxes">' + tagsCheckboxes + '</div>' +
              '<small class="form-hint">Tagi pomagają grupować firmy w raportach. Listę można dostosować w panelu admina.</small>' +
            '</fieldset>' +
          '</div>'
        : '') +

      '<div class="form-row">' +
        '<label for="cf-notes">Notatki</label>' +
        '<textarea id="cf-notes" name="notes" rows="6" maxlength="10000">' +
          Utils.escapeHtml(c.notes || '') +
        '</textarea>' +
        '<small class="form-hint">Pamięć o firmie - historia relacji, specyfika, kontekst. ' +
          'To miejsce na to, czego nie da się wpisać w słownik.</small>' +
      '</div>' +

      '<div class="form-row">' +
        '<label for="cf-backup">Zastępcy (backup editors)</label>' +
        '<input type="text" id="cf-backup" name="backup_editors" ' +
               'value="' + Utils.escapeHtml(c.backup_editors || '') + '" ' +
               'placeholder="email1@x.pl, email2@y.pl" autocomplete="off">' +
        '<small class="form-hint">Lista emaili (oddzielone przecinkami) osób mogących edytować tę firmę. ' +
          'Wpisz tylko emaile użytkowników systemu.</small>' +
      '</div>' +

      '<div class="form-actions">' +
        '<button type="button" id="cf-cancel" class="secondary outline">Anuluj</button>' +
        '<button type="submit" id="cf-submit">' + (company ? 'Zapisz zmiany' : 'Utwórz firmę') + '</button>' +
      '</div>'
    );
  }

  function attachFormHandlers(form, company, isEdit, onSaved) {
    form.querySelector('#cf-cancel').addEventListener('click', function() {
      Modal.close();
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      submitForm(form, company, isEdit, onSaved);
    });

    // Walidacja inline na blur
    form.querySelector('#cf-name').addEventListener('blur', function() {
      validateField('name', this.value.trim());
    });
    form.querySelector('#cf-industry').addEventListener('change', function() {
      validateField('industry', this.value);
    });
  }

  function validateField(field, value) {
    const errEl = document.getElementById('err-' + field);
    if (!errEl) return true;
    errEl.textContent = '';

    if (field === 'name') {
      if (!value) { errEl.textContent = 'Nazwa firmy jest wymagana.'; return false; }
      if (value.length > 200) { errEl.textContent = 'Nazwa zbyt długa (max 200).'; return false; }
    }
    if (field === 'industry') {
      if (!value) { errEl.textContent = 'Wybierz branżę.'; return false; }
    }
    return true;
  }

  function clearAllErrors() {
    document.querySelectorAll('.field-error').forEach(function(el) { el.textContent = ''; });
  }

  function submitForm(form, company, isEdit, onSaved) {
    clearAllErrors();

    // Zbierz dane
    const name = form.querySelector('#cf-name').value.trim();
    const industry = form.querySelector('#cf-industry').value;
    const www = form.querySelector('#cf-www').value.trim();
    const notes = form.querySelector('#cf-notes').value;
    const backupEditors = form.querySelector('#cf-backup').value.trim();
    const tagsArr = Array.from(form.querySelectorAll('input[name="tag"]:checked'))
                          .map(function(cb) { return cb.value; });
    const tags = tagsArr.join(',');

    // Walidacja
    let valid = true;
    if (!validateField('name', name)) valid = false;
    if (!validateField('industry', industry)) valid = false;
    if (!valid) return;

    const payload = {
      name: name,
      industry: industry,
      www: www,
      notes: notes,
      tags: tags,
      backup_editors: backupEditors
    };

    const action = isEdit ? 'company_update' : 'company_create';
    const params = isEdit ? { id: company.company_id } : {};

    // Disable przycisków
    const submitBtn = form.querySelector('#cf-submit');
    const cancelBtn = form.querySelector('#cf-cancel');
    submitBtn.disabled = true;
    cancelBtn.disabled = true;

    Spinner.wrap(
      Api.post(action, params, payload),
      isEdit ? 'Zapisywanie...' : 'Tworzenie firmy...'
    ).then(function(resp) {
      if (resp.ok) {
        Modal.close();
        if (onSaved) onSaved(resp.company);
      } else {
        // Pokazujemy błąd w odpowiednim miejscu
        if (resp.error === 'duplicate') {
          const err = document.getElementById('err-name');
          if (err) err.textContent = resp.message;
        } else if (resp.error === 'validation') {
          Toast.error(resp.message);
        } else {
          Toast.error(resp.message || 'Błąd zapisu');
        }
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    }, function(err) {
      Toast.error(err.message || 'Błąd połączenia');
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
    });
  }

  return {
    openCreate: openCreate,
    openEdit: openEdit
  };
})();
