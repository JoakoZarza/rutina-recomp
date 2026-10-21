/**
 * Planificador: convierte una plantilla (patrones) en una sesión concreta
 * (ejercicios), según el ciclo de 4 semanas en curso.
 *
 * Por qué ciclos y no ejercicios nuevos cada día: la progresión de cargas
 * necesita repetir el mismo ejercicio varias semanas. Cada 4 semanas rota el
 * ejercicio de cada patrón; dentro del ciclo se mantiene para poder superarte.
 */
import { EX, POOL } from '../data/exercises.js';
import { TEMPLATES, TPL } from '../data/templates.js';

const WEEK_MS = 7 * 864e5;
export const CYCLE_WEEKS = 4;

/** Lunes 00:00 de la semana de `ts`. */
export function mondayOf(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function cycleInfo(start, now = Date.now()) {
  const week = Math.max(0, Math.floor((mondayOf(now) - mondayOf(start)) / WEEK_MS));
  return { cycle: Math.floor(week / CYCLE_WEEKS), week: (week % CYCLE_WEEKS) + 1 };
}

export const slotKey = (cycle, tplId, slot) => `${cycle}:${tplId}:${slot}`;

/** Variante que toca: alterna según cuántas sesiones de ese modo hay guardadas. */
export function nextTemplate(mode, hist) {
  const list = TEMPLATES[mode];
  const done = hist.filter((h) => h.mode === mode).length;
  return list[done % list.length];
}

/**
 * Arma la sesión. `swaps` son elecciones manuales del usuario, válidas para
 * todo el ciclo en esa plantilla y ese lugar.
 */
export function buildSession(tplId, cycle, swaps = {}) {
  const tpl = TPL[tplId];
  const used = new Set();
  const seen = {};

  const blocks = tpl.blocks.map((b) => ({
    ...b,
    items: b.slots.map((pattern, i) => {
      const slot = `${b.code}${i + 1}`;
      const occurrence = (seen[pattern] = (seen[pattern] ?? -1) + 1);
      const pool = POOL[pattern];
      let id = swaps[slotKey(cycle, tpl.id, slot)];

      if (!id || !pool.includes(id)) {
        let k = (cycle + tpl.salt + occurrence) % pool.length;
        for (let n = 0; n < pool.length && used.has(pool[k]); n++) k = (k + 1) % pool.length;
        id = pool[k];
      }
      used.add(id);
      return { slot, pattern, ex: EX[id] };
    }),
  }));

  return { tpl, blocks };
}

/** Duración estimada: ~45 s por serie + descanso por ronda + 3 min de armado por bloque. */
export function estimateMinutes(tpl) {
  const work = tpl.blocks.reduce((m, b) => m + (b.sets * (b.slots.length * 45 + b.rest)) / 60 + 3, 0);
  return Math.round((16 + work) / 5) * 5;
}

/** Alternativas del mismo patrón para ofrecer en "Cambiar ejercicio". */
export const alternatives = (pattern) => (POOL[pattern] || []).map((id) => EX[id]);
