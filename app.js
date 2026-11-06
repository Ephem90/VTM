(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
const KEY = 'vtm-config-v1', LANG_KEY = 'vtm-lang', CUSTOM_LANGS_KEY = 'vtm-custom-langs';
const FIXED = [{id:'force'},{id:'vitesse'},{id:'agilite'}];   // names come from the "criterion.<id>" resources
const ROLES = ['Setter','Hitter','Middle','Tech'];              // labels come from "role.<role>"
const LEGACY_ROLES = {Passeur:'Setter', Attaquant:'Hitter', Milieu:'Middle'}; // old French values in saved/imported data
const normRole = r => LEGACY_ROLES[r] || r;
// 6 slots: front-left, front-center, front-right, back-left, back-center, back-right
const SLOT_ROLES = ['Hitter','Middle','Setter','Hitter','Tech','Middle'];
const SLOT_ORDER = [0,2,4,1,3,5];                 // fill order when a team has fewer than 6 players
const SLOT_POS = [[20,40],[50,40],[80,40],[20,16],[50,16],[80,16]]; // top team (% x,y)

let cfg = null, selected = null, tab = 'courts', prevTab = 'courts', tr = null;

/* ---------- Languages ---------- */
let customLangs = {};
try { customLangs = JSON.parse(localStorage.getItem(CUSTOM_LANGS_KEY)) || {}; } catch (e) { customLangs = {}; }
// customLangs holds added languages AND user edits ("overrides") of the built-in ones.
// Icons are NOT part of the translated texts: they are always shown by the UI, next to the text.
// [icon, position] per key. Any icon found inside a stored value (old data) is stripped by dictOf().
const ICONS = {
  'btn.random': ['🎲'], 'strength.desc': ['↓', 'after'], 'strength.asc': ['↑', 'after'],
  'edit.photo': ['📷'], 'settings.export': ['⬇'], 'settings.import': ['⬆'],
  'welcome.title': ['🏐', 'after'], 'welcome.import': ['⬆'], 'welcome.create': ['✚'], 'lang.add': ['＋']
};
const stripIcon = (key, s) => ICONS[key] ? s.split(ICONS[key][0]).join('').replace(/️/g, '').replace(/\s+/g, ' ').trim() : s;
const dictOf = code => {
  const d = {...(VTM_RESOURCES[code] || {}), ...((customLangs[code] && customLangs[code].strings) || {})};
  for (const k in ICONS) if (d[k]) d[k] = stripIcon(k, d[k]);
  return d;
};
const iconHTML = (key, pos) => ICONS[key] && (ICONS[key][1] || 'before') === pos ? `<span class="ic">${ICONS[key][0]}</span>` : '';
const langName = code => (VTM_RESOURCES[code] && VTM_RESOURCES[code]._name) || (customLangs[code] && customLangs[code].name) || code.toUpperCase();
const langCodes = () => [...new Set([...Object.keys(VTM_RESOURCES), ...Object.keys(customLangs)])];
function initialLang() {
  try { const s = localStorage.getItem(LANG_KEY); if (s && langCodes().includes(s)) return s; } catch (e) {}
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return langCodes().includes(nav) ? nav : 'en';
}
let lang = initialLang();
function t(key, vars) {
  let s = dictOf(lang)[key] || dictOf('en')[key] || key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
  return s;
}
const critName = c => c.fixed ? t('criterion.' + c.id) : c.name;
// HTML label = text with its icon (always displayed, whatever the language)
const lbl = (key, vars) => [iconHTML(key, 'before'), esc(t(key, vars)), iconHTML(key, 'after')].filter(Boolean).join(' ');
function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(e => e.innerHTML = lbl(e.dataset.i18n));
  document.querySelectorAll('[data-i18n-title]').forEach(e => e.title = t(e.dataset.i18nTitle));
}
function setLang(code) {
  lang = code;
  try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
  if (!cfg && !$('#modal').hidden) welcome();
  render();
}

/* ---------- Data ---------- */
const emptyTeam = () => Array(6).fill(null);
const newCourt = () => ({a: emptyTeam(), b: emptyTeam()});
const newConfig = () => ({courts:[newCourt()], criteria:FIXED.map(c => ({...c, fixed:true})), players:[], teamSize:6, sortDir:'desc', lastBench:[]});
const stat = (p, id) => (p.stats && p.stats[id] != null) ? p.stats[id] : 5;
const score = p => cfg.criteria.reduce((s, c) => s + stat(p, c.id), 0) / (cfg.criteria.length || 1);
const byId = id => cfg.players.find(p => p.id === id);

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); }
  catch (e) { toast(t('toast.storageFull')); }
}
function load() {
  try { const s = localStorage.getItem(KEY); if (s) cfg = JSON.parse(s); } catch (e) { cfg = null; }
  if (cfg) {
    cfg.criteria = (cfg.criteria || newConfig().criteria).map(c => FIXED.some(f => f.id === c.id) ? {id: c.id, fixed: true} : c);
    cfg.lastBench = cfg.lastBench || [];
    cfg.players.forEach(p => p.positions = (p.positions || []).map(normRole));
  }
}
function purge() {
  const ok = new Set(cfg.players.filter(p => p.active).map(p => p.id));
  const seen = new Set();
  cfg.courts.forEach(c => ['a','b'].forEach(s => c[s] = c[s].map(id => {
    if (id && ok.has(id) && !seen.has(id)) { seen.add(id); return id; } return null; })));
  cfg.lastBench = cfg.lastBench.filter(id => ok.has(id));
}
const placedIds = () => new Set(cfg.courts.flatMap(c => [...c.a, ...c.b]).filter(Boolean));

/* ---------- UI helpers ---------- */
let toastT;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2800);
}
function openModal(html, locked) {
  const m = $('#modal'); m.innerHTML = `<div class="modal">${html}</div>`; m.hidden = false;
  m.onclick = locked ? null : e => { if (e.target === m) closeModal(); };
  return m;
}
const closeModal = () => { $('#modal').hidden = true; $('#modal').innerHTML = ''; };

function colorFor(v) {
  const a = [210,80,55], b = [110,50,72], c = [135,65,28];
  let f, from, to;
  if (v <= 5) { from = a; to = b; f = v / 5; } else { from = b; to = c; f = (v - 5) / 5; }
  const x = from.map((n, i) => Math.round(n + (to[i] - n) * f));
  return `hsl(${x[0]},${x[1]}%,${x[2]}%)`;
}
function avatar(p) {
  if (p.photo) return p.photo;
  const name = p.name || '?';
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(${h},45%,55%)"/><text x="50" y="62" font-size="40" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${esc(ini)}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function resizeImage(file, size = 192) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height), cv = document.createElement('canvas');
      cv.width = cv.height = size;
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = rej; img.src = url;
  });
}

/* ---------- Team generation ---------- */
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const varOf = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length; };

function cost(teams) {
  const means = f => teams.map(tm => tm.reduce((s, p) => s + f(p), 0) / tm.length);
  let c = 0;
  for (const cr of cfg.criteria) c += varOf(means(p => stat(p, cr.id)));
  c += 2 * varOf(means(score));
  for (const r of ROLES) c += 0.6 * varOf(means(p => p.positions.includes(r) ? 1 / p.positions.length : 0));
  return c;
}
function balance(teams) {
  let cur = cost(teams);
  for (let it = 0; it < 4000 && cur > 1e-9; it++) {
    const i = Math.floor(Math.random() * teams.length), j = Math.floor(Math.random() * teams.length);
    if (i === j) continue;
    const x = Math.floor(Math.random() * teams[i].length), y = Math.floor(Math.random() * teams[j].length);
    [teams[i][x], teams[j][y]] = [teams[j][y], teams[i][x]];
    const c = cost(teams);
    if (c <= cur) cur = c; else [teams[i][x], teams[j][y]] = [teams[j][y], teams[i][x]];
  }
  return teams;
}
function placeTeam(ps) {
  const slots = SLOT_ORDER.slice(0, ps.length), used = [], cur = [];
  let best = null, bc = 1e9;
  (function rec(i, c) {
    if (c >= bc) return;
    if (i === ps.length) { bc = c; best = cur.slice(); return; }
    for (let k = 0; k < ps.length; k++) {
      if (used[k]) continue;
      const p = ps[k], mis = (p.positions.length && !p.positions.includes(SLOT_ROLES[slots[i]])) ? 1 : 0;
      used[k] = 1; cur[i] = k; rec(i + 1, c + mis); used[k] = 0;
    }
  })(0, 0);
  const out = emptyTeam();
  best.forEach((k, i) => out[slots[i]] = ps[k].id);
  return out;
}
function generate(mode) {
  if (!cfg.courts.length) return toast(t('toast.addCourt'));
  const act = cfg.players.filter(p => p.active);
  if (act.length < 2) return toast(t('toast.needPlayers'));
  const size = cfg.teamSize;
  let n2 = Math.min(cfg.courts.length * 2, Math.floor(act.length / size)); n2 -= n2 % 2; if (n2 < 2) n2 = 2;
  const n = Math.min(act.length, n2 * size);
  const lb = new Set(cfg.lastBench);
  const pool = shuffle(act).sort((a, b) => Number(lb.has(b.id)) - Number(lb.has(a.id))); // last round's bench plays first
  const used = pool.slice(0, n), rest = pool.slice(n);
  const base = Math.floor(n / n2), extra = n % n2;
  const sizes = Array.from({length: n2}, (_, i) => base + (i < extra ? 1 : 0));
  const chunk = list => { let k = 0; return sizes.map(s => { const r = list.slice(k, k + s); k += s; return r; }); };
  let teams;
  if (mode === 'random') teams = shuffle(balance(chunk(shuffle(used))));
  else {
    const sorted = used.map(p => [score(p) + Math.random() * 0.001, p]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    if (cfg.sortDir === 'asc') sorted.reverse();
    teams = chunk(sorted);
  }
  cfg.courts = cfg.courts.map(() => newCourt());
  for (let i = 0; i < n2 / 2; i++) {
    cfg.courts[i].a = placeTeam(teams[2 * i]);
    cfg.courts[i].b = placeTeam(teams[2 * i + 1]);
  }
  cfg.lastBench = rest.map(p => p.id);
  selected = null; save(); render();
  toast(rest.length ? t('toast.unplaced', {n: rest.length}) : t('toast.generated'));
}

/* ---------- Rendering ---------- */
function render() {
  applyStatic();
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#tab-courts').hidden = tab !== 'courts';
  $('#tab-players').hidden = tab !== 'players';
  $('#tab-translate').hidden = tab !== 'translate';
  $('#btn-add').hidden = tab !== 'players';
  if (tab === 'translate') return renderTranslate();
  if (!cfg) return;
  purge();
  if (tab === 'courts') renderCourts(); else renderPlayers();
}

const COURT_SVG = `<svg viewBox="0 0 100 180" preserveAspectRatio="none">
<rect width="100" height="180" fill="#d65f12"/>
<rect x="6" y="7" width="88" height="166" fill="#e8701f" stroke="#fff" stroke-width="1.2"/>
<line x1="6" y1="90" x2="94" y2="90" stroke="#fff" stroke-width="2.2"/>
<line x1="6" y1="58" x2="94" y2="58" stroke="#fff" stroke-width="1.2"/>
<line x1="6" y1="122" x2="94" y2="122" stroke="#fff" stroke-width="1.2"/></svg>`;

function teamAvg(ids) {
  const ps = ids.filter(Boolean).map(byId).filter(Boolean);
  return ps.length ? (ps.reduce((s, p) => s + score(p), 0) / ps.length).toFixed(1) : '–';
}
function courtHTML(c, i) {
  const toks = side => c[side].map((id, s) => {
    const [x, y0] = SLOT_POS[s], y = side === 'a' ? y0 : 100 - y0;
    const attr = `data-k="slot" data-c="${i}" data-t="${side}" data-s="${s}" style="left:${x}%;top:${y}%"`;
    const p = id && byId(id);
    if (!p) return selected ? `<button class="tok empty" ${attr}><div class="ph"></div></button>` : '';
    const sel = selected && selected.k === 'slot' && selected.c === i && selected.t === side && selected.s === s;
    return `<button class="tok ${sel ? 'sel' : ''}" ${attr}><img src="${avatar(p)}" alt=""><span>${esc(p.name)}</span></button>`;
  }).join('');
  const badge = side => `${t('team.' + side)} · ⌀ ${teamAvg(c[side])}`;
  return `<div class="court-wrap"><div class="court-title">${t('court.title', {i: i + 1, n: cfg.courts.length})}</div>
    <div class="court">${COURT_SVG}
    <div class="badge a">${esc(badge('a'))}</div>${toks('a')}${toks('b')}
    <div class="badge b">${esc(badge('b'))}</div></div></div>`;
}
function renderCourts() {
  const n = cfg.courts.length;
  $('#court-count').textContent = t(n > 1 ? 'court.count.other' : 'court.count.one', {n});
  $('#btn-strength').innerHTML = lbl(cfg.sortDir === 'desc' ? 'strength.desc' : 'strength.asc');
  const box = $('#courts'), keep = box.scrollLeft;
  box.innerHTML = n ? cfg.courts.map(courtHTML).join('') : `<p class="empty-msg">${esc(t('court.none'))}</p>`;
  box.scrollLeft = keep;
  updateDots();
  const placed = placedIds(), bench = cfg.players.filter(p => p.active && !placed.has(p.id));
  $('#bench').innerHTML = `<h3>${esc(t('bench.title', {n: bench.length}))}</h3>` + (bench.length
    ? `<div class="chips">${bench.map(p => {
        const sel = selected && selected.k === 'bench' && selected.id === p.id;
        return `<button class="chip ${sel ? 'sel' : ''}" data-k="bench" data-id="${p.id}"><img src="${avatar(p)}" alt=""><span>${esc(p.name)}</span></button>`;
      }).join('')}</div>`
    : `<p class="empty-msg">${esc(t('bench.empty'))}</p>`);
}
function updateDots() {
  if (!cfg) return;
  const box = $('#courts'), n = cfg.courts.length;
  const w = box.firstElementChild ? box.firstElementChild.offsetWidth + 16 : 1;
  const cur = Math.min(n - 1, Math.round(box.scrollLeft / w));
  $('#dots').innerHTML = n > 1 ? cfg.courts.map((_, i) => `<i class="${i === cur ? 'on' : ''}"></i>`).join('') : '';
}
function renderPlayers() {
  const box = $('#players');
  if (!cfg.players.length) { box.innerHTML = `<p class="empty-msg">${esc(t('players.none'))}</p>`; return; }
  box.innerHTML = cfg.players.map(p => `<button class="pcard ${p.active ? '' : 'off'}" data-id="${p.id}">
    <img src="${avatar(p)}" alt=""><h4>${esc(p.name)}</h4>
    ${p.active ? '' : `<div class="off-tag">${esc(t('player.inactive'))}</div>`}
    ${cfg.criteria.map(c => { const v = stat(p, c.id); return `<div class="stat"><b>${esc(critName(c))}</b><div class="bar"><i style="width:${v * 10}%;background:${colorFor(v)}"></i></div><em>${v}</em></div>`; }).join('')}
    <div class="pos">${p.positions.length ? p.positions.map(r => `<small>${esc(t('role.' + r))}</small>`).join('') : `<small>${esc(t('player.versatile'))}</small>`}</div></button>`).join('');
}

/* ---------- Swapping players on the courts ---------- */
const refOf = el => { const d = el.dataset; return d.k === 'slot' ? {k:'slot', c:+d.c, t:d.t, s:+d.s} : {k:'bench', id:d.id}; };
const getRef = r => r.k === 'slot' ? cfg.courts[r.c][r.t][r.s] : r.id;
function onTok(el) {
  const r = refOf(el);
  if (!selected) { if (!getRef(r)) return; selected = r; }
  else if (JSON.stringify(selected) === JSON.stringify(r)) selected = null;
  else {
    const a = selected, va = getRef(a), vb = getRef(r);
    if (a.k === 'slot') cfg.courts[a.c][a.t][a.s] = vb;
    if (r.k === 'slot') cfg.courts[r.c][r.t][r.s] = va;
    selected = null; save();
  }
  render();
}

/* ---------- Player editing ---------- */
function editPlayer(id) {
  const isNew = !id;
  const p = isNew ? {id:uid(), name:'', photo:'', stats:{}, positions:[], active:true} : JSON.parse(JSON.stringify(byId(id)));
  const m = openModal(`<h2>${esc(t(isNew ? 'edit.titleNew' : 'edit.titleEdit'))}</h2>
    <div class="photo-row"><img id="ph" src="${avatar(p)}" alt="">
      <div class="stack"><label class="btn">${lbl('edit.photo')}<input id="photo" type="file" accept="image/*" hidden></label>
      <button class="btn" id="ph-del" type="button">${esc(t('edit.removePhoto'))}</button></div></div>
    <label class="field"><span>${esc(t('edit.name'))}</span><input id="pname" type="text" value="${esc(p.name)}" placeholder="${esc(t('edit.namePlaceholder'))}"></label>
    <h3>${esc(t('edit.stats'))}</h3>
    ${cfg.criteria.map(c => { const v = stat(p, c.id); return `<div class="srow"><label>${esc(critName(c))}</label>
      <div class="sw"><input class="vs" type="range" min="0" max="10" step="1" value="${v}" data-id="${c.id}" style="--c:${colorFor(v)}"></div><output>${v}</output></div>`; }).join('')}
    <h3>${esc(t('edit.positions'))}</h3>
    <div class="checks">${ROLES.map(r => `<label><input type="checkbox" value="${r}" ${p.positions.includes(r) ? 'checked' : ''}>${esc(t('role.' + r))}</label>`).join('')}</div>
    <p class="hintsm">${esc(t('edit.positionsHint'))}</p>
    <label class="checks" style="margin-top:10px"><span style="display:flex;gap:6px;align-items:center"><input id="pactive" type="checkbox" ${p.active ? 'checked' : ''}>${esc(t('edit.active'))}</span></label>
    <div class="modal-actions">
      ${isNew ? '' : `<button class="btn danger" id="pdel">${esc(t('btn.delete'))}</button>`}<span class="spacer"></span>
      <button class="btn" id="pcancel">${esc(t('btn.cancel'))}</button><button class="btn primary" id="psave">${esc(t('btn.save'))}</button></div>`);
  m.querySelectorAll('input.vs').forEach(r => r.oninput = () => {
    r.style.setProperty('--c', colorFor(+r.value)); r.parentElement.nextElementSibling.textContent = r.value; });
  $('#photo', m).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { p.photo = await resizeImage(f); $('#ph', m).src = avatar(p); } catch (err) { toast(t('toast.invalidImage')); }
  };
  $('#ph-del', m).onclick = () => { p.photo = ''; $('#ph', m).src = avatar({...p, name: $('#pname', m).value}); };
  $('#pcancel', m).onclick = closeModal;
  if (!isNew) $('#pdel', m).onclick = () => {
    if (!confirm(t('edit.deleteConfirm', {name: p.name || t('player.defaultName')}))) return;
    cfg.players = cfg.players.filter(x => x.id !== p.id); save(); closeModal(); render();
  };
  $('#psave', m).onclick = () => {
    p.name = $('#pname', m).value.trim() || t('player.defaultName');
    m.querySelectorAll('input.vs').forEach(r => p.stats[r.dataset.id] = +r.value);
    p.positions = ROLES.filter(r => m.querySelector(`.checks input[value="${r}"]`).checked);
    p.active = $('#pactive', m).checked;
    if (isNew) cfg.players.push(p); else cfg.players[cfg.players.findIndex(x => x.id === p.id)] = p;
    save(); closeModal(); render();
  };
}

/* ---------- Settings & welcome ---------- */
function settings() {
  const m = openModal(`<h2>${esc(t('settings.title'))}</h2>
    <label class="field"><span>${esc(t('settings.teamSize'))}</span><input id="tsize" type="number" min="1" max="6" value="${cfg.teamSize}"></label>
    <h3>${esc(t('settings.criteria'))}</h3>
    <div id="crits">${cfg.criteria.map((c, i) => `<div class="crit"><input type="text" value="${esc(critName(c))}" data-i="${i}" ${c.fixed ? 'disabled' : ''}>
      ${c.fixed ? '' : `<button class="btn sq" data-del="${i}">✕</button>`}</div>`).join('')}</div>
    <div class="crit"><input id="newcrit" type="text" placeholder="${esc(t('settings.newCriterion'))}"><button class="btn" id="addcrit">${esc(t('btn.add'))}</button></div>
    <h3>${esc(t('settings.data'))}</h3>
    <div class="stack"><button class="btn" id="exp">${lbl('settings.export')}</button>
    <button class="btn" id="imp">${lbl('settings.import')}</button>
    <button class="btn danger" id="reset">${esc(t('settings.reset'))}</button></div>
    <div class="modal-actions"><button class="btn primary" id="sclose">${esc(t('btn.ok'))}</button></div>`);
  const apply = () => {
    cfg.teamSize = Math.max(1, Math.min(6, parseInt($('#tsize', m).value) || 6));
    m.querySelectorAll('.crit input[data-i]').forEach(i => { const c = cfg.criteria[+i.dataset.i]; if (!c.fixed) c.name = i.value.trim() || c.name; });
    save();
  };
  $('#sclose', m).onclick = () => { apply(); closeModal(); render(); };
  $('#addcrit', m).onclick = () => {
    apply(); const n = $('#newcrit', m).value.trim(); if (!n) return;
    cfg.criteria.push({id: 'c' + uid(), name: n}); save(); settings();
  };
  m.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { apply(); cfg.criteria.splice(+b.dataset.del, 1); save(); settings(); });
  $('#exp', m).onclick = () => { apply(); exportXML(); };
  $('#imp', m).onclick = () => $('#file-import').click();
  $('#reset', m).onclick = () => { if (confirm(t('settings.resetConfirm'))) { cfg = newConfig(); save(); closeModal(); render(); } };
}
function welcome() {
  const m = openModal(`<h2>${lbl('welcome.title')}</h2><p>${esc(t('welcome.text'))}</p>
    <div class="stack"><button class="btn primary" id="w-imp">${lbl('welcome.import')}</button>
    <button class="btn" id="w-new">${lbl('welcome.create')}</button></div>`, true);
  $('#w-imp', m).onclick = () => $('#file-import').click();
  $('#w-new', m).onclick = () => { cfg = newConfig(); save(); closeModal(); tab = 'players'; render(); toast(t('toast.addPlayersHint')); };
}

/* ---------- Language menu & translation page ---------- */
function toggleLangMenu() {
  const menu = $('#lang-menu');
  if (!menu.hidden) { menu.hidden = true; return; }
  menu.innerHTML = langCodes().map(c => `<div class="lm-row"><button data-lang="${c}" class="${c === lang ? 'on' : ''}"><b>${esc(c.toUpperCase())}</b> ${esc(langName(c))}</button><button class="lm-edit" data-edit="${c}" title="${esc(t('lang.edit'))}">✎</button></div>`).join('')
    + `<button data-lang="__add" class="add">${lbl('lang.add')}</button>`;
  menu.hidden = false;
}
// editCode: null = add a new language, otherwise the code of the language being edited
function openTranslate(editCode) {
  if (tab !== 'translate') prevTab = tab;
  if (editCode) {
    const vals = {};
    for (const [k, v] of Object.entries(dictOf(editCode))) if (k[0] !== '_') vals[k] = v;
    tr = {edit: editCode, src: 'en', code: editCode, name: langName(editCode), vals};
  } else tr = {edit: null, src: lang, code: '', name: '', vals: {}};
  tab = 'translate'; selected = null; render();
}
function renderTranslate() {
  const en = dictOf('en'), src = dictOf(tr.src);
  const keys = Object.keys(VTM_RESOURCES.en).filter(k => k[0] !== '_');
  const srcText = k => src[k] || en[k];
  const builtIn = tr.edit && VTM_RESOURCES[tr.edit];
  $('#tab-translate').innerHTML = `<div class="tr-page"><h2>${esc(t(tr.edit ? 'translate.titleEdit' : 'translate.title'))}</h2>
    <p class="hint">${esc(t('translate.hint'))}</p>
    <div class="tr-head">
      <label class="field"><span>${esc(t('translate.source'))}</span><select id="tr-src">${langCodes().map(c => `<option value="${c}" ${c === tr.src ? 'selected' : ''}>${esc(c.toUpperCase() + ' – ' + langName(c))}</option>`).join('')}</select></label>
      <label class="field"><span>${esc(t('translate.code'))}</span><input id="tr-code" type="text" maxlength="8" value="${esc(tr.code)}" ${tr.edit ? 'disabled' : ''}></label>
      <label class="field"><span>${esc(t('translate.name'))}</span><input id="tr-name" type="text" value="${esc(tr.name)}" ${builtIn ? 'disabled' : ''}></label>
    </div>
    <div class="tr-list"><div class="tr-row tr-th"><div>${esc(t('translate.sourceText'))}</div><div></div><div>${esc(t('translate.newText'))}</div></div>
    ${keys.map(k => `<div class="tr-row"><div class="tr-src">${iconHTML(k, 'before')} ${esc(srcText(k))} ${iconHTML(k, 'after')}</div><button type="button" class="btn tr-copy" data-k="${k}" title="${esc(t('translate.copy'))}">➜</button><div class="tr-in">${iconHTML(k, 'before')}<input type="text" data-k="${k}" value="${esc(tr.vals[k] || '')}">${iconHTML(k, 'after')}</div></div>`).join('')}</div>
    <div class="modal-actions"><button class="btn" id="tr-cancel">${esc(t('btn.cancel'))}</button><button class="btn primary" id="tr-save">${esc(t('translate.save'))}</button></div></div>`;
  const box = $('#tab-translate');
  $('#tr-src', box).onchange = e => { tr.src = e.target.value; renderTranslate(); };
  $('#tr-code', box).oninput = e => { tr.code = e.target.value; };
  $('#tr-name', box).oninput = e => { tr.name = e.target.value; };
  box.querySelectorAll('.tr-list input').forEach(i => i.oninput = () => { tr.vals[i.dataset.k] = i.value; });
  box.querySelectorAll('.tr-copy').forEach(b => b.onclick = () => { // copy the source text into the translation box
    const k = b.dataset.k; tr.vals[k] = srcText(k);
    box.querySelector(`.tr-list input[data-k="${k}"]`).value = tr.vals[k];
  });
  $('#tr-cancel', box).onclick = () => { tab = prevTab; render(); };
  $('#tr-save', box).onclick = () => {
    const code = (tr.edit || tr.code).trim().toLowerCase();
    if (!/^[a-z]{2,8}$/.test(code) || (!tr.edit && VTM_RESOURCES[code])) return toast(t('translate.codeInvalid'));
    const strings = {};
    for (const k of keys) strings[k] = (tr.vals[k] || '').trim() || srcText(k); // empty box => original text
    customLangs[code] = {name: builtIn ? langName(code) : (tr.name.trim() || code.toUpperCase()), strings};
    try { localStorage.setItem(CUSTOM_LANGS_KEY, JSON.stringify(customLangs)); } catch (e) { return toast(t('toast.storageFull')); }
    tab = prevTab; setLang(code); toast(t('translate.saved'));
  };
}

/* ---------- XML import / export ---------- */
function exportXML() {
  const a = esc;
  const team = (tm, side) => `<team side="${side}">${tm.map((id, i) => id ? `<slot index="${i}" player="${a(id)}"/>` : '').join('')}</team>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<vtm version="1">
  <settings teamSize="${cfg.teamSize}" sortDir="${cfg.sortDir}"/>
  <criteria>${cfg.criteria.map(c => `<criterion id="${a(c.id)}" name="${a(c.fixed ? VTM_RESOURCES.en['criterion.' + c.id] : c.name)}" fixed="${!!c.fixed}"/>`).join('')}</criteria>
  <players>
${cfg.players.map(p => `    <player id="${a(p.id)}" active="${p.active}"><name>${a(p.name)}</name><photo>${a(p.photo || '')}</photo>` +
  `<stats>${cfg.criteria.map(c => `<stat id="${a(c.id)}">${stat(p, c.id)}</stat>`).join('')}</stats>` +
  `<positions>${p.positions.map(r => `<position>${a(r)}</position>`).join('')}</positions></player>`).join('\n')}
  </players>
  <courts>${cfg.courts.map(c => `<court>${team(c.a, 'a')}${team(c.b, 'b')}</court>`).join('')}</courts>
  <lastBench>${cfg.lastBench.map(id => `<ref id="${a(id)}"/>`).join('')}</lastBench>
</vtm>
`;
  const url = URL.createObjectURL(new Blob([xml], {type: 'application/xml'}));
  const l = document.createElement('a'); l.href = url; l.download = 'vtm-config.xml'; document.body.appendChild(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(t('toast.exported'));
}
function parseXML(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.nodeName !== 'vtm') throw new Error(t('error.invalidFile'));
  const kids = (el, n) => [...el.children].filter(c => c.nodeName === n);
  const one = (el, n) => kids(el, n)[0];
  const c = newConfig();
  const st = one(root, 'settings');
  if (st) { c.teamSize = Math.max(1, Math.min(6, +st.getAttribute('teamSize') || 6)); c.sortDir = st.getAttribute('sortDir') === 'asc' ? 'asc' : 'desc'; }
  const cr = one(root, 'criteria');
  if (cr) {
    const list = kids(cr, 'criterion').map(e => FIXED.some(f => f.id === e.getAttribute('id'))
      ? {id: e.getAttribute('id'), fixed: true} : {id: e.getAttribute('id'), name: e.getAttribute('name')});
    FIXED.slice().reverse().forEach(f => { if (!list.some(x => x.id === f.id)) list.unshift({id: f.id, fixed: true}); });
    c.criteria = list;
  }
  const pl = one(root, 'players');
  c.players = pl ? kids(pl, 'player').map(e => {
    const stats = {}; const se = one(e, 'stats');
    if (se) kids(se, 'stat').forEach(s => stats[s.getAttribute('id')] = Math.max(0, Math.min(10, parseInt(s.textContent) || 0)));
    const pe = one(e, 'positions');
    const photo = (one(e, 'photo')?.textContent || '').trim();
    return {id: e.getAttribute('id') || uid(), name: one(e, 'name')?.textContent || t('player.defaultName'),
      photo: photo.startsWith('data:image/') ? photo : '', stats,
      positions: pe ? kids(pe, 'position').map(x => normRole(x.textContent)).filter(r => ROLES.includes(r)) : [],
      active: e.getAttribute('active') !== 'false'};
  }) : [];
  const co = one(root, 'courts');
  c.courts = co ? kids(co, 'court').map(e => {
    const court = newCourt();
    kids(e, 'team').forEach(tm => { const side = tm.getAttribute('side') === 'b' ? 'b' : 'a';
      kids(tm, 'slot').forEach(s => { const i = +s.getAttribute('index'); if (i >= 0 && i < 6) court[side][i] = s.getAttribute('player'); }); });
    return court;
  }) : [newCourt()];
  if (!c.courts.length) c.courts = [newCourt()];
  const lb = one(root, 'lastBench');
  c.lastBench = lb ? kids(lb, 'ref').map(r => r.getAttribute('id')) : [];
  return c;
}

/* ---------- Events ---------- */
document.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.tab; selected = null; render(); });
$('#btn-add').onclick = () => editPlayer();
$('#btn-settings').onclick = () => cfg ? settings() : welcome();
$('#btn-lang').onclick = e => { e.stopPropagation(); toggleLangMenu(); };
$('#lang-menu').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  $('#lang-menu').hidden = true;
  if (b.dataset.edit) { closeModal(); openTranslate(b.dataset.edit); }
  else if (b.dataset.lang === '__add') { closeModal(); openTranslate(); } else setLang(b.dataset.lang);
};
document.addEventListener('click', e => { if (!e.target.closest('#lang-menu')) $('#lang-menu').hidden = true; });
$('#court-plus').onclick = () => { cfg.courts.push(newCourt()); save(); render(); $('#courts').scrollTo({left: 1e5, behavior: 'smooth'}); };
$('#court-minus').onclick = () => {
  if (!cfg.courts.length) return;
  const last = cfg.courts[cfg.courts.length - 1];
  if ([...last.a, ...last.b].some(Boolean) && !confirm(t('court.removeConfirm'))) return;
  cfg.courts.pop(); selected = null; save(); render();
};
$('#btn-random').onclick = () => generate('random');
$('#btn-strength').onclick = () => { cfg.sortDir = cfg.sortDir === 'desc' ? 'asc' : 'desc'; generate('strength'); };
$('#courts').addEventListener('scroll', () => updateDots(), {passive: true});
$('#courts').onclick = e => { const el = e.target.closest('.tok'); if (el) onTok(el); };
$('#bench').onclick = e => { const el = e.target.closest('.chip'); if (el) onTok(el); };
$('#players').onclick = e => { const el = e.target.closest('.pcard'); if (el) editPlayer(el.dataset.id); };
$('#file-import').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    cfg = parseXML(await f.text()); selected = null; save(); closeModal(); tab = 'courts'; render(); toast(t('toast.imported'));
  } catch (err) { toast(t('toast.importFailed', {msg: err.message})); }
};

load();
applyStatic();
if (cfg) render(); else welcome();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
