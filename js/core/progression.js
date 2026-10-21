/**
 * Doble progresión: se trabaja dentro de un rango de reps (ej. 8–12) con el
 * mismo peso. Cuando todas las series llegan al tope del rango, se sube el peso
 * y se vuelve al piso del rango.
 */

export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export const fmtKg = (n) =>
  n == null || n === '' ? '' : Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });

/** Última sesión guardada con al menos una serie hecha de este ejercicio. */
export function lastFor(hist, exId) {
  for (let i = hist.length - 1; i >= 0; i--) {
    const sets = hist[i].sets?.[exId];
    if (sets?.some((s) => s.done)) return { date: hist[i].start, sets };
  }
  return null;
}

export function suggest(ex, nSets, hist) {
  const last = lastFor(hist, ex.id);
  if (!last) {
    return { kind: 'first', html: `Primera vez · ${ex.reps} reps con 2 en reserva` };
  }
  const done = last.sets.filter((s) => s.done);
  const top = Math.max(...done.map((s) => num(s.kg) || 0));
  const reachedTop = done.length >= nSets && done.every((s) => (num(s.reps) || 0) >= ex.hi);

  if (reachedTop) {
    const next = ex.inc ? `<b class="mono">${fmtKg(top + ex.inc)} kg</b>` : `<b>${ex.incText}</b>`;
    return { kind: 'up', html: `Meta ${next} × ${ex.lo}+` };
  }
  const total = done.reduce((a, s) => a + (num(s.reps) || 0), 0);
  return { kind: 'same', html: `Meta <b class="mono">${fmtKg(top)} kg</b> · más de ${total} reps` };
}

export function volume(sets) {
  let v = 0;
  for (const id in sets) for (const s of sets[id]) if (s.done) v += (num(s.kg) || 0) * (num(s.reps) || 0);
  return v;
}

/** 1RM estimado (Epley). */
export const e1rm = (kg, reps) => kg * (1 + reps / 30);

/** Serie más pesada y mejor 1RM por sesión, en orden cronológico. */
export function seriesFor(hist, exId) {
  const out = [];
  for (const h of hist) {
    const sets = (h.sets?.[exId] || []).filter((s) => s.done);
    if (!sets.length) continue;
    let top = 0, topReps = 0, best = 0;
    for (const s of sets) {
      const kg = num(s.kg) || 0, r = num(s.reps) || 0;
      if (kg > top || (kg === top && r > topReps)) { top = kg; topReps = r; }
      best = Math.max(best, e1rm(kg, r));
    }
    out.push({ date: h.start, top, topReps, best });
  }
  return out;
}
