/**
 * Vista "Entrenar", en tres etapas para no saturar:
 *   1. Elegir   tipo de entrenamiento y clase (variante).
 *   2. Calentar el calentamiento es lo único activo.
 *   3. Entrenar al tildar todo el calentamiento se habilitan los ejercicios.
 */
import { MODES, TEMPLATES, WARMUPS, WEEK_SUGGESTION } from '../../data/templates.js';
import { estimateMinutes, nextTemplate } from '../../core/planner.js';
import { lastFor, suggest, volume, fmtKg, num } from '../../core/progression.js';
import { esc, hmm, mmss, ICON } from '../dom.js';
import { figureStatic } from '../figure.js';

export function countDone(draft, session) {
  let done = 0, total = 0;
  for (const b of session.blocks) for (const it of b.items) {
    total += b.sets;
    const r = draft?.rows?.[it.slot];
    if (r && r.ex === it.ex.id) done += r.sets.filter((s) => s.done).length;
  }
  return { done, total };
}

/** Sets del borrador convertidos a { exId: sets } para el volumen. */
export function draftSets(draft) {
  const out = {};
  for (const slot in draft?.rows || {}) out[draft.rows[slot].ex] = draft.rows[slot].sets;
  return out;
}

export const warmDone = (mode, draft) => WARMUPS[mode].every((_, i) => draft?.warm?.[i]);

/* ---------------- Etapa 1: elegir ---------------- */
function chooser(S) {
  const today = WEEK_SUGGESTION[new Date().getDay()];
  const pick = S.pick || {};

  const modes = Object.entries(MODES).map(([id, m]) => {
    const live = TEMPLATES[id].some((t) => S.drafts[t.id]?.start);
    return `<button class="choice" id="mode-${id}" data-act="choose-mode" data-mode="${id}" aria-pressed="${id === pick.mode}">
      <span class="choice-t">${m.label}${live ? '<i class="dot" title="Sesión en curso"></i>' : ''}</span>
      <span class="choice-s">${esc(m.hint)}</span>
      ${id === today ? '<span class="badge">Sugerido hoy</span>' : ''}
    </button>`;
  }).join('');

  let classes = '';
  if (pick.mode) {
    const next = nextTemplate(pick.mode, S.hist).id;
    classes = `<h2 class="choose-s">Clase</h2>
    <div class="choices two">${TEMPLATES[pick.mode].map((t) => `
      <button class="choice" id="tpl-${t.id}" data-act="choose-tpl" data-tpl="${t.id}" aria-pressed="${t.id === pick.tpl}">
        <span class="choice-t">${esc(t.name)}</span>
        <span class="choice-s">${esc(t.tag)} · ≈ ${estimateMinutes(t)} min</span>
        ${t.id === next ? '<span class="badge p">Te toca</span>' : ''}
      </button>`).join('')}
    </div>`;
  }

  const live = S.drafts[S.tplId]?.start;
  return `<section class="choose">
    <span class="eyebrow">Hoy</span>
    <h1>¿Qué entrenás?</h1>
    <div class="choices">${modes}</div>
    ${classes}
    ${pick.tpl ? `<button class="btn solid start" id="start" data-act="start">${S.drafts[pick.tpl]?.start ? 'Continuar sesión' : 'Empezar calentamiento'}</button>` : ''}
    ${S.choosing && live ? '<button class="btn ghost start" id="choose-cancel" data-act="choose-cancel">Volver a la sesión</button>' : ''}
  </section>`;
}

/* ---------------- Etapa 2: calentar ---------------- */
function warmup(S, draft, done) {
  if (done && warmDone(S.mode, draft) && !S.warmOpen) {
    return `<button class="card warm warm-done" id="warm-open" data-act="warm-open">
      <span class="tick on">${ICON.check}</span><span>Calentamiento listo</span><small>ver</small></button>`;
  }
  const rows = WARMUPS[S.mode].map((w, i) => {
    const on = !!draft?.warm?.[i];
    const name = w.ex ? `<button class="link" data-act="info" data-ex="${w.ex}">${esc(w.t)}</button>` : esc(w.t);
    return `<div class="witem ${on ? 'on' : ''}">
      <button class="tick" id="warm-${i}" data-act="warm" data-i="${i}" aria-pressed="${on}" aria-label="Marcar ${esc(w.t)}">${ICON.check}</button>
      <div class="witem-t"><div class="t">${name}</div><div class="s">${esc(w.s)}</div></div>
      ${w.timer ? `<button class="btn-o m" id="wt-${i}" data-act="wtimer" data-s="${w.timer}" data-l="${esc(w.t)}">${mmss(w.timer)}</button>` : '<span></span>'}
    </div>`;
  }).join('');
  return `<section class="card warm ${done ? '' : 'active'}">
    <div class="sec-t"><h2>Calentamiento</h2><span>≈ 16 min · después, sólo fuerza</span></div>
    <div class="witems">${rows}</div>
  </section>`;
}

/* ---------------- Etapa 3: entrenar ---------------- */
function exerciseCard(S, b, it, rows) {
  const ex = it.ex, sg = suggest(ex, b.sets, S.hist), last = lastFor(S.hist, ex.id);
  const prev = last ? last.sets : [];
  const complete = rows.every((s) => s.done);
  const tgt = parseInt(ex.reps, 10) || ex.lo;

  const setRows = rows.map((s, k) => {
    const p = prev[k]?.done ? prev[k] : null;
    const id = `${it.slot}-${k}`;
    return `<div class="srow set ${s.done ? 'done' : ''}" data-slot="${it.slot}" data-i="${k}">
      <span class="sn">${k + 1}</span>
      <span class="prev ${p ? '' : 'none'}">${p ? `${fmtKg(num(p.kg))}×${esc(p.reps)}` : '—'}</span>
      <input class="in" id="kg-${id}" data-f="kg" inputmode="decimal" autocomplete="off" placeholder="${p ? fmtKg(num(p.kg)) : 'kg'}" value="${esc(s.kg)}" aria-label="Kg, serie ${k + 1}">
      <input class="in" id="rp-${id}" data-f="reps" inputmode="numeric" autocomplete="off" placeholder="${p ? esc(p.reps) : tgt}" value="${esc(s.reps)}" aria-label="Repeticiones, serie ${k + 1}">
      <button class="chk" id="ck-${id}" data-act="check" aria-pressed="${s.done}" aria-label="Serie ${k + 1} hecha">${ICON.check}</button>
    </div>`;
  }).join('');

  return `<article class="card ex ${complete ? 'complete' : ''}">
    <button class="exh" data-act="info" data-ex="${ex.id}" data-slot="${it.slot}" aria-label="${esc(ex.name)}: cómo se hace y alternativas">
      <span class="thumb">${figureStatic(ex.fig)}</span>
      <span class="exh-t">
        <span class="excode">${it.slot}</span>
        <span class="exh-n">${esc(ex.name)}</span>
        <span class="eq">${b.sets} × ${esc(ex.reps)}${ex.per === 'mano' ? ' · kg por mancuerna' : ''}</span>
      </span>
    </button>
    <p class="goal ${sg.kind}">${sg.kind === 'up' ? ICON.up : ''}<span>${sg.html}</span></p>
    <div class="sets">
      <div class="srow sh"><span>#</span><span>Anterior</span><span>Kg</span><span>Reps</span><span></span></div>
      ${setRows}
    </div>
  </article>`;
}

function closing(S, draft, c) {
  const el = draft?.start ? Date.now() - draft.start : 0;
  let actions;
  if (S.pending === 'finish') {
    actions = `<p class="confirm">¿Guardar la sesión con ${c.done} series?</p>
      <div class="row"><button class="btn solid" id="fin-yes" data-act="finish-yes">Guardar sesión</button><button class="btn ghost" id="fin-no" data-act="cancel">Seguir</button></div>`;
  } else if (S.pending === 'discard') {
    actions = `<p class="confirm">¿Descartar lo anotado hoy? No se guarda nada.</p>
      <div class="row"><button class="btn warn" id="dis-yes" data-act="discard-yes">Descartar</button><button class="btn ghost" id="dis-no" data-act="cancel">Volver</button></div>`;
  } else {
    actions = `<div class="row"><button class="btn solid" id="fin" data-act="finish">Terminar y guardar</button>
      <button class="btn ghost shrink" id="dis" data-act="discard">Descartar</button></div>`;
  }
  return `<section class="card finish">
    <div class="stats">
      <div class="stat"><b class="mono">${c.done}<span class="of">/${c.total}</span></b><small>Series</small></div>
      <div class="stat"><b class="mono">${fmtKg(Math.round(volume(draftSets(draft))))}</b><small>Kg totales</small></div>
      <div class="stat"><b class="mono">${hmm(el)}</b><small>Tiempo</small></div>
    </div>
    ${actions}
  </section>`;
}

/**
 * @param S       estado de la app
 * @param session sesión armada por el planificador
 * @param rowsOf  (slot, exId, n) → sets del borrador
 */
export function renderTrain(S, session, rowsOf) {
  const draft = S.drafts[S.tplId];
  if (S.choosing || !draft?.start) return chooser(S);

  const tpl = session.tpl;
  const done = !!draft.unlocked || warmDone(S.mode, draft);
  const nEx = session.blocks.reduce((n, b) => n + b.items.length, 0);

  const header = `<div class="today">
    <div class="today-t">
      <span class="eyebrow">Hoy</span>
      <h1>${esc(tpl.name)}</h1>
      <p class="today-s">≈ ${estimateMinutes(tpl)} min · ${esc(tpl.tag)}</p>
    </div>
    <button class="btn-o p" id="change" data-act="change">Cambiar</button>
  </div>`;

  if (!done) {
    return `${header}
    ${warmup(S, draft, false)}
    <div class="locked">
      <p>Los ${nEx} ejercicios se habilitan cuando completes el calentamiento.</p>
      <button class="link" id="warm-skip" data-act="warm-skip">Ya calenté</button>
    </div>`;
  }

  const blocks = session.blocks.map((b) => {
    let bd = 0;
    const cards = b.items.map((it) => {
      const rows = rowsOf(it.slot, it.ex.id, b.sets);
      bd += rows.filter((s) => s.done).length;
      return exerciseCard(S, b, it, rows);
    }).join('');
    const bt = b.sets * b.items.length;
    return `<section class="block" id="block-${b.code}">
      <div class="bhead"><span class="bcode" aria-hidden="true">${b.code}</span>
        <div><div class="bt">${esc(b.title)}</div><div class="bs">${b.sets} rondas · descanso ${b.rest} s</div></div>
        <span class="bprog mono ${bd === bt ? 'full' : ''}">${bd}/${bt}</span></div>
      <div class="pair">${cards}</div>
    </section>`;
  }).join('');

  return `${header}
  ${warmup(S, draft, true)}
  ${blocks}
  ${closing(S, draft, countDone(draft, session))}`;
}
