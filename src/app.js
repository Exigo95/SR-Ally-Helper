// Verbündeten-Schmiede – App-Logik
(function () {
  'use strict';
  const SR = window.SR;
  const STORE_KEY = 'verbuendeten-schmiede.v1';

  // ---------------- Zustand ----------------
  function defaultState() {
    return {
      version: 1,
      step: 'mage',
      mage: {
        name: '', tradition: 'hermetic',
        spirits: Object.assign({}, SR.TRADITIONS.hermetic.spirits),
        drainLabel: SR.TRADITIONS.hermetic.drain,
        magie: 6, edge: 3, grad: 1,
        herbeirufen: 6, binden: 6, arkana: 4, logik: 4,
        drainA: 4, drainB: 4, geistLimit: 5,
        logeKraft: 6, karma: 80,
        ritualGelernt: true
      },
      ally: { name: '', konzept: '', ebene: '', force: 4, notizen: '', type: '', applyMods: true,
              customMods: { K: 0, G: 0, R: 0, S: 0, W: 0, L: 0, I: 0, C: 0, ini: 0 } },
      form: { type: 'materialization', baseForm: '', extraForms: [], vessel: '' },
      powers: [],          // { id, detail }
      skills: [],          // { name }
      spells: [],          // { name, cat, known }
      options: { allPowers: false }
    };
  }

  let state = load() || defaultState();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return migrate(merge(defaultState(), JSON.parse(raw)));
    } catch (e) { return null; }
  }
  // Ältere Speicherstände auf neue Bezeichnungen umstellen
  function migrate(st) {
    const renameSpirit = { guidance: 'advisor', task: 'helper' };
    const renamePower = { shadow_cloak: 'shadow' };
    for (const k of Object.keys(st.mage.spirits)) if (renameSpirit[st.mage.spirits[k]]) st.mage.spirits[k] = renameSpirit[st.mage.spirits[k]];
    st.powers = st.powers.map(p => ({ id: renamePower[p.id] || p.id, detail: p.detail || '' })).filter(p => SR.POWERS[p.id]);
    if (st.ally.type && !SR.SPIRITS[st.ally.type]) st.ally.type = '';
    if (!SR.TRADITIONS[st.mage.tradition]) st.mage.tradition = 'custom';
    return st;
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
  }
  function merge(base, data) {
    if (!data || typeof data !== 'object') return base;
    const out = Object.assign({}, base);
    for (const k of Object.keys(base)) {
      if (!(k in data)) continue;
      const b = base[k], d = data[k];
      if (b && typeof b === 'object' && !Array.isArray(b) && d && typeof d === 'object' && !Array.isArray(d)) out[k] = merge(b, d);
      else out[k] = d;
    }
    return out;
  }

  // ---------------- Hilfen ----------------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
  const getPath = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
  function setPath(p, v) {
    const ks = p.split('.'); let o = state;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = v;
  }
  const exp = (dice) => (dice / 3).toFixed(1).replace('.', ',');
  const F = () => state.ally.force;
  const maxForce = () => Math.max(1, state.mage.magie * 2);

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------------- Regeln / Berechnung ----------------
  function powerPool() {
    // Map powerId -> [{spirit, kind}]
    const pool = {};
    const types = new Set(Object.values(state.mage.spirits));
    for (const t of types) {
      const sp = SR.SPIRITS[t]; if (!sp) continue;
      sp.std.forEach(id => (pool[id] = pool[id] || []).push({ spirit: t, kind: 'std' }));
      sp.opt.forEach(id => (pool[id] = pool[id] || []).push({ spirit: t, kind: 'opt' }));
    }
    if (state.options.allPowers) {
      for (const id of Object.keys(SR.POWERS)) if (!pool[id]) pool[id] = [];
    }
    return pool;
  }

  function tradTypes() { return [...new Set(Object.values(state.mage.spirits))].filter(t => SR.SPIRITS[t]); }
  function allyType() {
    const t = tradTypes();
    if (!t.includes(state.ally.type)) state.ally.type = t[0] || 'fire';
    return state.ally.type;
  }
  function mods() {
    const z = { K: 0, G: 0, R: 0, S: 0, W: 0, L: 0, I: 0, C: 0, ini: 0 };
    if (!state.ally.applyMods) return z;
    const sp = SR.SPIRITS[allyType()];
    return Object.assign(z, sp && sp.mods ? sp.mods : state.ally.customMods);
  }

  function hasSkill(name) { return state.skills.some(s => s.name.toLowerCase() === name.toLowerCase()); }

  function calc() {
    const f = F();
    const freePowers = f;
    const nPowers = state.powers.length;
    const paidPowers = Math.max(0, nPowers - freePowers);
    const lines = [
      { key: 'force', label: `Kraft ${f} × ${SR.COST.perForce}`, value: f * SR.COST.perForce },
      { key: 'forms', label: `Zusätzliche Gestalten (${state.form.type === 'materialization' ? state.form.extraForms.length : 0} × ${SR.COST.extraForm})`, value: (state.form.type === 'materialization' ? state.form.extraForms.length : 0) * SR.COST.extraForm },
      { key: 'powers', label: `Zusätzliche Kräfte (${paidPowers} × ${SR.COST.extraPower})`, value: paidPowers * SR.COST.extraPower },
      { key: 'skills', label: `Zusätzliche Fertigkeiten (${state.skills.length} × ${SR.COST.extraSkill})`, value: state.skills.length * SR.COST.extraSkill },
      { key: 'spells', label: `Zauber (${state.spells.length})`, value: state.spells.reduce((a, s) => a + (s.known ? SR.COST.spellKnown : SR.COST.spellUnknown), 0) }
    ];
    const total = lines.reduce((a, l) => a + l.value, 0);
    return { lines, total, freePowers, nPowers, paidPowers };
  }

  // Prüfungen: { step, level: err|warn|info|ok, text }
  function issues() {
    const m = state.mage, f = F(), out = [];
    const c = calc();
    if (m.grad < 1) out.push({ step: 'mage', level: 'warn', text: 'Das Ritual „Verbündetenbeschwörung“ ist laut Straßengrimoire Initiaten vorbehalten (Initiatengrad ≥ 1).' });
    if (!m.ritualGelernt) out.push({ step: 'mage', level: 'warn', text: 'Der Beschwörer muss das Ritual „Verbündetenbeschwörung“ beherrschen.' });
    if (m.logeKraft < f) out.push({ step: 'mage', level: 'err', text: `Die Kraft der magischen Loge (${m.logeKraft}) muss mindestens der Kraft des Verbündeten (${f}) entsprechen.` });
    if (f > maxForce()) out.push({ step: 'ally', level: 'err', text: `Kraft ${f} übersteigt das Doppelte der Magie (${maxForce()}).` });
    else if (f > m.magie) out.push({ step: 'ally', level: 'warn', text: `Kraft ${f} > Magie ${m.magie}: Der Entzug beim Herbeirufen und Binden ist körperlich.` });
    if (c.total > m.karma) out.push({ step: 'summary', level: 'err', text: `Es fehlen ${c.total - m.karma} Karma. Kann das Karma nicht bezahlt werden, scheitert das Ritual.` });
    if (state.form.type === 'inhabitation' && !state.form.vessel.trim()) out.push({ step: 'form', level: 'warn', text: 'Für Bewohnung muss vor dem Ritual ein vorbereitetes Gefäß existieren – bitte beschreiben.' });
    if (state.form.type === 'materialization' && !state.form.baseForm.trim()) out.push({ step: 'form', level: 'info', text: 'Beschreibe die Grundgestalt des Verbündeten.' });
    for (const p of state.powers) {
      const def = SR.POWERS[p.id]; if (!def) continue;
      if (def.detail && !String(p.detail || '').trim()) out.push({ step: 'powers', level: 'warn', text: `${def.de}: Bitte festlegen (${def.detail === 'element' ? 'Element/Form' : def.hint}).` });
      if (def.needsSkill && !hasSkill(def.needsSkill)) out.push({ step: 'skills', level: 'warn', text: `${def.de} benötigt die Fertigkeit „${def.needsSkill}“ (5 Karma).` });
    }
    const pool = powerPool();
    const outside = state.powers.filter(p => !pool[p.id] || pool[p.id].length === 0);
    if (outside.length) out.push({ step: 'powers', level: 'warn', text: `Nicht traditionsgemäß: ${outside.map(p => SR.POWERS[p.id].de).join(', ')} – nur mit Zustimmung der Spielleitung.` });
    if (state.spells.length && !hasSkill('Spruchzauberei')) out.push({ step: 'skills', level: 'warn', text: 'Der Verbündete kennt Zauber, hat aber keine Fertigkeit „Spruchzauberei“.' });
    if (state.spells.some(s => !s.known)) out.push({ step: 'spells', level: 'info', text: 'Für Zauber, die der Beschwörer nicht kennt, werden trotzdem Zauberformeln benötigt.' });
    if (hasSkill('Fliegen')) out.push({ step: 'skills', level: 'info', text: 'Fliegen ist nur erlaubt, wenn es zur Gestalt des Verbündeten passt.' });
    if (SR.TRADITIONS[m.tradition].possession && state.form.type !== 'possession') out.push({ step: 'form', level: 'info', text: `${SR.TRADITIONS[m.tradition].de} ist eine Besessenheitstradition – die Geister dieser Tradition besitzen Gefäße statt zu materialisieren. Bitte im Buch prüfen und ggf. „Besessenheit“ wählen.` });
    const spT = SR.SPIRITS[allyType()];
    if (spT && !spT.verified) out.push({ step: 'ally', level: 'info', text: `${spT.de}: Attribute und Kräfte sind noch nicht aus dem Buch geprüft – bitte mit dem Grundregelwerk abgleichen (Modifikatoren kannst du selbst eintragen).` });
    const unv = tradTypes().filter(t => !SR.SPIRITS[t].verified);
    if (unv.length) out.push({ step: 'mage', level: 'info', text: `Noch nicht aus dem Buch geprüft: ${unv.map(t => SR.SPIRITS[t].de).join(', ')}.` });
    if (!state.ally.name.trim()) out.push({ step: 'ally', level: 'info', text: 'Der Verbündete hat noch keinen Namen.' });
    if (!state.ally.ebene.trim()) out.push({ step: 'ally', level: 'info', text: 'Die Heimat-Metaebene wird in der Formel festgelegt – bitte angeben.' });
    return out;
  }

  function stepStatus(step) {
    const list = issues().filter(i => i.step === step);
    if (list.some(i => i.level === 'err')) return 'err';
    if (list.some(i => i.level === 'warn')) return 'warn';
    return 'ok';
  }

  // ---------------- Navigation ----------------
  const STEPS = [
    { id: 'mage', label: 'Beschwörer' },
    { id: 'ally', label: 'Grunddaten & Kraft' },
    { id: 'form', label: 'Gestalt' },
    { id: 'powers', label: 'Kräfte' },
    { id: 'skills', label: 'Fertigkeiten' },
    { id: 'spells', label: 'Zauber' },
    { id: 'summary', label: 'Übersicht & Ritual' }
  ];

  function renderSteps() {
    $('#steps').innerHTML = STEPS.map((s, i) => `
      <button class="step ${state.step === s.id ? 'active' : ''}" data-step="${s.id}">
        <span class="step-num">${i + 1}</span>
        <span class="step-label">${s.label}</span>
        <span class="step-dot ${stepStatus(s.id)}"></span>
      </button>`).join('') +
      `<div class="steps-foot">Regelgrundlage: Straßengrimoire (SR5), Abschnitt „Verbündetengeister“. Werte immer mit der Spielleitung abstimmen.<br><br>Deine Daten bleiben nur in diesem Browser gespeichert. Zum Sichern oder Weitergeben: „Speichern“ (JSON).<br><br>Inoffizielles Fan-Werkzeug. Shadowrun ist eine Marke der jeweiligen Rechteinhaber.</div>`;
  }

  // ---------------- Bausteine ----------------
  const numField = (path, label, opts = {}) => `
    <div class="field ${opts.cls || ''}">
      <label>${label}</label>
      <input type="number" data-path="${path}" data-num="1" min="${opts.min ?? 0}" max="${opts.max ?? 99}" value="${esc(getPath(path))}">
      ${opts.help ? `<div class="help">${opts.help}</div>` : ''}
    </div>`;
  const textField = (path, label, opts = {}) => `
    <div class="field ${opts.cls || ''}">
      <label>${label}</label>
      <input type="text" data-path="${path}" value="${esc(getPath(path))}" placeholder="${esc(opts.ph || '')}">
      ${opts.help ? `<div class="help">${opts.help}</div>` : ''}
    </div>`;
  const checkField = (path, label) => `
    <label class="check"><input type="checkbox" data-path="${path}" ${getPath(path) ? 'checked' : ''}><span class="box"></span>${label}</label>`;
  const head = (eyebrow, title, text) => `<div class="view-head"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${text}</p></div>`;
  const notesInner = (step) => issues().filter(i => i.step === step).map(i => `<div class="note ${i.level}">${esc(i.text)}</div>`).join('');
  const notesFor = (step) => `<div class="notes" data-notes="${step}">${notesInner(step)}</div>`;

  // ---------------- Ansichten ----------------
  const views = {};

  views.mage = () => {
    const m = state.mage;
    const tradOpts = Object.entries(SR.TRADITIONS).map(([k, t]) => `<option value="${k}" ${m.tradition === k ? 'selected' : ''}>${t.de}${t.src !== '—' ? ` (${t.src})` : ''}${t.verified === false ? ' – ungeprüft' : ''}</option>`).join('');
    const spiritOpts = (sel) => Object.entries(SR.SPIRITS).map(([k, s]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${s.de}</option>`).join('');
    return head('Schritt 1', 'Der Beschwörer', 'Die Werte des Magiers bestimmen, welche Kräfte erlaubt sind, wie hoch die Kraft sein darf und welche Würfelpools beim Ritual zur Verfügung stehen.') + `
    <div class="card">
      <h2>Person & Tradition</h2>
      <p class="sub">Die Tradition legt fest, welche Geistertypen – und damit welche Kräfte – für den Verbündeten infrage kommen.</p>
      <div class="grid g3">
        ${textField('mage.name', 'Name des Beschwörers', { ph: 'z. B. Lysandra „Ash“ Vey' })}
        <div class="field"><label>Tradition</label><select id="tradSelect">${tradOpts}</select></div>
        ${textField('mage.drainLabel', 'Entzugsattribute', { ph: 'z. B. Logik + Willenskraft' })}
      </div>
      <div style="margin-top:16px" class="grid g5">
        ${SR.CATEGORIES.map(c => `<div class="field"><label>${c.de}</label><select data-spirit="${c.id}">${spiritOpts(m.spirits[c.id])}</select></div>`).join('')}
      </div>
      ${SR.TRADITIONS[m.tradition].verified === false ? '<div class="note info">Die Zuordnung dieser Tradition ist noch nicht aus dem Buch geprüft – bitte abgleichen. Sie ist frei änderbar.</div>' : ''}
    </div>
    <div class="card">
      <h2>Magische Werte</h2>
      <p class="sub">Werden für Höchstkraft, Würfelpools und den Voraussetzungs-Check verwendet.</p>
      <div class="grid g4">
        ${numField('mage.magie', 'Magie', { min: 1, max: 20 })}
        ${numField('mage.grad', 'Initiatengrad', { max: 20 })}
        ${numField('mage.edge', 'Edge', { min: 1, max: 9, help: 'Der Verbündete übernimmt den Edge-Wert.' })}
        ${numField('mage.logeKraft', 'Kraft der magischen Loge', { max: 20 })}
        ${numField('mage.herbeirufen', 'Herbeirufen')}
        ${numField('mage.binden', 'Binden')}
        ${numField('mage.arkana', 'Arkana')}
        ${numField('mage.logik', 'Logik', { min: 1 })}
        ${numField('mage.drainA', 'Entzugsattribut 1', { help: 'Wert des ersten Attributs' })}
        ${numField('mage.drainB', 'Entzugsattribut 2', { help: 'meist Willenskraft' })}
        ${numField('mage.geistLimit', 'Geistiges Limit', { min: 1 })}
        ${numField('mage.karma', 'Verfügbares Karma', { max: 9999 })}
      </div>
      <div style="margin-top:14px">${checkField('mage.ritualGelernt', 'Beherrscht das Ritual „Verbündetenbeschwörung“')}</div>
      ${notesFor('mage')}
    </div>`;
  };

  function typeCard() {
    const types = tradTypes(), cur = allyType(), sp = SR.SPIRITS[cur], d = mods();
    const opts = types.map(t => `<option value="${t}" ${cur === t ? 'selected' : ''}>${SR.SPIRITS[t].de}${SR.SPIRITS[t].verified ? '' : ' (ungeprüft)'}</option>`).join('');
    const keys = [['K', 'KON'], ['G', 'GES'], ['R', 'REA'], ['S', 'STR'], ['W', 'WIL'], ['L', 'LOG'], ['I', 'INT'], ['C', 'CHA']];
    const fmt = v => v === 0 ? 'Kraft' : `Kraft ${v > 0 ? '+' : '−'} ${Math.abs(v)}`;
    const manual = state.ally.applyMods && !sp.mods;
    const sb0 = statBlock();
    return `<div class="card">
      <div class="card-head"><h2>Geistertyp</h2>${sp.verified ? '<span class="tag std">aus dem Buch geprüft</span>' : '<span class="tag paid">nicht geprüft</span>'}</div>
      <p class="sub">Der Verbündete ist ein Geist eines Typs deiner Tradition. Der Typ bestimmt die Attribute; die Kräfte wählst du in Schritt 4.</p>
      <div class="grid g2">
        <div class="field"><label>Geistertyp</label><select id="allyType">${opts}</select></div>
        <div class="field" style="align-self:end;padding-bottom:9px">${checkField('ally.applyMods', 'Attributsmodifikatoren des Geistertyps anwenden')}</div>
      </div>
      <div class="stat-row" style="grid-template-columns:repeat(8,minmax(0,1fr));margin-top:14px">
        ${keys.map(([k, l]) => `<div class="stat"><div class="k">${l}</div><div class="v" style="font-size:12.5px;padding-top:3px">${fmt(d[k])}</div></div>`).join('')}
      </div>
      ${sb0.extra ? `<div class="note info">${esc(sb0.extra)}</div>` : ''}
      <div class="help" style="margin-top:8px;color:var(--faint);font-size:12px">Magie und Essenz = Kraft, Edge = Edge des Beschwörers · Initiative (Kraft × 2)${d.ini ? ' + ' + d.ini : ''} + 2W6${state.ally.applyMods ? '' : ' (Modifikatoren aus)'}</div>
      ${manual ? `<div class="note warn">Für diesen Typ sind noch keine Werte hinterlegt. Trage die Modifikatoren aus dem Grundregelwerk ein:</div>
      <div class="grid g5" style="margin-top:10px">${keys.map(([k, l]) => numField('ally.customMods.' + k, l, { min: -5, max: 9 })).join('')}${numField('ally.customMods.ini', 'Ini-Zuschlag', { min: -5, max: 9 })}</div>` : ''}
    </div>`;
  }

  views.ally = () => {
    const a = state.ally, f = F(), mx = maxForce();
    return head('Schritt 2', 'Grunddaten & Kraft', 'Die Kraft ist der Kern der Formel: Sie bestimmt alle Attribute, die Zahl der Gratiskräfte und den Großteil der Karmakosten.') + `
    <div class="card">
      <h2>Identität</h2>
      <p class="sub">Die Formel ist eine physische Darstellung des Geistes – ähnlich der Thesis eines Initiaten.</p>
      <div class="grid g2">
        ${textField('ally.name', 'Name des Verbündeten', { ph: 'z. B. Vesper' })}
        ${textField('ally.ebene', 'Heimat-Metaebene', { ph: 'z. B. Ebene des Feuers', help: 'Wird durch die Formel festgelegt. Eine metaplanare Queste dorthin kann den Verbündeten vernichten.' })}
        ${textField('ally.konzept', 'Konzept / Rolle', { ph: 'z. B. Wächter und Ratgeber', cls: 'span2' })}
      </div>
    </div>
    ${typeCard()}
    <div class="card">
      <div class="card-head"><h2>Kraft</h2><span class="tag">${f} × ${SR.COST.perForce} = <b>${f * SR.COST.perForce}</b> Karma</span></div>
      <p class="sub">Höchstens das Doppelte der Magie (${mx}). Liegt die Kraft über der Magie, wird der Entzug körperlich.</p>
      <div class="force-wrap">
        <div class="force-num" id="forceNum">${f}</div>
        <div class="force-slider">
          <input type="range" id="forceRange" min="1" max="${mx}" value="${Math.min(f, mx)}">
          <div class="ticks">${Array.from({ length: mx }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
        </div>
      </div>
      <div class="grid g3" style="margin-top:16px">
        <div class="field"><label>Gratiskräfte</label><div class="big" style="font-size:18px;font-weight:650">${f}</div><div class="help">1 pro Kraftpunkt</div></div>
        <div class="field"><label>Attribute & Fertigkeiten</label><div style="font-size:18px;font-weight:650">Kraft ± Typ</div><div class="help">Attribute je nach Geistertyp, Fertigkeiten = Kraft</div></div>
        <div class="field"><label>Später erhöhen</label><div style="font-size:18px;font-weight:650">${SR.COST.changeForce} Karma / Punkt</div><div class="help">per Ritual der Wandlung – jetzt nur ${SR.COST.perForce}</div></div>
      </div>
      ${notesFor('ally')}
    </div>
    <div class="card">
      <h2>Notizen</h2>
      <p class="sub">Aussehen, Persönlichkeit, Gestaltung der Formel (Gemälde, Skulptur, Code …).</p>
      <textarea data-path="ally.notizen" placeholder="Freitext …">${esc(a.notizen)}</textarea>
    </div>`;
  };

  views.form = () => {
    const fo = state.form;
    const cards = Object.entries(SR.FORMS).map(([k, d]) => `
      <button class="opt-card ${fo.type === k ? 'sel' : ''}" data-form="${k}">
        <div class="t">${d.de}</div><div class="en">${d.en}</div><div class="d">${d.text}</div>
      </button>`).join('');
    let detail = '';
    if (fo.type === 'materialization') {
      detail = `
      <div class="card">
        <h2>Grundgestalt</h2>
        <p class="sub">Meist passend zur Tradition des Beschwörers. Inklusive.</p>
        <input type="text" data-path="form.baseForm" value="${esc(fo.baseForm)}" placeholder="z. B. Eine Gestalt aus glühender Asche mit Rabenschwingen">
      </div>
      <div class="card">
        <div class="card-head"><h2>Zusätzliche Gestalten</h2><span class="tag">je ${SR.COST.extraForm} Karma</span></div>
        <p class="sub">Wechsel zwischen den Gestalten ist eine Komplexe Handlung.</p>
        ${fo.extraForms.length ? `<table><tbody>${fo.extraForms.map((x, i) => `
          <tr><td><input type="text" data-extraform="${i}" value="${esc(x)}"></td><td class="num" style="width:70px">${SR.COST.extraForm}</td><td style="width:44px"><button class="btn icon danger" data-delform="${i}" title="Entfernen">✕</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Keine zusätzlichen Gestalten.</div>'}
        <div style="margin-top:10px"><button class="btn small" id="addForm">+ Gestalt hinzufügen</button></div>
      </div>`;
    } else {
      detail = `
      <div class="card">
        <h2>${fo.type === 'inhabitation' ? 'Vorbereitetes Gefäß' : 'Gefäße (optional)'}</h2>
        <p class="sub">${fo.type === 'inhabitation' ? 'Das Gefäß muss vor dem Ritual existieren. Die Bewohnung dauert ' + F() + ' Tage.' : 'Vorbereitete Gefäße, die der Verbündete in Besitz nehmen kann.'}</p>
        <textarea data-path="form.vessel" placeholder="z. B. Eine handgefertigte Bronzestatue eines Wolfes">${esc(fo.vessel)}</textarea>
      </div>`;
    }
    return head('Schritt 3', 'Gestalt', 'Ein Verbündeter besitzt genau eine der drei Gestaltkräfte. Die gewählte Kraft ist im Grundpreis enthalten.') +
      `<div class="card"><h2>Gestaltkraft</h2><p class="sub">Genau eine Auswahl.</p><div class="options3">${cards}</div></div>` + detail +
      `<div class="card-plain" style="max-width:980px">${notesFor('form')}</div>`;
  };

  views.powers = () => {
    const c = calc(), f = F();
    const pool = powerPool();
    const selIds = state.powers.map(p => p.id);
    const curT = SR.SPIRITS[allyType()];
    const rank = (id) => curT.std.includes(id) ? 0 : curT.opt.includes(id) ? 1 : 2;
    const ids = Object.keys(pool).sort((a, b) => rank(a) - rank(b) || SR.POWERS[a].de.localeCompare(SR.POWERS[b].de, 'de'));
    const used = Math.min(c.nPowers, f);
    const cards = ids.map(id => {
      const def = SR.POWERS[id];
      const idx = selIds.indexOf(id);
      const sel = idx >= 0;
      const srcs = pool[id].map(s => `<span class="tag ${s.kind}">${SR.SPIRITS[s.spirit].de} · ${s.kind === 'std' ? 'Standard' : 'optional'}</span>`).join('') || '<span class="tag">außerhalb der Tradition</span>';
      const neu = def.src === 'SGR' ? '<span class="tag">neu · Straßengrimoire</span>' : '';
      let detail = '';
      if (sel && def.detail) {
        const val = state.powers[idx].detail || '';
        detail = def.detail === 'element'
          ? `<div class="power-detail"><select data-pdetail="${id}"><option value="">– Element/Form wählen –</option>${SR.ELEMENTS.map(e => `<option ${val === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>`
          : `<div class="power-detail"><input type="text" data-pdetail="${id}" value="${esc(val)}" placeholder="${esc(def.hint)}"></div>`;
      }
      const costTag = sel ? (idx < f ? '<span class="tag free">gratis</span>' : `<span class="tag paid">${SR.COST.extraPower} Karma</span>`) : '';
      return `<div class="power ${sel ? 'sel' : ''}">
        <div class="power-top">
          <label class="check"><input type="checkbox" data-power="${id}" ${sel ? 'checked' : ''}><span class="box"></span></label>
          <div class="power-name"><span class="n">${def.de}</span>${def.en ? `<span class="en">${def.en}</span>` : ''}</div>
          ${costTag}
        </div>
        <div class="power-srcs">${srcs}${neu}</div>
        ${detail}
      </div>`;
    }).join('');
    return head('Schritt 4', 'Kräfte', `Jeder Verbündete erhält die Basiskräfte automatisch. Dazu kommen ${f} Gratiskräfte (1 pro Kraftpunkt) aus den Kräften der Geister deiner Tradition; jede weitere kostet ${SR.COST.extraPower} Karma.`) + `
    <div class="card">
      <h2>Basiskräfte</h2>
      <p class="sub">Immer enthalten, plus die gewählte Gestaltkraft.</p>
      <div class="chips">${SR.BASE_POWERS.map(p => `<span class="chip teal">${p.de} <span class="en">${p.en}</span></span>`).join('')}<span class="chip accent">${SR.FORMS[state.form.type].de} <span class="en">${SR.FORMS[state.form.type].en}</span></span></div>
    </div>
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Wählbare Kräfte</h2>
          <p class="sub" style="margin-bottom:8px">Die ersten ${f} gewählten Kräfte sind gratis – die Reihenfolge der Auswahl zählt. Kräfte deines Geistertyps (${curT.de}) stehen oben.</p>
        </div>
        ${checkField('options.allPowers', 'Alle Kräfte zeigen (inkl. neue aus dem Straßengrimoire, mit SL-Erlaubnis)')}
      </div>
      <div class="counter" style="margin-bottom:12px">
        <span class="big">${used}/${f}</span><span style="color:var(--muted)">Gratiskräfte genutzt</span>
        ${c.paidPowers ? `<span class="tag paid">+${c.paidPowers} zusätzlich = ${c.paidPowers * SR.COST.extraPower} Karma</span>` : ''}
      </div>
      <div class="meter ${c.nPowers > f ? 'over' : ''}" style="margin-bottom:16px"><div style="width:${Math.min(100, (c.nPowers / Math.max(1, f)) * 100)}%"></div></div>
      <div class="power-grid">${cards}</div>
      ${notesFor('powers')}
    </div>`;
  };

  views.skills = () => {
    const f = F();
    const typeSk = (SR.SPIRITS[allyType()].skills || []).filter(n => !SR.BASE_SKILLS.includes(n));
    const skillSugg = [...typeSk.map(name => ({ name, typ: true })), ...SR.SKILL_SUGGESTIONS.filter(x => !typeSk.includes(x.name))];
    const list = state.skills.map((s, i) => {
      const sug = SR.SKILL_SUGGESTIONS.find(x => x.name === s.name);
      return `<tr><td>${esc(s.name)}${sug && sug.magic ? ' <span class="tag opt">magisch</span>' : ''}</td><td class="num">${f}</td><td class="num">${SR.COST.extraSkill}</td><td style="width:44px"><button class="btn icon danger" data-delskill="${i}" title="Entfernen">✕</button></td></tr>`;
    }).join('');
    return head('Schritt 5', 'Fertigkeiten', `Alle Fertigkeiten des Verbündeten haben die Stufe seiner Kraft (${f}). Zusätzliche Fertigkeiten kosten je ${SR.COST.extraSkill} Karma. Fertigkeiten der Beschwörungsgruppe sind ausgeschlossen.`) + `
    <div class="card">
      <h2>Basisfertigkeiten</h2>
      <p class="sub">Immer enthalten, Stufe ${f}.</p>
      <div class="chips">${SR.BASE_SKILLS.map(s => `<span class="chip teal">${s} <b>${f}</b></span>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-head"><h2>Zusätzliche Fertigkeiten</h2><span class="tag">je ${SR.COST.extraSkill} Karma</span></div>
      <p class="sub">Fertigkeiten, die der Beschwörer kennt oder die für eine Kraft nötig sind. Magische Fertigkeiten nur, wenn der Beschwörer sie beherrscht.</p>
      <div class="sugg" style="margin-bottom:6px">${skillSugg.map(s => `<button data-addskill="${esc(s.name)}" ${hasSkill(s.name) ? 'disabled' : ''} title="${esc(s.note || '')}">${s.typ ? '★' : '+'} ${esc(s.name)}</button>`).join('')}</div>
      ${typeSk.length ? `<div class="help" style="color:var(--faint);font-size:12px;margin-bottom:12px">★ = typische Fertigkeit eines ${SR.SPIRITS[allyType()].de}s</div>` : '<div style="margin-bottom:12px"></div>'}
      <div class="row-add">
        <div class="field"><label>Eigene Fertigkeit</label><input type="text" id="customSkill" placeholder="z. B. Wissensfertigkeit: Thaumaturgische Geschichte"></div>
        <button class="btn" id="addCustomSkill">Hinzufügen</button>
      </div>
      <div style="margin-top:14px">
      ${state.skills.length ? `<table><thead><tr><th>Fertigkeit</th><th class="num">Stufe</th><th class="num">Karma</th><th></th></tr></thead><tbody>${list}</tbody></table>` : '<div class="empty">Noch keine zusätzlichen Fertigkeiten.</div>'}
      </div>
      <div class="note info">Ausgeschlossen: ${SR.FORBIDDEN_SKILLS.join(', ')} (Beschwörungsgruppe). Verbündete können nicht initiieren.</div>
      ${notesFor('skills')}
    </div>`;
  };

  views.spells = () => {
    const rows = state.spells.map((s, i) => `
      <tr>
        <td><input type="text" data-spell="${i}" data-sf="name" value="${esc(s.name)}"></td>
        <td style="width:170px"><select data-spell="${i}" data-sf="cat">${SR.SPELL_CATEGORIES.map(c => `<option ${s.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
        <td style="width:190px"><label class="check"><input type="checkbox" data-spell="${i}" data-sf="known" ${s.known ? 'checked' : ''}><span class="box"></span>Beschwörer kennt ihn</label></td>
        <td class="num" style="width:70px">${s.known ? SR.COST.spellKnown : SR.COST.spellUnknown}</td>
        <td style="width:44px"><button class="btn icon danger" data-delspell="${i}" title="Entfernen">✕</button></td>
      </tr>`).join('');
    return head('Schritt 6', 'Zauber', `Ein Verbündeter kann jeden Zauber lernen, den der Beschwörer kennt (${SR.COST.spellKnown} Karma), oder auch unbekannte Zauber (${SR.COST.spellUnknown} Karma) – Zauberformeln sind trotzdem nötig.`) + `
    <div class="card">
      <h2>Neuer Zauber</h2>
      <p class="sub">Beim Unterstützen von Spruchzauberei und Lernhilfe zählt ein Verbündeter für jede Zauberkategorie als passend.</p>
      <div class="row-add">
        <div class="field"><label>Zaubername</label><input type="text" id="spellName" placeholder="z. B. Manablitz"></div>
        <div class="field" style="max-width:180px"><label>Kategorie</label><select id="spellCat">${SR.SPELL_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div>
        <label class="check" style="padding-bottom:9px"><input type="checkbox" id="spellKnown" checked><span class="box"></span>Beschwörer kennt ihn</label>
        <button class="btn primary" id="addSpell">Hinzufügen</button>
      </div>
      ${(SR.TRADITIONS[state.mage.tradition].spells || []).length ? `<div style="margin-top:14px"><div class="help" style="color:var(--faint);font-size:12px;margin-bottom:6px">Bevorzugte Zauber der Tradition (${SR.TRADITIONS[state.mage.tradition].de}) – Kategorie und „Beschwörer kennt ihn“ danach in der Tabelle anpassen:</div><div class="sugg">${SR.TRADITIONS[state.mage.tradition].spells.map(n => `<button data-sugspell="${esc(n)}" ${state.spells.some(x => x.name === n) ? 'disabled' : ''}>+ ${esc(n)}</button>`).join('')}</div></div>` : ''}
    </div>
    <div class="card">
      <div class="card-head"><h2>Zauber des Verbündeten</h2><span class="tag">${state.spells.length} Zauber</span></div>
      ${state.spells.length ? `<table><thead><tr><th>Name</th><th>Kategorie</th><th>Bekannt</th><th class="num">Karma</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Noch keine Zauber.</div>'}
      ${notesFor('spells')}
    </div>`;
  };

  function statBlock() {
    const f = F(), m = state.mage, d = mods();
    const A = (v) => Math.max(1, f + v);
    const kon = A(d.K);
    return {
      attrs: [['KON', kon], ['GES', A(d.G)], ['REA', A(d.R)], ['STR', A(d.S)], ['WIL', A(d.W)], ['LOG', A(d.L)], ['INT', A(d.I)], ['CHA', A(d.C)], ['EDG', m.edge], ['MAG', f], ['ESS', f]],
      iniPhys: `${2 * f + d.ini} + 2W6`, iniAstral: `${2 * f} + 3W6`,
      limits: `Kraft (${f}) für alle Proben des Geistes`,
      monitor: 8 + Math.ceil(kon / 2),
      armor: state.form.type === 'materialization' ? 'Immunität gegen Normale Waffen (Materialisierung)' : '—',
      extra: [SR.SPIRITS[allyType()].special, SR.SPIRITS[allyType()].weakness && 'Schwäche: ' + SR.SPIRITS[allyType()].weakness].filter(Boolean).join(' · ')
    };
  }

  const filledForms = () => state.form.extraForms.filter(x => String(x).trim());

  function powerListText() {
    return state.powers.map(p => {
      const d = SR.POWERS[p.id]; return d.de + (p.detail ? ` (${p.detail})` : '');
    });
  }

  views.summary = () => {
    const f = F(), m = state.mage, sb = statBlock(), c = calc();
    const physical = f > m.magie;
    const summon = m.magie + m.herbeirufen, bind = m.magie + m.binden, drain = m.drainA + m.drainB, formula = m.arkana + m.logik;
    const allIssues = issues();
    const errs = allIssues.filter(i => i.level === 'err'), warns = allIssues.filter(i => i.level === 'warn');
    const tests = [
      { t: 'Formel entwickeln', f: `Arkana + Logik [Geistig ${m.geistLimit}] · Ausgedehnte Probe, Schwellenwert ${f * 5}, Intervall 1 Tag`, p: formula, e: `≈ ${exp(formula)} Erfolge/Tag → ca. ${Math.ceil((f * 5) / Math.max(0.1, formula / 3))} Tage` },
      { t: 'Herbeirufen', f: `Magie + Herbeirufen [Kraft ${f}] gegen Kraft ${f}`, p: summon, e: `≈ ${exp(summon)} gegen ≈ ${exp(f)}` },
      { t: 'Binden', f: `Magie + Binden [Kraft ${f}] gegen Kraft × 2 (${f * 2})`, p: bind, e: `≈ ${exp(bind)} gegen ≈ ${exp(f * 2)}` },
      { t: 'Entzug (je Probe)', f: `${esc(m.drainLabel)} · Entzugswert = 2 × Erfolge des Geistes (min. 2), ${physical ? '<b style="color:var(--warn)">körperlich</b>' : 'geistig'}`, p: drain, e: `erwarteter Entzug ≈ ${Math.max(2, Math.round((2 * f) / 3))} / ${Math.max(2, Math.round((4 * f) / 3))}` },
      { t: 'Losreißen (falls er sich ungerecht behandelt fühlt)', f: `Geist: Kraft × 2 [Kraft] gegen Binden + Magie [Geistig]`, p: `${f * 2} : ${bind}`, e: 'jeder Nettoerfolg des Geistes befreit ihn' }
    ];
    if (state.form.type === 'inhabitation') tests.splice(3, 0, { t: 'Bewohnung', f: `Kraft × 2 gegen Willenskraft + Intuition des Gefäßes (unbelebt: Objektwiderstand) · dauert ${f} Tage · Magisches Refugium mit Kraft ≥ ${f} · Binden des Beschwörers als Bonus auf eine Seite`, p: `${f * 2}`, e: 'Ergebnis: Wahre Gestalt / Mischgestalt / Fleischgestalt' });
    if (state.form.type === 'possession') tests.splice(3, 0, { t: 'Besessenheit (je Einsatz)', f: 'Kraft × 2 gegen Intuition + Willenskraft des Gefäßes (unbelebt: Objektwiderstand) · vorbereitetes Gefäß +6 Würfel', p: `${f * 2}`, e: 'Fehlschlag: zurück in den Astralraum' });

    const nextF = Math.min(f + 1, maxForce());
    return head('Schritt 7', 'Übersicht & Ritual', 'Der fertige Werteblock, alle Proben des Rituals und der Voraussetzungs-Check auf einen Blick.') + `
    <div class="card">
      <div class="card-head">
        <div><h2 style="font-size:18px">${esc(state.ally.name || 'Unbenannter Verbündeter')}</h2>
        <p class="sub">Verbündetengeist (${SR.SPIRITS[allyType()].de}) · Kraft ${f} · ${SR.FORMS[state.form.type].de}${state.ally.ebene ? ' · Heimat: ' + esc(state.ally.ebene) : ''}${m.name ? ' · Meister: ' + esc(m.name) : ''}</p></div>
        <span class="tag" style="font-size:12px">${c.total} Karma</span>
      </div>
      <div class="stat-row">${sb.attrs.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
      <div class="kv" style="margin-top:14px">
        <div class="k">Initiative</div><div>${sb.iniPhys} (körperlich) · ${sb.iniAstral} (astral)</div>
        <div class="k">Limits</div><div>${sb.limits}</div>
        <div class="k">Zustandsmonitor</div><div>${sb.monitor} Kästchen</div>
        <div class="k">Panzerung</div><div>${sb.armor}</div>
        ${sb.extra ? `<div class="k">Besonderheiten</div><div>${esc(sb.extra)}</div>` : ''}
        <div class="k">Loyalität</div><div>6 · unbegrenzte Dienste · zählt nicht als gebundener Geist</div>
        <div class="k">Fertigkeiten</div><div>${[...SR.BASE_SKILLS, ...state.skills.map(s => s.name)].map(s => `${esc(s)} ${f}`).join(', ')}</div>
        <div class="k">Kräfte</div><div>${[...SR.BASE_POWERS.map(p => p.de), SR.FORMS[state.form.type].de, ...powerListText()].map(esc).join(', ')}</div>
        <div class="k">Zauber</div><div>${state.spells.length ? state.spells.map(s => esc(s.name || '(ohne Namen)')).join(', ') : '—'}</div>
        ${state.form.type === 'materialization' ? `<div class="k">Gestalten</div><div>${esc(state.form.baseForm || 'Grundgestalt')}${filledForms().length ? '; ' + filledForms().map(esc).join('; ') : ''}</div>` : `<div class="k">Gefäß</div><div>${esc(state.form.vessel || '—')}</div>`}
      </div>
    </div>

    <div class="card">
      <h2>Proben des Rituals</h2>
      <p class="sub">Herbeirufen und Binden folgen den normalen Regeln (GRW), der Entzug wird wie für einen Geist der Kraft ${f} berechnet. Das Karma wird erst bezahlt, wenn das Binden gelingt.</p>
      ${tests.map(t => `<div class="test"><div class="t">${t.t}</div><div class="p">${t.p}</div><div class="f">${t.f}</div><div class="e">${t.e}</div></div>`).join('')}
    </div>

    <div class="card">
      <h2>Voraussetzungen</h2>
      <p class="sub">Formel · magische Loge mit Kraft ≥ ${f} · übliche Bindungsreagenzien · Karma.</p>
      ${errs.length + warns.length === 0 ? '<div class="note ok">Alle Voraussetzungen erfüllt – der Verbündete kann beschworen werden.</div>' : ''}
      ${[...errs, ...warns].map(i => `<div class="note ${i.level}">${esc(i.text)}</div>`).join('')}
    </div>

    <div class="card">
      <h2>Ausblick: Ritual der Wandlung</h2>
      <p class="sub">Neue Gestalten, Kräfte, Fertigkeiten oder Zauber kosten später dasselbe wie jetzt – nur die Kraft wird teurer (${SR.COST.changeForce} statt ${SR.COST.perForce} Karma je Punkt). Die Formel muss erneut angepasst werden (Arkana + Logik [Geistig], Kraft × 5, 1 Tag).</p>
      <div class="row-add">
        <div class="field" style="max-width:200px"><label>Zielkraft</label><input type="number" id="changeTarget" min="${f}" max="${Math.max(f, 30)}" value="${nextF}"></div>
        <div class="field"><label>Kosten der Krafterhöhung</label><div id="changeCost" style="font-size:18px;font-weight:650;padding:6px 0">${(nextF - f) * SR.COST.changeForce} Karma</div></div>
      </div>
      <div class="note warn">Während eines Rituals der Wandlung kann sich ein Verbündeter, der sich ungerecht behandelt fühlt, losreißen. Dann scheitert das Ritual und der Magier widersteht Entzug in Höhe der doppelten Erfolge des Geistes.</div>
    </div>`;
  };

  // ---------------- Seitenleiste ----------------
  function renderSummary() {
    const c = calc(), m = state.mage, f = F(), sb = statBlock();
    const rest = m.karma - c.total;
    const pct = m.karma > 0 ? Math.min(100, (c.total / m.karma) * 100) : 100;
    const all = issues().filter(i => i.level === 'err' || i.level === 'warn');
    $('#summary').innerHTML = `
      <div class="sum-title">Karmakosten</div>
      <div class="karma-box">
        <div class="karma-total"><span class="n">${c.total}</span><span class="u">Karma</span></div>
        <div class="karma-budget"><span>Budget ${m.karma}</span><span style="color:${rest < 0 ? 'var(--err)' : 'var(--teal)'}">${rest < 0 ? 'fehlen ' + (-rest) : 'übrig ' + rest}</span></div>
        <div class="meter ${rest < 0 ? 'over' : ''}"><div style="width:${pct}%"></div></div>
        <div class="karma-lines">${c.lines.map(l => `<div class="kl ${l.value ? '' : 'zero'}"><span class="l">${l.label}</span><span class="r">${l.value}</span></div>`).join('')}</div>
      </div>
      <div class="sum-title">Verbündeter</div>
      <div class="mini">
        <div class="mini-name">${esc(state.ally.name || 'Unbenannt')}</div>
        <div class="mini-meta">${SR.SPIRITS[allyType()].de} · Kraft ${f} · ${SR.FORMS[state.form.type].de}</div>
        <div class="mini-stats">
          <div><div class="k">KRAFT</div><div class="v">${f}</div></div>
          <div><div class="k">EDGE</div><div class="v">${m.edge}</div></div>
          <div><div class="k">INI</div><div class="v">${sb.iniPhys.replace(' + ', '+').replace('2W6', '2W')}</div></div>
          <div><div class="k">ZM</div><div class="v">${sb.monitor}</div></div>
          <div><div class="k">KRÄFTE</div><div class="v">${SR.BASE_POWERS.length + 1 + state.powers.length}</div></div>
          <div><div class="k">FERT.</div><div class="v">${SR.BASE_SKILLS.length + state.skills.length}</div></div>
          <div><div class="k">ZAUBER</div><div class="v">${state.spells.length}</div></div>
          <div><div class="k">LIMIT</div><div class="v">${f}</div></div>
        </div>
      </div>
      <div class="sum-title">Hinweise ${all.length ? `(${all.length})` : ''}</div>
      <div class="issues">${all.length ? all.map(i => `<div class="note ${i.level}">${esc(i.text)}</div>`).join('') : '<div class="note ok">Keine Probleme gefunden.</div>'}</div>`;
  }

  // ---------------- Render ----------------
  function render() {
    renderSteps();
    $('#view').innerHTML = views[state.step]();
    renderSummary();
  }
  function refreshSide() {
    renderSteps(); renderSummary();
    document.querySelectorAll('[data-notes]').forEach(el => { el.innerHTML = notesInner(el.dataset.notes); });
    persist();
  }
  function rerender(keepScroll = true) {
    const v = $('#view'); const y = v.scrollTop;
    render(); if (keepScroll) v.scrollTop = y; persist();
  }

  // ---------------- Ereignisse ----------------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-form]');
    if (!t) return;
    if (t.dataset.step) { state.step = t.dataset.step; $('#view').scrollTop = 0; rerender(false); return; }
    if (t.dataset.form) { state.form.type = t.dataset.form; rerender(); return; }
    if (t.id === 'addForm') { state.form.extraForms.push(''); rerender(); return; }
    if (t.dataset.delform != null) { state.form.extraForms.splice(num(t.dataset.delform), 1); rerender(); return; }
    if (t.dataset.addskill) { addSkill(t.dataset.addskill); return; }
    if (t.id === 'addCustomSkill') { addSkill($('#customSkill').value); return; }
    if (t.dataset.delskill != null) { state.skills.splice(num(t.dataset.delskill), 1); rerender(); return; }
    if (t.id === 'addSpell') { addSpell(); return; }
    if (t.dataset.sugspell) { $('#spellName').value = t.dataset.sugspell; addSpell(); return; }
    if (t.dataset.delspell != null) { state.spells.splice(num(t.dataset.delspell), 1); rerender(); return; }
    if (t.id === 'btnNew') { if (confirmReset()) { state = defaultState(); rerender(false); toast('Neuer Verbündeter angelegt'); } return; }
    if (t.id === 'btnSave') { saveFile(); return; }
    if (t.id === 'btnLoad') { $('#fileInput').click(); return; }
    if (t.id === 'btnCopy') { copyText(); return; }
    if (t.id === 'btnPrint') { printSheet(); return; }
  });

  // Neu: Zweistufige Bestätigung ohne Browser-Dialog
  function confirmReset() {
    const b = $('#btnNew');
    if (b.dataset.armed) { delete b.dataset.armed; b.textContent = 'Neu'; return true; }
    b.dataset.armed = '1'; b.textContent = 'Wirklich neu?';
    setTimeout(() => { delete b.dataset.armed; b.textContent = 'Neu'; }, 3000);
    return false;
  }

  function addSkill(name) {
    name = String(name || '').trim();
    if (!name) return;
    if (SR.FORBIDDEN_SKILLS.some(f => f.toLowerCase() === name.toLowerCase())) { toast(`„${name}“ ist für Verbündete nicht erlaubt`); return; }
    if (SR.BASE_SKILLS.some(f => f.toLowerCase() === name.toLowerCase())) { toast(`„${name}“ ist bereits eine Basisfertigkeit`); return; }
    if (hasSkill(name)) { toast('Fertigkeit bereits vorhanden'); return; }
    state.skills.push({ name }); rerender();
  }

  function addSpell() {
    const name = $('#spellName').value.trim();
    if (!name) { toast('Bitte einen Zaubernamen eingeben'); return; }
    state.spells.push({ name, cat: $('#spellCat').value, known: $('#spellKnown').checked });
    rerender();
    const n = $('#spellName'); if (n) n.focus();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'spellName') addSpell();
    if (e.target.id === 'customSkill') addSkill(e.target.value);
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.path) {
      if (t.type === 'checkbox') return;
      let v = t.value;
      if (t.dataset.num) { v = num(v, 0); const mn = num(t.min, 0), mx = num(t.max, 999); v = Math.max(mn, Math.min(mx, v)); }
      setPath(t.dataset.path, v);
      if (t.dataset.path === 'mage.magie') {
        if (state.ally.force > maxForce()) state.ally.force = maxForce();
      }
      refreshSide();
      return;
    }
    if (t.id === 'forceRange') {
      // Während des Ziehens nur Zahl & Seitenleiste aktualisieren (Regler nicht ersetzen)
      state.ally.force = num(t.value, 1);
      $('#forceNum').textContent = state.ally.force;
      refreshSide();
      return;
    }
    if (t.dataset.extraform != null) { state.form.extraForms[num(t.dataset.extraform)] = t.value; refreshSide(); return; }
    if (t.dataset.pdetail && t.tagName === 'INPUT') {
      const p = state.powers.find(x => x.id === t.dataset.pdetail); if (p) p.detail = t.value; refreshSide(); return;
    }
    if (t.dataset.spell != null && t.dataset.sf === 'name') { state.spells[num(t.dataset.spell)].name = t.value; refreshSide(); return; }
    if (t.id === 'changeTarget') {
      const v = Math.max(F(), num(t.value, F()));
      $('#changeCost').textContent = `${(v - F()) * SR.COST.changeForce} Karma`;
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.path && t.type === 'checkbox') { setPath(t.dataset.path, t.checked); rerender(); return; }
    if (t.dataset.path && t.dataset.num) { t.value = getPath(t.dataset.path); return; } // angezeigten Wert normalisieren
    if (t.dataset.path) return;
    if (t.id === 'forceRange') { rerender(); return; }
    if (t.id === 'allyType') { state.ally.type = t.value; rerender(); return; }
    if (t.id === 'tradSelect') {
      const tr = SR.TRADITIONS[t.value];
      state.mage.tradition = t.value;
      state.mage.spirits = Object.assign({}, tr.spirits);
      state.mage.drainLabel = tr.drain;
      rerender(); return;
    }
    if (t.dataset.spirit) { state.mage.spirits[t.dataset.spirit] = t.value; rerender(); return; }
    if (t.dataset.power) {
      const id = t.dataset.power;
      if (t.checked) state.powers.push({ id, detail: '' });
      else state.powers = state.powers.filter(p => p.id !== id);
      rerender(); return;
    }
    if (t.dataset.pdetail && t.tagName === 'SELECT') {
      const p = state.powers.find(x => x.id === t.dataset.pdetail); if (p) p.detail = t.value; rerender(); return;
    }
    if (t.dataset.spell != null && t.dataset.sf === 'cat') { state.spells[num(t.dataset.spell)].cat = t.value; persist(); return; }
    if (t.dataset.spell != null && t.dataset.sf === 'known') { state.spells[num(t.dataset.spell)].known = t.checked; rerender(); return; }
    if (t.id === 'fileInput') { loadFile(t.files[0]); t.value = ''; }
  });

  // ---------------- Datei & Export ----------------
  function fileName(ext) {
    const base = (state.ally.name || 'verbuendeter').toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-').replace(/^-|-$/g, '');
    return `${base || 'verbuendeter'}.${ext}`;
  }
  function saveFile() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fileName('json');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Gespeichert');
  }
  function loadFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || data.version !== 1 || !data.ally) throw new Error('Format');
        state = migrate(merge(defaultState(), data));
        rerender(false); toast(`„${state.ally.name || 'Verbündeter'}“ geladen`);
      } catch (e) { toast('Datei konnte nicht gelesen werden'); }
    };
    r.readAsText(file);
  }

  function exportText() {
    const f = F(), m = state.mage, sb = statBlock(), c = calc();
    const L = [];
    L.push(`${state.ally.name || 'Unbenannter Verbündeter'} – Verbündetengeist, ${SR.SPIRITS[allyType()].de} (Kraft ${f})`);
    L.push(`Meister: ${m.name || '—'} · Tradition: ${SR.TRADITIONS[m.tradition].de} · Heimat: ${state.ally.ebene || '—'}`);
    if (state.ally.konzept) L.push(`Konzept: ${state.ally.konzept}`);
    L.push('');
    L.push(sb.attrs.map(([k]) => k.padEnd(4)).join(''));
    L.push(sb.attrs.map(([, v]) => String(v).padEnd(4)).join(''));
    L.push('');
    L.push(`Initiative: ${sb.iniPhys} (körperlich), ${sb.iniAstral} (astral)`);
    L.push(`Limits: ${sb.limits}`);
    L.push(`Zustandsmonitor: ${sb.monitor}`);
    L.push(`Panzerung: ${sb.armor}`);
    if (sb.extra) L.push(`Besonderheiten: ${sb.extra}`);
    L.push(`Gestalt: ${SR.FORMS[state.form.type].de}` + (state.form.type === 'materialization' ? ` – ${state.form.baseForm || 'Grundgestalt'}${filledForms().length ? '; weitere: ' + filledForms().join('; ') : ''}` : ` – Gefäß: ${state.form.vessel || '—'}`));
    L.push(`Fertigkeiten: ${[...SR.BASE_SKILLS, ...state.skills.map(s => s.name)].map(s => `${s} ${f}`).join(', ')}`);
    L.push(`Kräfte: ${[...SR.BASE_POWERS.map(p => p.de), SR.FORMS[state.form.type].de, ...powerListText()].join(', ')}`);
    L.push(`Zauber: ${state.spells.length ? state.spells.map(s => `${s.name} (${s.cat})`).join(', ') : '—'}`);
    L.push('Loyalität 6 · unbegrenzte Dienste · Edge = Edge des Meisters');
    L.push('');
    L.push(`Karmakosten: ${c.total}`);
    c.lines.forEach(l => L.push(`  ${l.label}: ${l.value}`));
    if (state.ally.notizen) { L.push(''); L.push('Notizen:'); L.push(state.ally.notizen); }
    return L.join('\n');
  }
  async function copyText() {
    const txt = exportText();
    try { await navigator.clipboard.writeText(txt); toast('Werteblock in die Zwischenablage kopiert'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Werteblock kopiert'); } catch (_) { toast('Kopieren nicht möglich'); }
      ta.remove();
    }
  }

  function printSheet() {
    const f = F(), m = state.mage, sb = statBlock(), c = calc();
    $('#printArea').innerHTML = `
      <h1>${esc(state.ally.name || 'Unbenannter Verbündeter')}</h1>
      <div class="meta">Verbündetengeist (${SR.SPIRITS[allyType()].de}) · Kraft ${f} · ${SR.FORMS[state.form.type].de} · Meister: ${esc(m.name || '—')} · ${SR.TRADITIONS[m.tradition].de} · Heimat: ${esc(state.ally.ebene || '—')}</div>
      <table><tr>${sb.attrs.map(([k]) => `<th>${k}</th>`).join('')}</tr><tr>${sb.attrs.map(([, v]) => `<td>${v}</td>`).join('')}</tr></table>
      <h2>Werte</h2>
      <div>Initiative: ${sb.iniPhys} (körperlich), ${sb.iniAstral} (astral)<br>Limits: ${sb.limits}<br>Zustandsmonitor: ${sb.monitor} · Panzerung: ${esc(sb.armor)}${sb.extra ? '<br>Besonderheiten: ' + esc(sb.extra) : ''}<br>Loyalität 6 · unbegrenzte Dienste</div>
      <div class="two">
        <div><h2>Kräfte</h2><ul class="list">${[...SR.BASE_POWERS.map(p => p.de), SR.FORMS[state.form.type].de, ...powerListText()].map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
        <div><h2>Fertigkeiten (Stufe ${f})</h2><ul class="list">${[...SR.BASE_SKILLS, ...state.skills.map(s => s.name)].map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        <h2>Zauber</h2>${state.spells.length ? `<ul class="list">${state.spells.map(s => `<li>${esc(s.name)} (${s.cat})</li>`).join('')}</ul>` : '—'}</div>
      </div>
      <h2>Gestalt</h2><div>${state.form.type === 'materialization' ? esc(state.form.baseForm || 'Grundgestalt') + (filledForms().length ? '<br>Weitere: ' + filledForms().map(esc).join('; ') : '') : 'Gefäß: ' + esc(state.form.vessel || '—')}</div>
      <h2>Karmakosten: ${c.total}</h2><div>${c.lines.filter(l => l.value).map(l => `${esc(l.label)}: ${l.value}`).join('<br>')}</div>
      ${state.ally.notizen ? `<h2>Notizen</h2><div style="white-space:pre-wrap">${esc(state.ally.notizen)}</div>` : ''}`;
    window.print();
  }

  // Start
  render();
})();
