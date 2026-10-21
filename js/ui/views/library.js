/** Vista "Ejercicios": todo el pool agrupado por patrón, con miniatura. */
import { EXERCISES, GROUPS, PATTERNS } from '../../data/exercises.js';
import { esc } from '../dom.js';
import { figureStatic } from '../figure.js';

export function renderLibrary(S) {
  const q = (S.query || '').trim().toLowerCase();
  const match = (e) => !q || `${e.name} ${e.eq} ${e.muscles}`.toLowerCase().includes(q);

  const sections = Object.entries(GROUPS).map(([g, label]) => {
    const patterns = Object.entries(PATTERNS).filter(([, p]) => p.group === g);
    const body = patterns.map(([pid, p]) => {
      const items = EXERCISES.filter((e) => e.pattern === pid && match(e));
      if (!items.length) return '';
      return `<div class="lib-pat"><h3>${esc(p.label)}</h3><div class="lib-grid">
        ${items.map((e) => `<button class="lib-card" data-act="info" data-ex="${e.id}">
          <span class="lib-fig">${figureStatic(e.fig)}</span>
          <span class="lib-t"><b>${esc(e.name)}</b><small>${esc(e.eq)}</small></span>
        </button>`).join('')}
      </div></div>`;
    }).join('');
    return body ? `<section class="pgroup"><div class="sec-t"><h2>${esc(label)}</h2></div>${body}</section>` : '';
  }).join('');

  return `
  <div class="head"><h1>Ejercicios</h1>
    <p class="why">El pool del que salen tus sesiones, sólo con el equipamiento de tu gimnasio. Tocá cualquiera para ver el movimiento.</p></div>
  <label class="search"><span class="sr">Buscar ejercicio</span>
    <input id="q" type="search" data-act-input="search" placeholder="Buscar por nombre, equipo o músculo" value="${esc(S.query || '')}" autocomplete="off"></label>
  ${sections || '<div class="empty">Ningún ejercicio coincide con la búsqueda.</div>'}`;
}
