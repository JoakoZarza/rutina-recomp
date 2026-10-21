/**
 * Ficha del ejercicio (botón i): figura animada, cómo hacerlo, cómo progresar
 * y, si se abre desde una sesión, alternativas del mismo patrón para cambiarlo.
 */
import { EX, PATTERNS } from '../data/exercises.js';
import { alternatives } from '../core/planner.js';
import { lastFor, fmtKg, num } from '../core/progression.js';
import { $, esc, ICON } from './dom.js';
import { playFigure, figureStatic } from './figure.js';

let stop = () => {};

function progressionText(ex) {
  const per = ex.per === 'mano' ? ' Los kg se anotan por mancuerna.' : ex.per === 'lado' ? ' Las reps se anotan por lado.' : '';
  const step = ex.inc ? `sumá ${fmtKg(ex.inc)} kg` : ex.incText.toLowerCase();
  return `Trabajá entre ${ex.lo} y ${ex.hi} reps con el mismo peso. Cuando completes ${ex.hi} en todas las series, ${step} y volvé a ${ex.lo}.${per}`;
}

/**
 * @param {string} exId
 * @param {{hist: any[], slot?: string, current?: string}} ctx  slot presente = permite cambiar
 */
export function openInfo(exId, ctx) {
  const ex = EX[exId];
  const dlg = $('#info');
  const last = lastFor(ctx.hist, ex.id);
  const lastTxt = last
    ? last.sets.filter((s) => s.done).map((s) => `${fmtKg(num(s.kg))}×${esc(s.reps)}`).join(' · ')
    : '';

  const alts = ctx.slot
    ? alternatives(ex.pattern).map((a) => `
        <button class="alt ${a.id === ctx.current ? 'on' : ''}" id="alt-${a.id}" data-act="swap" data-slot="${ctx.slot}" data-ex="${a.id}" ${a.id === ctx.current ? 'aria-current="true"' : ''}>
          <span class="alt-fig">${figureStatic(a.fig)}</span>
          <span class="alt-t"><b>${esc(a.name)}</b><small>${esc(a.eq)}</small></span>
        </button>`).join('')
    : '';

  $('#infoBody').innerHTML = `
    <header class="info-h">
      <div><span class="eyebrow">${esc(PATTERNS[ex.pattern]?.label || 'Calentamiento')}</span><h2 id="infoTitle">${esc(ex.name)}</h2></div>
      <button class="icon-btn" id="infoClose" data-act="info-close" aria-label="Cerrar">${ICON.close}</button>
    </header>
    <div class="stage"><svg class="fig" id="infoFig" viewBox="0 -30 240 200" role="img" aria-label="Animación de ${esc(ex.name)}"></svg></div>
    <div class="meta">
      <span class="chip p">${esc(ex.eq)}</span><span class="chip l">${esc(ex.reps)} reps</span>
    </div>
    <p class="muscles"><span>Trabaja</span> ${esc(ex.muscles)}</p>
    <h3 class="info-s">Cómo hacerlo</h3>
    <ol class="how">${ex.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
    ${ex.pattern !== 'warm' ? `<h3 class="info-s">Cómo progresar</h3><p class="prog">${progressionText(ex)}</p>` : ''}
    ${lastTxt ? `<p class="last"><span>Última vez</span> <span class="mono">${lastTxt}</span></p>` : ''}
    ${alts ? `<h3 class="info-s">Cambiar por</h3><p class="alts-hint">El cambio queda para lo que resta del ciclo, así podés seguir la progresión.</p><div class="alts">${alts}</div>` : ''}
  `;

  stop();
  stop = playFigure($('#infoFig'), ex.fig);
  if (!dlg.open) dlg.showModal();
  $('#infoBody').scrollTop = 0;
}

export function closeInfo() {
  const dlg = $('#info');
  if (dlg.open) dlg.close();
}

export function initInfo() {
  const dlg = $('#info');
  dlg.addEventListener('close', () => { stop(); stop = () => {}; });
  // Tocar fuera del panel cierra.
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}
