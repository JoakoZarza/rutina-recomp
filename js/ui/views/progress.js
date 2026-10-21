/** Vista "Progreso": resumen, tendencia por ejercicio, historial, pautas y respaldo. */
import { EXERCISES, GROUPS, PATTERNS } from '../../data/exercises.js';
import { MODES, TPL } from '../../data/templates.js';
import { seriesFor, volume, fmtKg } from '../../core/progression.js';
import { esc, hmm, dayLabel } from '../dom.js';

function spark(pts) {
  const W = 96, H = 30, P = 3;
  if (pts.length < 2) {
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="gd" x1="0" y1="${H - P}" x2="${W}" y2="${H - P}"/><text x="${W}" y="${H / 2 + 3}" text-anchor="end">1 dato</text></svg>`;
  }
  const p = pts.slice(-10), mn = Math.min(...p), mx = Math.max(...p), rg = mx - mn || 1;
  const xy = p.map((v, i) => [P + (i * (W - 2 * P)) / (p.length - 1), H - P - ((v - mn) / rg) * (H - 2 * P)]);
  const line = xy.map((a) => a.map((n) => n.toFixed(1)).join(',')).join(' ');
  const last = xy[xy.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tendencia de la serie más pesada">
    <line class="gd" x1="0" y1="${H - P}" x2="${W}" y2="${H - P}"/>
    <polygon class="ar" points="${P},${H - P} ${line} ${last[0].toFixed(1)},${H - P}"/>
    <polyline class="ln" points="${line}"/><circle class="pt" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6"/></svg>`;
}

const sessionLabel = (h) => (h.tpl && TPL[h.tpl] ? TPL[h.tpl].name : h.mode ? MODES[h.mode]?.label : (h.day || '').toUpperCase());

export function renderProgress(S) {
  const { hist } = S;
  const now = Date.now();
  const week = hist.filter((h) => now - h.start < 7 * 864e5).length;
  const totalVol = hist.reduce((a, h) => a + volume(h.sets || {}), 0);

  const kpis = `<div class="kpis">
    <div class="kpi l"><b class="mono">${hist.length}</b><small>Sesiones</small></div>
    <div class="kpi m"><b class="mono">${week}<span class="of">/3</span></b><small>Últimos 7 días</small></div>
    <div class="kpi p"><b class="mono">${totalVol >= 1000 ? `${fmtKg(Math.round(totalVol / 100) / 10)}t` : fmtKg(Math.round(totalVol))}</b><small>Kg movidos</small></div>
  </div>`;

  const groups = Object.entries(GROUPS).map(([g, label]) => {
    const rows = EXERCISES.filter((e) => PATTERNS[e.pattern]?.group === g).map((e) => {
      const s = seriesFor(hist, e.id);
      if (!s.length) return '';
      const last = s[s.length - 1], best = Math.max(...s.map((x) => x.best));
      return `<button class="prow" data-act="info" data-ex="${e.id}">
        <div class="prow-t"><div class="n">${esc(e.name)}</div><div class="s">${s.length} ${s.length === 1 ? 'sesión' : 'sesiones'}</div></div>
        <div class="v mono">${fmtKg(last.top)} × ${last.topReps}<small>1RM est. ${fmtKg(Math.round(best * 2) / 2)}</small></div>
        ${spark(s.map((x) => x.top))}
      </button>`;
    }).join('');
    return rows ? `<section class="pgroup"><div class="sec-t"><h2>${esc(label)}</h2></div><div class="card list">${rows}</div></section>` : '';
  }).join('');

  const hrows = hist.length
    ? hist.slice().reverse().slice(0, 30).map((h) => {
      const sets = Object.values(h.sets || {}).flat().filter((s) => s.done).length;
      const del = S.pendingDel === h.id
        ? `<div class="row nowrap"><button class="btn-o d" id="dy-${h.id}" data-act="del-yes" data-id="${h.id}">Borrar</button><button class="btn-o" id="dn-${h.id}" data-act="del-no">No</button></div>`
        : `<button class="btn-o" id="d-${h.id}" data-act="del" data-id="${h.id}" aria-label="Borrar sesión">Borrar</button>`;
      return `<div class="hrow"><div class="hrow-t"><div class="t">${dayLabel(h.start)} · ${esc(sessionLabel(h))}</div>
        <div class="s mono">${sets} series · ${fmtKg(Math.round(volume(h.sets || {})))} kg · ${hmm((h.end || h.start) - h.start)} h</div></div>${del}</div>`;
    }).join('')
    : `<div class="empty"><b>Todavía no hay sesiones guardadas.</b><br>Anotá kg y reps en Entrenar y tocá “Terminar y guardar”: acá vas a ver tu progreso por ejercicio.</div>`;

  return `
  <div class="head"><h1>Progreso</h1>
    <p class="why">Serie más pesada de cada sesión y 1RM estimado (Epley). En recomposición, mantener o subir la fuerza mientras baja el peso corporal es la señal de que estás conservando músculo.</p></div>
  ${kpis}
  ${groups}
  <section class="pgroup"><div class="sec-t"><h2>Historial</h2><span>últimas 30</span></div><div class="card list">${hrows}</div></section>
  <section class="card tips">
    <div class="sec-t"><h2>Con tirzepatida</h2><span>pautas generales</span></div>
    <ul>
      <li>Priorizá proteína en cada comida: con menos apetito es lo primero que se queda corto, y es lo que protege el músculo.</li>
      <li>Si un día hay poca energía, sacá una serie por bloque antes que bajar el peso.</li>
      <li>Hidratación extra antes de entrenar; ante mareos, cortá la sesión.</li>
      <li>Dosis, ajustes y metas de proteína: con tu médico o nutricionista.</li>
    </ul>
  </section>
  <section class="pgroup"><div class="sec-t"><h2>Respaldo</h2><span>los datos viven sólo en este navegador</span></div>
    <div class="card pad">
      <div class="row"><button class="btn-o l" id="exp" data-act="export">Copiar datos</button><button class="btn-o p" id="imp" data-act="import">Importar</button></div>
      <textarea class="io" id="io" placeholder="Pegá acá un respaldo y tocá Importar" spellcheck="false"></textarea>
    </div></section>`;
}
