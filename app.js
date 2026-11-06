/* داتا جامعة المنيا – Minia University Data
   Developer: دكتور محمد محمود  */
(function () {
  'use strict';

  const APP_NAME = 'داتا جامعة المنيا';
  const DEVELOPER = 'دكتور محمد محمود';
  const VERSION = '1.0.0';
  const KEY = 'minia_univ_data_v1';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, '0');
  const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const stamp = () => nowLocal().replace(/[-:]/g, '').replace('T', '_');

  /* ------------------------------------------------------------ storage */
  let db = { records: [] };
  try { db = JSON.parse(localStorage.getItem(KEY)) || db; } catch (e) { /* ignore */ }
  if (!Array.isArray(db.records)) db.records = [];
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('⚠️ تعذر الحفظ – المساحة ممتلئة'); } };

  /* ------------------------------------------------------------ helpers */
  const subIndex = ar => { const i = SUBDIVISIONS.findIndex(s => s.ar === ar); return i < 0 ? 99 : i; };
  const subEn = ar => (SUBDIVISIONS.find(s => s.ar === ar) || {}).en || '';
  const formOf = r => FORMS[r.form];
  const fieldMap = id => { const m = {}; fieldsOf(FORMS[id]).forEach(f => (m[f.k] = f)); return m; };

  /* Lab rows have no subdivision: take it from the linked field record (same Sample ID) */
  function linkedRecord(r) {
    if (r.form !== 'lab') return null;
    const id = (r.data.sample_id || '').trim();
    if (!id) return null;
    return db.records.find(o => o.form !== 'lab' && idsOf(o).includes(id)) || null;
  }
  function idsOf(r) {
    const d = r.data, out = [];
    ['sample_id', 'animal_sample_id', 'human_sample_id', 'env_id'].forEach(k => d[k] && out.push(String(d[k]).trim()));
    if (d.sample_ids) String(d.sample_ids).split(/[,;،\s]+/).forEach(x => x && out.push(x));
    return out;
  }
  const effSub = r => r.data.subdivision || (linkedRecord(r) || { data: {} }).data.subdivision || '';
  const mainId = r => r.data.sample_id || '';

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ------------------------------------------------------------ files */
  function bytesToB64(bytes) {
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  async function saveFile(bytes, name, mime) {
    if (isNative()) {
      try {
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const r = await Filesystem.writeFile({ path: name, data: bytesToB64(bytes), directory: 'CACHE' });
        await Share.share({ title: name, text: name, url: r.uri, dialogTitle: 'حفظ / مشاركة الملف' });
        return;
      } catch (e) {
        if (e && /cancel/i.test(String(e.message || e))) return;
        toast('تعذر حفظ الملف: ' + (e && e.message ? e.message : e));
        return;
      }
    }
    const blob = new Blob([bytes], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* ------------------------------------------------------------ Excel export */
  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  function fmtVal(f, v) {
    if (v == null || v === '') return '';
    if (Array.isArray(v)) return v.join(', ');
    if (f.t === 'number') { const n = Number(v); return isFinite(n) && String(v).trim() !== '' ? n : v; }
    if (f.t === 'datetime' || f.t === 'date') return String(v).replace('T', ' ');
    return v;
  }

  function sortForExport(recs) {
    return recs.slice().sort((a, b) =>
      subIndex(effSub(a)) - subIndex(effSub(b)) ||
      String(a.data.datetime || a.created).localeCompare(String(b.data.datetime || b.created)) ||
      mainId(a).localeCompare(mainId(b), undefined, { numeric: true }));
  }

  function sheetFor(formId, recs) {
    const form = FORMS[formId], fields = fieldsOf(form);
    const headers = [], getters = [];
    fields.forEach(f => {
      headers.push(f.t === 'subdiv' ? 'Subdivision' : f.l);
      getters.push(r => fmtVal(f, r.data[f.k]));
      if (f.t === 'subdiv') { headers.push('Subdivision (EN)'); getters.push(r => subEn(r.data.subdivision)); }
    });
    if (formId === 'lab') {
      headers.push('Subdivision (linked)', 'Subdivision (EN)');
      getters.push(r => effSub(r), r => subEn(effSub(r)));
    }
    headers.push('Created', 'Updated');
    getters.push(r => (r.created || '').replace('T', ' ').slice(0, 16), r => (r.updated || '').replace('T', ' ').slice(0, 16));
    return { name: form.en, headers, rows: sortForExport(recs).map(r => getters.map(g => g(r))) };
  }

  function summarySheet(recs) {
    const headers = ['Subdivision', 'Subdivision (EN)', ...FORM_ORDER.map(f => FORMS[f].en), 'Total'];
    const rows = SUBDIVISIONS.map(s => {
      const counts = FORM_ORDER.map(f => recs.filter(r => r.form === f && effSub(r) === s.ar).length);
      return [s.ar, s.en, ...counts, counts.reduce((a, b) => a + b, 0)];
    });
    const rest = FORM_ORDER.map(f => recs.filter(r => r.form === f && !effSub(r)).length);
    if (rest.some(Boolean)) rows.push(['(غير محدد)', 'Not specified', ...rest, rest.reduce((a, b) => a + b, 0)]);
    return { name: 'Summary', headers, rows };
  }

  async function exportRecords(recs, scope, withSummary) {
    if (!recs.length) { toast('لا توجد سجلات للتصدير'); return; }
    const sheets = [];
    if (withSummary) sheets.push(summarySheet(recs));
    FORM_ORDER.forEach(f => {
      const sub = recs.filter(r => r.form === f);
      if (sub.length) sheets.push(sheetFor(f, sub));
    });
    const bytes = XL.build(sheets);
    await saveFile(bytes, `MiniaData_${scope}_${stamp()}.xlsx`, XLSX_MIME);
  }

  /* ------------------------------------------------------------ router */
  const view = $('#view');
  let flt = freshFilter();
  function freshFilter() { return { sector: 'all', subdiv: '', from: '', to: '', q: '', sort: 'new', conds: [], panel: false }; }

  function go(h) { if (location.hash === '#/' + h) route(); else location.hash = '#/' + h; }

  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    const page = parts[0];
    window.scrollTo(0, 0);
    $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === (page === 'form' ? (parts[2] === 'new' ? 'new' : 'records') : page)));
    if (page === 'records') renderRecords();
    else if (page === 'form' && FORMS[parts[1]]) renderForm(parts[1], parts[2]);
    else if (page === 'new') renderNew();
    else if (page === 'about') renderAbout();
    else renderHome();
  }

  /* ------------------------------------------------------------ home */
  function renderHome() {
    const total = db.records.length;
    let h = `<div class="hero"><div class="hero-t">${APP_NAME}</div>
      <div class="hero-s" dir="ltr">Zoonotic Salmonella One Health Surveillance · Minya</div>
      <div class="hero-n">${total} <small>سجل / records</small></div></div>`;
    h += '<div class="grid">';
    FORM_ORDER.forEach(id => {
      const f = FORMS[id], n = db.records.filter(r => r.form === id).length;
      h += `<div class="card sector">
        <div class="ic">${f.icon}</div>
        <div class="sn"><b>${f.ar}</b><span dir="ltr">Form ${f.no} – ${f.en}</span></div>
        <div class="cnt">${n}</div>
        <div class="btns"><a class="btn sm" href="#/form/${id}">➕ إضافة</a>
        <button class="btn sm ghost" data-act="list" data-s="${id}">📋 عرض</button></div></div>`;
    });
    h += '</div>';
    h += `<div class="card"><h3>المراكز · Subdivisions</h3>`;
    if (!total) h += '<p class="muted">لا توجد بيانات بعد. ابدأ بإضافة نموذج جديد.</p>';
    else {
      h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subdivision</th>' +
        FORM_ORDER.map(f => `<th>${FORMS[f].icon}</th>`).join('') + '<th>Σ</th></tr></thead><tbody>';
      SUBDIVISIONS.forEach(s => {
        const c = FORM_ORDER.map(f => db.records.filter(r => r.form === f && effSub(r) === s.ar).length);
        const sum = c.reduce((a, b) => a + b, 0);
        h += `<tr data-act="sub" data-s="${esc(s.ar)}"><td><b>${s.ar}</b> <small dir="ltr">${s.en}</small></td>` +
          c.map(x => `<td>${x || '·'}</td>`).join('') + `<td><b>${sum}</b></td></tr>`;
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';
    h += `<div class="card"><h3>تصدير · Export</h3>
      <button class="btn block" data-act="export-all">⬇️ تصدير كل البيانات إلى Excel</button>
      <p class="muted">ملف واحد: ورقة لكل نموذج + ورقة ملخص بالمراكز.</p></div>`;
    view.innerHTML = h;
  }

  function renderNew() {
    view.innerHTML = '<div class="card"><h3>إضافة نموذج جديد</h3>' + FORM_ORDER.map(id => {
      const f = FORMS[id];
      return `<a class="btn block ghost" href="#/form/${id}/new">${f.icon} ${f.ar} <span dir="ltr">· Form ${f.no} – ${f.en}</span></a>`;
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------ records */
  const filterFields = sector => sector === 'all' ? [] :
    fieldsOf(FORMS[sector]).filter(f => (f.t === 'radio' || f.t === 'multi'));

  function applyFilter() {
    const q = flt.q.trim().toLowerCase();
    let recs = db.records.filter(r => {
      if (flt.sector !== 'all' && r.form !== flt.sector) return false;
      if (flt.subdiv && effSub(r) !== flt.subdiv) return false;
      const day = String(r.data.datetime || r.created || '').slice(0, 10);
      if (flt.from && (!day || day < flt.from)) return false;
      if (flt.to && (!day || day > flt.to)) return false;
      for (const c of flt.conds) {
        const v = r.data[c.k];
        if (Array.isArray(v) ? !v.includes(c.v) : v !== c.v) return false;
      }
      if (q) {
        const hay = Object.values(r.data).map(v => Array.isArray(v) ? v.join(' ') : v).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dt = r => String(r.data.datetime || r.created || '');
    if (flt.sort === 'sub') recs.sort((a, b) => subIndex(effSub(a)) - subIndex(effSub(b)) || mainId(a).localeCompare(mainId(b), undefined, { numeric: true }));
    else if (flt.sort === 'id') recs.sort((a, b) => mainId(a).localeCompare(mainId(b), undefined, { numeric: true }));
    else recs.sort((a, b) => dt(b).localeCompare(dt(a)));
    return recs;
  }

  function renderRecords() {
    const secs = [['all', 'الكل · All']].concat(FORM_ORDER.map(f => [f, `${FORMS[f].icon} ${FORMS[f].ar}`]));
    view.innerHTML = `
      <div class="chips scroll" id="secChips">${secs.map(([k, l]) => `<button class="pill ${flt.sector === k ? 'on' : ''}" data-act="sector" data-s="${k}">${l}</button>`).join('')}</div>
      <div class="row">
        <input id="q" type="search" placeholder="🔍 بحث (رقم العينة، القرية، ...)" value="${esc(flt.q)}">
        <button class="btn sm ${flt.panel ? '' : 'ghost'}" data-act="panel">⚙️ تصنيف</button>
      </div>
      <div id="panel" class="card ${flt.panel ? '' : 'hide'}">
        <h3>تصنيف سريع</h3>
        <div class="chips wrap" id="presets">${PRESETS.map((p, i) => `<button class="pill sm" data-act="preset" data-i="${i}">${p.l}</button>`).join('')}</div>
        <div class="two">
          <label>Subdivision<select id="fSub"><option value="">— الكل —</option>${SUBDIVISIONS.map(s => `<option value="${s.ar}" ${flt.subdiv === s.ar ? 'selected' : ''}>${s.ar} – ${s.en}</option>`).join('')}</select></label>
          <label>الترتيب<select id="fSort">
            <option value="new" ${flt.sort === 'new' ? 'selected' : ''}>الأحدث</option>
            <option value="sub" ${flt.sort === 'sub' ? 'selected' : ''}>المركز (أبجدي)</option>
            <option value="id" ${flt.sort === 'id' ? 'selected' : ''}>رقم العينة</option></select></label>
          <label>من تاريخ<input type="date" id="fFrom" value="${flt.from}"></label>
          <label>إلى تاريخ<input type="date" id="fTo" value="${flt.to}"></label>
        </div>
        <div id="condBox"></div>
        <button class="btn sm ghost" data-act="reset">↺ مسح كل الفلاتر</button>
      </div>
      <div class="count" id="count"></div>
      <div id="list"></div>
      <div class="bar-bottom"><button class="btn block" data-act="export-filtered">⬇️ تصدير النتائج إلى Excel</button></div>`;
    $('#q').addEventListener('input', e => { flt.q = e.target.value; refreshList(); });
    $('#fSub').addEventListener('change', e => { flt.subdiv = e.target.value; refreshList(); });
    $('#fSort').addEventListener('change', e => { flt.sort = e.target.value; refreshList(); });
    $('#fFrom').addEventListener('change', e => { flt.from = e.target.value; refreshList(); });
    $('#fTo').addEventListener('change', e => { flt.to = e.target.value; refreshList(); });
    renderConds();
    refreshList();
  }

  function renderConds() {
    const box = $('#condBox'); if (!box) return;
    if (flt.sector === 'all') { box.innerHTML = '<p class="muted">اختر نوع العينة (دواجن / ماشية / بشر ...) لإضافة شروط تفصيلية مثل: حمى، إسهال.</p>'; return; }
    const ff = filterFields(flt.sector);
    let h = '<h3>شروط إضافية</h3>';
    if (flt.conds.length) {
      const fm = fieldMap(flt.sector);
      h += '<div class="chips wrap">' + flt.conds.map((c, i) =>
        `<span class="pill on rm" dir="ltr">${esc((fm[c.k] || {}).l)}: ${esc(c.v)} <b data-act="rmc" data-i="${i}">✕</b></span>`).join('') + '</div>';
    }
    h += `<div class="two" dir="ltr"><select id="cField">${ff.map(f => `<option value="${f.k}">${esc(f.l)}</option>`).join('')}</select>
      <select id="cVal"></select></div><button class="btn sm" data-act="addc">+ أضف الشرط</button>`;
    box.innerHTML = h;
    const fill = () => {
      const f = ff.find(x => x.k === $('#cField').value);
      $('#cVal').innerHTML = (f ? f.o : []).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
    };
    $('#cField').addEventListener('change', fill); fill();
  }

  function recTitle(r) { return mainId(r) || '(بدون رقم)'; }

  function refreshList() {
    const recs = applyFilter();
    $('#count').textContent = `${recs.length} من ${db.records.length} سجل`;
    if (!recs.length) { $('#list').innerHTML = '<div class="empty">لا توجد سجلات مطابقة</div>'; return; }
    $('#list').innerHTML = recs.slice(0, 300).map(r => {
      const f = formOf(r), d = r.data, sub = effSub(r);
      const badges = (f.badges(d) || []).filter(Boolean).map(b => `<span class="badge" dir="ltr">${esc(b)}</span>`).join('');
      const when = String(d.datetime || r.created || '').replace('T', ' ').slice(0, 16);
      return `<a class="rec" href="#/form/${r.form}/${r.id}">
        <div class="rec-top"><b dir="ltr">${esc(recTitle(r))}</b><span class="tag">${f.icon} ${f.ar}</span></div>
        <div class="rec-sub">${sub ? `<b>${esc(sub)}</b> · ` : ''}${esc(d.village || '')} ${when ? '· ' + when : ''}</div>
        <div class="badges">${badges}</div></a>`;
    }).join('') + (recs.length > 300 ? `<div class="muted c">يعرض أول 300 سجل – التصدير يشمل الكل</div>` : '');
  }

  /* ------------------------------------------------------------ form */
  function fieldHtml(f, v) {
    const lab = `<label class="fl" for="f_${f.k}">${esc(f.l)}${f.req ? ' <i>*</i>' : ''}</label>`;
    const id = `id="f_${f.k}" name="${f.k}"`;
    switch (f.t) {
      case 'text': return `<div class="fld">${lab}<input type="text" ${id} value="${esc(v)}" autocomplete="off"></div>`;
      case 'number': return `<div class="fld">${lab}<input type="number" inputmode="decimal" step="any" ${id} value="${esc(v)}"></div>`;
      case 'datetime': return `<div class="fld">${lab}<input type="datetime-local" ${id} value="${esc(v)}"></div>`;
      case 'date': return `<div class="fld">${lab}<input type="date" ${id} value="${esc(v)}"></div>`;
      case 'textarea': return `<div class="fld">${lab}<textarea rows="3" ${id}>${esc(v)}</textarea></div>`;
      case 'gps': return `<div class="fld">${lab}<div class="gps"><input type="text" ${id} value="${esc(v)}" placeholder="28.1099, 30.7503"><button type="button" class="btn sm" data-act="gps">📍</button></div></div>`;
      case 'subdiv':
        return `<div class="fld">${lab}<div class="chips wrap">` + SUBDIVISIONS.map(s =>
          `<label class="chip"><input type="radio" name="${f.k}" value="${s.ar}" ${v === s.ar ? 'checked' : ''}><span>${s.ar} <small>${s.en}</small></span></label>`).join('') + '</div></div>';
      case 'radio':
      case 'multi': {
        const type = f.t === 'radio' ? 'radio' : 'checkbox';
        const cur = f.t === 'radio' ? [v] : (Array.isArray(v) ? v : []);
        return `<div class="fld">${lab}<div class="chips wrap">` + f.o.map(o =>
          `<label class="chip"><input type="${type}" name="${f.k}" value="${esc(o)}" ${cur.includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('') +
          '</div>' + (f.consent ? '<div class="warn hide" id="consentWarn">⛔ لا يمكن أخذ عينة بدون موافقة مستنيرة</div>' : '') + '</div>';
      }
    }
    return '';
  }

  function renderForm(formId, recId) {
    const form = FORMS[formId];
    let rec = recId && recId !== 'new' ? db.records.find(r => r.id === recId) : null;
    if (recId && !rec && recId !== 'new') { toast('السجل غير موجود'); go('records'); return; }
    let data;
    if (rec) data = rec.data;
    else if (window.__dup && window.__dup.form === formId) { data = window.__dup.data; window.__dup = null; }
    else { data = {}; if (form.common) data.datetime = nowLocal(); }

    let h = `<div class="form-head"><a class="back" href="#/records" data-act="back">‹ رجوع</a>
      <div><b>${form.icon} ${form.ar}</b> <span dir="ltr">Form ${form.no} – ${form.en}</span></div></div>
      <p class="note" dir="ltr">${esc(form.note)}</p><form id="frm" class="ltr" autocomplete="off" novalidate>`;
    const secs = form.sections.slice();
    secs.forEach((s, si) => {
      h += `<div class="card"><h3 dir="ltr">${esc(s.t)}</h3>`;
      if (si === 0 && form.common) h += COMMON.map(f => fieldHtml(f, data[f.k])).join('');
      h += s.f.map(f => fieldHtml(f, data[f.k])).join('');
      h += '</div>';
    });
    h += `<div class="card">${fieldHtml(NOTES, data.notes)}</div></form>
      <div class="bar-bottom two-btn">
        <button class="btn" data-act="save">💾 حفظ</button>
        ${rec ? '<button class="btn ghost" data-act="dup">⎘ نسخ</button><button class="btn danger" data-act="del">🗑</button>' : ''}
      </div>`;
    view.innerHTML = h;
    view.dataset.form = formId; view.dataset.rec = rec ? rec.id : '';
    wireForm(form);
  }

  function wireForm(form) {
    const frm = $('#frm');
    const fm = fieldMap(form.id);
    frm.addEventListener('click', e => {
      const inp = e.target.closest('input[type=radio]');
      if (inp) { /* tap again to clear */
        if (inp.dataset.was === '1') { inp.checked = false; inp.dataset.was = ''; }
        else { $$(`input[name="${inp.name}"]`, frm).forEach(x => (x.dataset.was = '')); inp.dataset.was = '1'; }
        checkConsent();
      }
    });
    $$('input[type=radio]', frm).forEach(x => { if (x.checked) x.dataset.was = '1'; });
    frm.addEventListener('change', e => {
      const inp = e.target;
      if (inp.type !== 'checkbox') return;
      const f = fm[inp.name]; if (!f || !f.excl) return;
      const all = $$(`input[name="${inp.name}"]`, frm);
      if (inp.checked) {
        if (f.excl.includes(inp.value)) all.forEach(x => { if (x !== inp) x.checked = false; });
        else all.forEach(x => { if (f.excl.includes(x.value)) x.checked = false; });
      }
    });
    if (form.id === 'lab') {
      const idEl = $('#f_sample_id');
      idEl.addEventListener('blur', () => {
        const id = idEl.value.trim(); if (!id) return;
        const hit = db.records.find(o => o.form !== 'lab' && idsOf(o).includes(id));
        if (hit && !$('input[name=sector]:checked', frm)) {
          const v = FORMS[hit.form].en, el = $(`input[name=sector][value="${v}"]`, frm);
          if (el) { el.checked = true; el.dataset.was = '1'; toast('تم ربط العينة بنموذج ' + FORMS[hit.form].ar); }
        }
      });
    }
    checkConsent();
  }

  function checkConsent() {
    const w = $('#consentWarn'); if (!w) return;
    const c = $('input[name=consent]:checked');
    w.classList.toggle('hide', !(c && c.value.startsWith('No')));
  }

  function collect(form) {
    const frm = $('#frm'), out = {};
    fieldsOf(form).forEach(f => {
      if (f.t === 'radio' || f.t === 'subdiv') { const c = $(`input[name="${f.k}"]:checked`, frm); out[f.k] = c ? c.value : ''; }
      else if (f.t === 'multi') out[f.k] = $$(`input[name="${f.k}"]:checked`, frm).map(i => i.value);
      else { const el = $(`[name="${f.k}"]`, frm); out[f.k] = el ? el.value.trim() : ''; }
    });
    return out;
  }

  function saveRecord() {
    const formId = view.dataset.form, form = FORMS[formId], recId = view.dataset.rec;
    const data = collect(form);
    if (!String(data.sample_id || '').trim()) { toast('⚠️ أدخل رقم العينة (Sample ID)'); const el = $('#f_sample_id'); el && el.focus(); return; }
    if (data.consent && data.consent.startsWith('No')) { toast('⛔ لا يمكن تسجيل عينة بدون موافقة'); return; }
    const dup = db.records.find(r => r.form === formId && r.id !== recId && mainId(r) === data.sample_id);
    if (dup && !confirm('رقم العينة موجود مسبقاً. هل تريد الحفظ على أي حال؟')) return;
    const now = new Date().toISOString();
    if (recId) { const r = db.records.find(x => x.id === recId); r.data = data; r.updated = now; }
    else db.records.push({ id: uid(), form: formId, data, created: now, updated: now });
    persist();
    toast('✅ تم الحفظ');
    flt.sector = formId; flt.conds = []; flt.subdiv = ''; flt.q = '';
    go('records');
  }

  function dupRecord() {
    const formId = view.dataset.form, form = FORMS[formId];
    const data = collect(form);
    fieldsOf(form).forEach(f => { if (f.u) data[f.k] = ''; });
    window.__dup = { form: formId, data };
    location.hash = '#/form/' + formId + '/new';
    toast('تم النسخ – أدخل رقم العينة الجديد');
  }

  function delRecord() {
    if (!confirm('حذف هذا السجل نهائياً؟')) return;
    db.records = db.records.filter(r => r.id !== view.dataset.rec);
    persist(); toast('تم الحذف'); go('records');
  }

  async function getGPS(btn) {
    const input = btn.parentElement.querySelector('input');
    btn.disabled = true; toast('جاري تحديد الموقع…');
    try {
      let pos;
      const P = window.Capacitor && window.Capacitor.Plugins;
      if (isNative() && P && P.Geolocation) {
        try { await P.Geolocation.requestPermissions(); } catch (e) { /* ignore */ }
        pos = await P.Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000 });
      } else {
        pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 20000 }));
      }
      input.value = pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6);
      toast('✅ تم تحديد الموقع');
    } catch (e) { toast('تعذر تحديد الموقع – فعّل GPS وصلاحية الموقع'); }
    btn.disabled = false;
  }

  /* ------------------------------------------------------------ about / backup */
  function renderAbout() {
    view.innerHTML = `
      <div class="hero"><div class="hero-t">${APP_NAME}</div>
        <div class="hero-s">Minia University Data</div></div>
      <div class="card"><h3>حول التطبيق</h3>
        <p><b>المطور:</b> ${DEVELOPER}</p>
        <p><b>الإصدار:</b> ${VERSION}</p>
        <p class="muted" dir="ltr">Zoonotic Salmonella One Health Surveillance, Minya – Poultry · Cattle · Human · Environment · Laboratory</p>
        <p class="muted">البيانات تُحفظ على الجهاز فقط (بدون إنترنت). لا تُدخل أسماء أو أرقام قومية للمشاركين.</p></div>
      <div class="card"><h3>نسخة احتياطية</h3>
        <button class="btn block" data-act="export-all">⬇️ تصدير كل البيانات إلى Excel</button>
        <button class="btn block ghost" data-act="backup">💾 نسخة احتياطية (JSON)</button>
        <button class="btn block ghost" data-act="restore">📥 استرجاع نسخة احتياطية</button>
        <input type="file" id="restoreFile" accept=".json,application/json" class="hide">
        <p class="muted">احتفظ بنسخة احتياطية بشكل دوري، خصوصاً قبل حذف التطبيق أو تغيير الجهاز.</p></div>
      <div class="card"><h3>مسح البيانات</h3>
        <button class="btn block danger" data-act="wipe">🗑 حذف كل السجلات</button></div>`;
    $('#restoreFile').addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const j = JSON.parse(await file.text());
        const recs = Array.isArray(j) ? j : j.records;
        if (!Array.isArray(recs)) throw new Error('bad');
        let add = 0, upd = 0;
        recs.forEach(r => {
          if (!r || !r.id || !FORMS[r.form] || !r.data) return;
          const i = db.records.findIndex(x => x.id === r.id);
          if (i >= 0) { db.records[i] = r; upd++; } else { db.records.push(r); add++; }
        });
        persist(); toast(`تم الاسترجاع: ${add} جديد، ${upd} محدّث`);
      } catch (err) { toast('ملف غير صالح'); }
      e.target.value = '';
    });
  }

  /* ------------------------------------------------------------ events */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    switch (act) {
      case 'list': flt = freshFilter(); flt.sector = el.dataset.s; go('records'); break;
      case 'sub': flt = freshFilter(); flt.subdiv = el.dataset.s; flt.panel = true; flt.sort = 'sub'; go('records'); break;
      case 'sector': flt.sector = el.dataset.s; flt.conds = []; renderRecords(); break;
      case 'panel': flt.panel = !flt.panel; $('#panel').classList.toggle('hide', !flt.panel); el.classList.toggle('ghost', !flt.panel); break;
      case 'preset': {
        const p = PRESETS[+el.dataset.i];
        flt.sector = p.s; flt.conds = p.c.map(([k, v]) => ({ k, v })); flt.panel = true; renderRecords(); break;
      }
      case 'addc': {
        const k = $('#cField').value, v = $('#cVal').value;
        if (k && v && !flt.conds.some(c => c.k === k && c.v === v)) flt.conds.push({ k, v });
        renderConds(); refreshList(); break;
      }
      case 'rmc': flt.conds.splice(+el.dataset.i, 1); renderConds(); refreshList(); break;
      case 'reset': flt = freshFilter(); flt.panel = true; renderRecords(); break;
      case 'export-filtered': {
        const recs = applyFilter();
        const scope = (flt.sector === 'all' ? 'All' : FORMS[flt.sector].en) + (recs.length !== db.records.length ? '_filtered' : '');
        exportRecords(recs, scope, false); break;
      }
      case 'export-all': exportRecords(db.records, 'All', true); break;
      case 'save': saveRecord(); break;
      case 'dup': dupRecord(); break;
      case 'del': delRecord(); break;
      case 'gps': getGPS(el); break;
      case 'back': e.preventDefault(); if (history.length > 1) history.back(); else go('records'); break;
      case 'backup': {
        const bytes = new TextEncoder().encode(JSON.stringify({ app: APP_NAME, version: VERSION, exported: new Date().toISOString(), records: db.records }, null, 1));
        saveFile(bytes, `MiniaData_backup_${stamp()}.json`, 'application/json'); break;
      }
      case 'restore': $('#restoreFile').click(); break;
      case 'wipe':
        if (confirm('سيتم حذف كل السجلات نهائياً. هل أنت متأكد؟') && confirm('تأكيد أخير: حذف جميع البيانات؟')) { db.records = []; persist(); toast('تم مسح البيانات'); renderAbout(); }
        break;
    }
  });

  window.addEventListener('hashchange', route);
  if ('serviceWorker' in navigator && !isNative() && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  route();
})();
