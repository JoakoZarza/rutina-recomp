/** Vista "Entrenar": selector de modo, variante, calentamiento, biseries y cierre. */
import { MODES, TEMPLATES, WARMUPS, WEEK_SUGGESTION } from '../../data/templates.js';
import { estimateMinutes, CYCLE_WEEKS, mondayOf } from '../../core/planner.js';
import { lastFor, suggest, volume, fmtKg, num } from '../../core/progression.js';
import { esc, hmm, mmss, ICON } from '../dom.js';
import { figureStatic } from '../figure.js';

function countDone(draft, session) {
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

function modeTabs(S) {
  const today = WEEK_SUGGESTION[new Date().getDay()];
  return Object.entries(MODES).map(([id, m]) => {
    const live = TEMPLATES[id].some((t) => S.drafts[t.id]?.start);
    return `<button class="mode" id="mode-${id}" data-act="mode" data-mode="${id}" aria-pressed="${id === S.mode}">
      <span class="mode-t">${m.label}${live ? '<i class="dot" title="Sesión en curso"></i>' : ''}</span>
      <span class="mode-s">${id === today ? 'Sugerido hoy' : '&nbsp;'}</span>
    </button>`;
  }).join('');
}

function variantChips(S) {
  return TEMPLATES[S.mode].map((t) => `
    <button class="variant" id="var-${t.id}" data-act="variant" data-tpl="${t.id}" aria-pressed="${t.id === S.tplId}">
      <b>${esc(t.name)}</b><small>${esc(t.tag)}</small>
    </button>`).join('');
}

function warmup(S, draft) {
  return WARMUPS[S.mode].map((w, i) => {
    const on = !!draft?.warm?.[i];
    return `<div class="witem ${on ? 'on' : ''}">
      <button class="tick" id="warm-${i}" data-act="warm" data-i="${i}" aria-pressed="${on}" aria-label="Marcar ${esc(w.t)}">${ICON.check}</button>
      <div class="witem-t"><div class="t">${esc(w.t)}${w.ex ? ` <button class="i-btn" data-act="info" data-ex="${w.ex}" aria-label="Cómo se hace ${esc(w.t)}">${ICON.info}</button>` : ''}</div><div class="s">${esc(w.s)}</div></div>
      ${w.timer ? `<button class="btn-o m" id="wt-${i}" data-act="wtimer" data-s="${w.timer}" data-l="${esc(w.t)}">${mmss(w.timer)}</button>` : '<span></span>'}
    </div>`;
  }).join('');
}

function exerciseCard(S, b, it, idx, rows) {
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
    <div class="exh">
      <button class="thumb" data-act="info" data-ex="${ex.id}" data-slot="${it.slot}" aria-label="Ver cómo se hace ${esc(ex.name)}">${figureStatic(ex.fig)}</button>
      <div class="exh-t">
        <div class="exh-row"><span class="excode">${it.slot}</span>
          <button class="i-btn" data-act="info" data-ex="${ex.id}" data-slot="${it.slot}" aria-label="Info y alternativas">${ICON.info}</button>
          <button class="i-btn swap" data-act="info" data-ex="${ex.id}" data-slot="${it.slot}" aria-label="Cambiar ejercicio">${ICON.swap}</button>
        </div>
        <h3>${esc(ex.name)}</h3>
        <p class="eq">${esc(ex.eq)} · ${b.sets} × ${esc(ex.reps)}${ex.per === 'mano' ? ' · kg por mancuerna' : ''}</p>
      </div>
    </div>
    <p class="goal ${sg.kind}">${sg.kind === 'up' ? ICON.up : ICON.target}<span>${sg.html}</span></p>
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
    actions = `<p class="confirm">¿Guardar la sesión con ${c.done} series? Queda como referencia para la próxima.</p>
      <div class="row"><button class="btn solid" id="fin-yes" data-act="finish-yes">Guardar sesión</button><button class="btn ghost" id="fin-no" data-act="cancel">Seguir entrenando</button></div>`;
  } else if (S.pending === 'discard') {
    actions = `<p class="confirm">¿Descartar lo anotado hoy? No se guarda nada.</p>
      <div class="row"><button class="btn warn" id="dis-yes" data-act="discard-yes">Descartar</button><button class="btn ghost" id="dis-no" data-act="cancel">Volver</button></div>`;
  } else {
    actions = `<div class="row"><button class="btn solid" id="fin" data-act="finish">Terminar y guardar</button>
      ${draft?.start ? '<button class="btn ghost shrink" id="dis" data-act="discard">Descartar</button>' : ''}</div>`;
  }
  return `<section class="card finish">
    <div class="sec-t"><h2>Cierre</h2><span>${draft?.start ? 'en curso' : 'sin empezar'}</span></div>
    <div class="stats">
      <div class="stat"><b class="mono">${c.done}<span class="of">/${c.total}</span></b><small>Series</small></div>
      <div class="stat"><b class="mono">${fmtKg(Math.round(volume(draftSets(draft))))}</b><small>Kg totales</small></div>
      <div class="stat"><b class="mono">${draft?.start ? hmm(el) : '0:00'}</b><small>Tiempo</small></div>
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
  const tpl = session.tpl;
  const c = countDone(draft, session);
  const rotate = new Date(mondayOf(S.prefs.start) + (S.cycle.cycle + 1) * CYCLE_WEEKS * 7 * 864e5)
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });

  const blocks = session.blocks.map((b) => {
    let bd = 0;
    const cards = b.items.map((it, i) => {
      const rows = rowsOf(it.slot, it.ex.id, b.sets);
      bd += rows.filter((s) => s.done).length;
      return exerciseCard(S, b, it, i, rows);
    }).join('');
    const bt = b.sets * b.items.length;
    return `<section class="block">
      <div class="bhead"><span class="bcode" aria-hidden="true">${b.code}</span>
        <div><div class="bt">${esc(b.title)}</div><div class="bs">Biserie · ${b.sets} rondas · descanso ${b.rest} s</div></div>
        <span class="bprog mono ${bd === bt ? 'full' : ''}">${bd}/${bt}</span></div>
      <div class="pair">${cards}</div>
    </section>`;
  }).join('');

  return `
  <div class="modes" role="group" aria-label="Tipo de sesión">${modeTabs(S)}</div>
  <p class="mode-hint">${esc(MODES[S.mode].hint)}</p>
  <div class="variants" role="group" aria-label="Variante">${variantChips(S)}</div>

  <div class="head">
    <h1>${esc(tpl.name)}</h1>
    <div class="meta">
      <span class="chip l">≈ ${estimateMinutes(tpl)} min</span>
      <span class="chip m">${esc(tpl.tag)}</span>
      <span class="chip p">Ciclo ${S.cycle.cycle + 1} · semana ${S.cycle.week}/${CYCLE_WEEKS}</span>
    </div>
    <p class="why">Los ejercicios se mantienen durante el ciclo para que puedas superar tus marcas, y rotan el ${rotate}. Con el botón de flechas podés cambiar uno si la máquina está ocupada.</p>
  </div>

  <section class="card warm">
    <div class="sec-t"><h2>Calentamiento</h2><span>≈ 16 min</span></div>
    <div class="witems">${warmup(S, draft)}</div>
  </section>
  <div class="nocardio">Fin del cardio · sólo fuerza desde acá</div>
  ${blocks}
  ${closing(S, draft, c)}`;
}

export { countDone };
