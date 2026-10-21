/**
 * Persistencia en LocalStorage. Todas las lecturas y escrituras toleran que el
 * almacenamiento no exista (modo privado, datos borrados): la app sigue andando.
 */

const KEYS = {
  history: 'recomp.history.v1',  // mismo formato que la versión anterior
  drafts:  'recomp.drafts.v2',
  prefs:   'recomp.prefs.v1',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Historial: [{ id, mode, tpl, start, end, sets: { exId: [{ kg, reps, done }] } }]
 * Las sesiones de la v1 traen `day` en lugar de `mode`; se leen igual.
 */
export const history = {
  all() {
    const h = read(KEYS.history, []);
    return Array.isArray(h) ? h : [];
  },
  save(list) { return write(KEYS.history, list); },
};

/** Borradores por modo: { mix: { tpl, start, warm, slots } } */
export const drafts = {
  all() {
    const d = read(KEYS.drafts, {});
    return d && typeof d === 'object' ? d : {};
  },
  save(obj) { return write(KEYS.drafts, obj); },
};

/** Preferencias: { start (ms del primer uso), swaps: { "ciclo:tpl:slot": exId } } */
export const prefs = {
  get() {
    const p = read(KEYS.prefs, {});
    return { start: null, swaps: {}, ...p };
  },
  save(p) { return write(KEYS.prefs, p); },
};
