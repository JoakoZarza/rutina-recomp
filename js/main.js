/**
 * Punto de entrada: estado de la app, render de vistas y manejo de eventos.
 */
import { TEMPLATES, TPL, WEEK_SUGGESTION } from './data/templates.js';
import { buildSession, cycleInfo, nextTemplate, slotKey } from './core/planner.js';
import { num } from './core/progression.js';
import * as store from './core/storage.js';
import { $, toast, hmm } from './ui/dom.js';
import { initTimer, startTimer, addTime, stopTimer, unlockAudio } from './ui/timer.js';
import { initInfo, openInfo, closeInfo } from './ui/info.js';
import { renderTrain } from './ui/views/train.js';
import { renderProgress } from './ui/views/progress.js';
import { renderLibrary } from './ui/views/library.js';
import { EX } from './data/exercises.js';

/* ---------------- Estado ---------------- */
const prefs = store.prefs.get();
if (!prefs.start) { prefs.start = Date.now(); store.prefs.save(prefs); }

const S = {
  view: 'train',
  mode: WEEK_SUGGESTION[new Date().getDay()],
  tplId: null,
  sel: {},            // variante elegida a mano por modo
  hist: store.history.all(),
  drafts: store.drafts.all(),
  prefs,
  cycle: cycleInfo(prefs.start),
  pending: null,      // 'finish' | 'discard'
  pendingDel: null,
  query: '',
};

/** Variante activa del modo: la elegida, la que tiene una sesión en curso, o la que toca. */
function templateFor(mode) {
  if (S.sel[mode]) return S.sel[mode];
  const live = TEMPLATES[mode].find((t) => S.drafts[t.id]?.start);
  return (live || nextTemplate(mode, S.hist)).id;
}

// Si quedó una sesión a medio hacer, abrir directamente ahí.
const liveTpl = Object.keys(S.drafts).find((id) => S.drafts[id]?.start && TPL[id]);
if (liveTpl) S.mode = Object.keys(TEMPLATES).find((m) => TEMPLATES[m].some((t) => t.id === liveTpl));
S.tplId = templateFor(S.mode);

const session = () => buildSession(S.tplId, S.cycle.cycle, S.prefs.swaps);
const saveDrafts = () => store.drafts.save(S.drafts);

function draft(create = false) {
  if (!S.drafts[S.tplId] && create) S.drafts[S.tplId] = { start: null, warm: {}, rows: {} };
  return S.drafts[S.tplId];
}

const blank = (n) => Array.from({ length: n }, () => ({ kg: '', reps: '', done: false }));

/** Sets del borrador para un lugar; si el ejercicio cambió, arranca vacío. */
function rowsOf(slot, exId, n) {
  const r = draft()?.rows?.[slot];
  return r && r.ex === exId ? r.sets : blank(n);
}
function ensureRows(slot, exId, n) {
  const d = draft(true);
  if (!d.rows[slot] || d.rows[slot].ex !== exId) d.rows[slot] = { ex: exId, sets: blank(n) };
  return d.rows[slot].sets;
}

function findItem(slot) {
  for (const b of session().blocks) {
    const i = b.items.findIndex((it) => it.slot === slot);
    if (i >= 0) return { block: b, item: b.items[i], idx: i };
  }
  return null;
}

/* ---------------- Render ---------------- */
const main = $('#main');

function render() {
  for (const v of ['train', 'prog', 'lib']) {
    const btn = $(`#nav-${v}`);
    if (v === S.view) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
  }
  if (S.view === 'train') main.innerHTML = renderTrain(S, session(), rowsOf);
  else if (S.view === 'prog') main.innerHTML = renderProgress(S);
  else main.innerHTML = renderLibrary(S);
  tickClock();
}

/* Reloj de sesión con presupuesto de 1:30 h */
function tickClock() {
  const d = S.drafts[S.tplId];
  const on = S.view === 'train' && d?.start;
  $('#clock').classList.toggle('on', !!on);
  if (!on) return;
  const el = Date.now() - d.start, m = el / 60000;
  $('#clockT').textContent = `${hmm(el)}:${String(Math.floor(el / 1000) % 60).padStart(2, '0')}`;
  $('#clockBar').firstElementChild.style.width = `${Math.min(100, (m / 90) * 100)}%`;
  $('#clockBar').classList.toggle('late', m >= 75);
}

/* Pantalla encendida durante la sesión, si el navegador lo permite */
let wake = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wake) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch { /* no disponible */ }
}

function markStart() {
  const d = draft(true);
  if (!d.start) { d.start = Date.now(); saveDrafts(); keepAwake(); }
}

/* ---------------- Acciones ---------------- */
function checkSet(row) {
  const slot = row.dataset.slot, i = +row.dataset.i;
  const found = findItem(slot);
  if (!found) return;
  const { block, item, idx } = found;
  const sets = ensureRows(slot, item.ex.id, block.sets);
  const s = sets[i];

  if (s.done) { s.done = false; saveDrafts(); render(); return; }

  const kgIn = row.querySelector('[data-f="kg"]'), rIn = row.querySelector('[data-f="reps"]');
  if (!s.kg && kgIn.placeholder !== 'kg') s.kg = kgIn.placeholder;
  if (!s.reps && num(rIn.placeholder) != null) s.reps = rIn.placeholder;
  if (!s.kg) s.kg = '0';
  if (num(s.reps) == null) {
    row.classList.add('err');
    rIn.focus();
    toast('Anotá las repeticiones de la serie');
    return;
  }
  s.done = true;
  markStart();
  saveDrafts();

  // Biserie: tras el primer ejercicio, 20 s para cambiar; tras el último, descanso del bloque.
  const blocks = session().blocks;
  if (idx === block.items.length - 1) {
    const next = blocks[blocks.indexOf(block) + 1];
    const more = i + 1 < block.sets;
    const label = more ? `Sigue ${block.code}1 · ronda ${i + 2}` : next ? `Bloque ${block.code} listo · sigue ${next.code}1` : 'Último bloque listo';
    startTimer(more || next ? block.rest : 60, label);
  } else {
    const nx = block.items[idx + 1];
    startTimer(20, `Pasá a ${nx.slot} · ${nx.ex.name}`);
  }
  render();
}

function finishSession() {
  const d = draft();
  const sets = {};
  for (const slot in d?.rows || {}) {
    const r = d.rows[slot];
    if (r.sets.some((s) => s.done)) sets[r.ex] = r.sets;
  }
  S.pending = null;
  if (!Object.keys(sets).length) { render(); toast('Marcá al menos una serie antes de guardar'); return; }

  S.hist.push({ id: `s${Date.now().toString(36)}`, mode: S.mode, tpl: S.tplId, start: d.start || Date.now(), end: Date.now(), sets });
  const ok = store.history.save(S.hist);
  delete S.drafts[S.tplId];
  saveDrafts();
  delete S.sel[S.mode];
  S.tplId = templateFor(S.mode); // la próxima vez toca la otra variante
  stopTimer();
  try { wake?.release(); } catch { /* nada */ }
  render();
  scrollTo(0, 0);
  toast(ok ? 'Sesión guardada' : 'No se pudo guardar en este navegador');
}

function swapExercise(slot, exId) {
  S.prefs.swaps[slotKey(S.cycle.cycle, S.tplId, slot)] = exId;
  store.prefs.save(S.prefs);
  const d = draft();
  if (d?.rows?.[slot] && d.rows[slot].ex !== exId) { delete d.rows[slot]; saveDrafts(); }
  closeInfo();
  render();
  toast(`${EX[exId].name} hasta fin del ciclo`);
}

function exportData() {
  const data = JSON.stringify({ app: 'rutina-recomp', v: 2, history: S.hist, prefs: S.prefs });
  const io = $('#io');
  const fallback = () => { io.value = data; io.focus(); io.select(); toast('Seleccionado: copialo y guardalo'); };
  try { navigator.clipboard.writeText(data).then(() => toast('Datos copiados al portapapeles'), fallback); } catch { fallback(); }
}

function importData() {
  const io = $('#io');
  try {
    const d = JSON.parse(io.value);
    const arr = Array.isArray(d) ? d : d.history;
    if (!Array.isArray(arr)) throw new Error('formato');
    const ids = new Set(S.hist.map((h) => h.id));
    let n = 0;
    for (const h of arr) if (h?.id && h.sets && !ids.has(h.id)) { S.hist.push(h); n++; }
    S.hist.sort((x, y) => x.start - y.start);
    store.history.save(S.hist);
    io.value = '';
    render();
    toast(n ? `${n} sesiones importadas` : 'No había sesiones nuevas');
  } catch {
    toast('Ese texto no es un respaldo válido');
  }
}

const actions = {
  view: (b) => { S.view = b.dataset.v; S.pending = null; S.pendingDel = null; render(); scrollTo(0, 0); },
  mode: (b) => { S.mode = b.dataset.mode; S.tplId = templateFor(S.mode); S.pending = null; render(); },
  variant: (b) => { S.sel[S.mode] = b.dataset.tpl; S.tplId = b.dataset.tpl; S.pending = null; render(); },
  warm: (b) => { const d = draft(true); d.warm[b.dataset.i] = !d.warm[b.dataset.i]; markStart(); saveDrafts(); render(); },
  wtimer: (b) => { markStart(); startTimer(+b.dataset.s, b.dataset.l); render(); },
  rest: (b) => startTimer(+b.dataset.s, 'Descanso manual'),
  tadd: (b) => addTime(+b.dataset.s),
  tskip: () => stopTimer(),
  info: (b) => {
    const slot = S.view === 'train' ? b.dataset.slot : undefined;
    openInfo(b.dataset.ex, { hist: S.hist, slot, current: b.dataset.ex, focusSwap: b.classList.contains('swap') });
  },
  'info-close': () => closeInfo(),
  swap: (b) => swapExercise(b.dataset.slot, b.dataset.ex),
  check: (b) => checkSet(b.closest('.set')),
  finish: () => { S.pending = 'finish'; render(); $('#fin-yes')?.scrollIntoView({ block: 'center' }); },
  discard: () => { S.pending = 'discard'; render(); },
  cancel: () => { S.pending = null; render(); },
  'finish-yes': finishSession,
  'discard-yes': () => { delete S.drafts[S.tplId]; saveDrafts(); S.pending = null; stopTimer(); render(); scrollTo(0, 0); toast('Sesión descartada'); },
  del: (b) => { S.pendingDel = b.dataset.id; render(); },
  'del-no': () => { S.pendingDel = null; render(); },
  'del-yes': (b) => { S.hist = S.hist.filter((h) => h.id !== b.dataset.id); store.history.save(S.hist); S.pendingDel = null; render(); toast('Sesión borrada'); },
  export: exportData,
  import: importData,
};

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  unlockAudio();
  actions[b.dataset.act]?.(b);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.matches('.set .in')) {
    const row = t.closest('.set');
    const found = findItem(row.dataset.slot);
    if (!found) return;
    const sets = ensureRows(row.dataset.slot, found.item.ex.id, found.block.sets);
    sets[+row.dataset.i][t.dataset.f] = t.value.trim();
    row.classList.remove('err');
    saveDrafts();
  } else if (t.id === 'q') {
    S.query = t.value;
    const pos = t.selectionStart;
    render();
    const q = $('#q');
    q.focus();
    q.setSelectionRange(pos, pos);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.drafts[S.tplId]?.start) keepAwake();
});

/* ---------------- Arranque ---------------- */
initTimer();
initInfo();
render();
setInterval(tickClock, 1000);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* sin modo offline */ });
}
