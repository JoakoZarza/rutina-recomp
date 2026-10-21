/**
 * Plantillas de sesión por modo. Cada bloque es una biserie: dos patrones que
 * no compiten entre sí (o el mismo grupo, como en el día del profe), con un
 * único descanso al cerrar la ronda.
 *
 * Cada modo tiene dos variantes que se alternan solas según el historial, así
 * dos sesiones de "Superior" en la misma semana no repiten estímulo.
 * Los ejercicios concretos salen del pool según el ciclo (ver planner.js).
 */

export const MODES = {
  mix: { label: 'Mixto',    short: 'MIX', hint: 'Cuerpo completo. El día base del profe.' },
  sup: { label: 'Superior', short: 'SUP', hint: 'Torso y brazos. Para cuando las piernas vienen cargadas del CrossFit.' },
  inf: { label: 'Inferior', short: 'INF', hint: 'Piernas y glúteos, con core entre series.' },
};

/** Día de semana (0 = domingo) → modo sugerido. Lun / Mié / Vie-Sáb. */
export const WEEK_SUGGESTION = { 1: 'mix', 2: 'sup', 3: 'sup', 4: 'inf', 5: 'inf', 6: 'inf', 0: 'mix' };

const B = (code, title, slots, sets, rest) => ({ code, title, slots, sets, rest });

export const TEMPLATES = {
  mix: [
    { id: 'mix1', name: 'Mixto A', tag: 'Rutina base del profe', salt: 0,
      blocks: [
        B('A', 'Cuádriceps',        ['squat', 'quad'],       4, 120),
        B('B', 'Pecho',             ['hpush', 'chestiso'],   4, 90),
        B('C', 'Bíceps',            ['biceps', 'biceps'],    4, 60),
      ] },
    { id: 'mix2', name: 'Mixto B', tag: 'Cadena posterior + tirón', salt: 1,
      blocks: [
        B('A', 'Femoral y dorsales', ['hinge', 'vpull'],     4, 120),
        B('B', 'Pierna y hombro',    ['single', 'vpush'],    3, 90),
        B('C', 'Glúteo y espalda',   ['glute', 'hrow'],      3, 90),
        B('D', 'Tríceps y hombro',   ['triceps', 'latdelt'], 3, 60),
      ] },
  ],
  sup: [
    { id: 'sup1', name: 'Superior A', tag: 'Empuje horizontal · tirón vertical', salt: 0,
      blocks: [
        B('A', 'Pecho y dorsales',   ['hpush', 'vpull'],      4, 120),
        B('B', 'Hombro y espalda',   ['vpush', 'hrow'],       4, 90),
        B('C', 'Pecho y posterior',  ['chestiso', 'reardelt'],3, 60),
        B('D', 'Brazos',             ['biceps', 'triceps'],   3, 60),
      ] },
    { id: 'sup2', name: 'Superior B', tag: 'Empuje inclinado · tirón horizontal', salt: 1,
      blocks: [
        B('A', 'Pecho alto y espalda', ['incpush', 'hrow'],   4, 120),
        B('B', 'Dorsales y hombro',    ['vpull', 'vpush'],    4, 90),
        B('C', 'Hombros',              ['latdelt', 'reardelt'],3, 60),
        B('D', 'Brazos',               ['biceps', 'triceps'], 3, 60),
      ] },
  ],
  inf: [
    { id: 'inf1', name: 'Inferior A', tag: 'Foco cuádriceps', salt: 0,
      blocks: [
        B('A', 'Sentadilla + core',   ['squat', 'core'],      4, 150),
        B('B', 'Femoral y gemelo',    ['hinge', 'calf'],      3, 120),
        B('C', 'Unilateral y cuádriceps', ['single', 'quad'], 3, 90),
      ] },
    { id: 'inf2', name: 'Inferior B', tag: 'Foco cadera y glúteo', salt: 1,
      blocks: [
        B('A', 'Bisagra + core',      ['hinge', 'core'],      4, 150),
        B('B', 'Glúteo y gemelo',     ['glute', 'calf'],      4, 90),
        B('C', 'Unilateral y cuádriceps', ['single', 'quad'], 3, 90),
      ] },
  ],
};

export const TPL = Object.fromEntries(Object.values(TEMPLATES).flat().map((t) => [t.id, t]));

/** Calentamiento: siempre 10 min de bici o caminadora y nada de cardio después. */
export const WARMUPS = {
  mix: [
    { t: 'Bicicleta', s: '10 min, ritmo suave a moderado', timer: 600 },
    { t: 'V-ups cruzados', s: '2 rondas × 40', ex: 'vups' },
    { t: 'Plancha lateral', s: '2 rondas × 30 s por lado', timer: 30, ex: 'sideplank' },
  ],
  sup: [
    { t: 'Bicicleta o caminadora', s: '10 min, ritmo suave a moderado', timer: 600 },
    { t: 'Separaciones con elástico', s: '2 rondas × 20', ex: 'pullapart' },
    { t: 'V-ups cruzados', s: '2 rondas × 30', ex: 'vups' },
  ],
  inf: [
    { t: 'Bicicleta', s: '10 min, ritmo suave', timer: 600 },
    { t: 'Puente de glúteo en el piso', s: '2 rondas × 15', ex: 'gbridge' },
    { t: 'Sentadilla goblet liviana', s: '1 ronda × 10, sólo para movilidad', ex: 'goblet' },
  ],
};
