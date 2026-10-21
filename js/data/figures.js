/**
 * Animaciones de ejercicios: dos poses clave (a = inicio, b = final) que el
 * motor (ui/figure.js) interpola en loop. Vista lateral, persona mirando a la
 * derecha, en un lienzo de 240 × 170 con el piso en y = 163.
 *
 * Ángulos en grados: 0 = arriba, 90 = derecha, 180 = abajo, 270 = izquierda.
 *
 * Pose:
 *   hip   [x, y]   cadera (raíz)
 *   t              ángulo del torso (cadera → hombro)
 *   hand  [x, y]   objetivo de la mano (absoluto), o
 *   hr    [f, u]   mano relativa al hombro en el marco del torso (adelante, arriba), o
 *   hang  true     brazos colgando en vertical
 *   foot  [x, y]   tobillo (absoluto) | fr [dx, dy] relativo a la cadera
 *   hand2 / foot2  miembros del lado lejano (por defecto = cercanos)
 *   ed / kd        sentido de flexión de codo / rodilla (+1 | -1)
 *   ft             ángulo del pie (por defecto 90, apoyado)
 *   al             escala del brazo (escorzo: brazo que apunta hacia la cámara)
 *
 * Vista frontal (view: 'front'): ab = abducción de brazos (0 abajo, 90 horizontal),
 * eb = flexión extra del codo, al = escala.
 *
 * Accesorios (props): equipo fijo en violeta, implemento en mostaza.
 */

const F = [112, 160];            // tobillo de pie
const ST = { hip: [110, 84], t: 0, foot: F };

const bench = (x, y, w, legs = true) => [
  { k: 'rect', p: [x, y, w, 5] },
  ...(legs ? [{ k: 'line', p: [x + 8, y + 5, x + 8, 163] }, { k: 'line', p: [x + w - 8, y + 5, x + w - 8, 163] }] : []),
];
const rail = (x) => ({ k: 'line', p: [x, 4, x, 163], dash: true });

/* Bases reutilizables */
const benchFlat = (props, a, b) => ({
  props: [...bench(46, 120, 108), ...props],
  a: { hip: [124, 113], t: 270, foot: [160, 160], ft: 80, ...a },
  b: { hip: [124, 113], t: 270, foot: [160, 160], ft: 80, ...b },
});
const benchIncline = (props, a, b) => ({
  props: [{ k: 'line', p: [126, 124, 66, 90] }, { k: 'line', p: [114, 124, 150, 124] }, { k: 'line', p: [118, 124, 118, 163] }, ...props],
  a: { hip: [118, 117], t: 300, foot: [156, 160], ...a },
  b: { hip: [118, 117], t: 300, foot: [156, 160], ...b },
});
const seated = (props, a, b) => ({
  props: [{ k: 'rect', p: [88, 123, 40, 5] }, { k: 'line', p: [102, 123, 102, 56] }, { k: 'line', p: [108, 128, 108, 163] }, ...props],
  a: { hip: [110, 118], t: 0, foot: [150, 160], ...a },
  b: { hip: [110, 118], t: 0, foot: [150, 160], ...b },
});
const chestSupported = (props, a, b) => ({
  props: [{ k: 'line', p: [104, 104, 144, 64] }, { k: 'line', p: [118, 90, 118, 163] }, ...props],
  a: { hip: [100, 95], t: 45, foot: [64, 160], ...a },
  b: { hip: [100, 95], t: 45, foot: [64, 160], ...b },
});
const squat = (props, ha, hb, extra = {}) => ({
  props,
  a: { hip: [106, 84], t: 4, foot: F, ...ha },
  b: { hip: [80, 121], t: 44, foot: F, ...hb },
  ...extra,
});
const hipThrust = (props, a = {}, b = {}) => ({
  props: [...bench(20, 129, 48), ...props],
  a: { hip: [105, 145], t: 296, hand: [108, 141], foot: [150, 160], ...a },
  b: { hip: [110, 123], t: 270, hand: [112, 118], foot: [150, 160], ...b },
});

export const FIGURES = {
  /* ---------- Sentadillas ---------- */
  squat_back:   squat([{ k: 'plate', at: 'hand' }], { hr: [-9, 1], ed: -1 }, { hr: [-9, 1], ed: -1 }),
  squat_smith:  squat([rail(100), { k: 'plate', at: 'hand' }], { hr: [-9, 1], ed: -1 }, { hr: [-9, 1], ed: -1 }),
  squat_front:  squat([{ k: 'plate', at: 'hand' }], { hr: [3, 1] }, { hip: [88, 124], t: 22, hr: [3, 1] }),
  squat_goblet: squat([{ k: 'db', at: 'hand' }], { hr: [10, -12] }, { hip: [88, 124], t: 22, hr: [10, -12] }),

  /* ---------- Bisagra ---------- */
  rdl_bar: { props: [{ k: 'plate', at: 'hand' }], a: { ...ST, hang: true }, b: { hip: [84, 92], t: 74, hand: [124, 128], foot: F } },
  rdl_db:  { props: [{ k: 'db', at: 'hand' }],    a: { ...ST, hang: true }, b: { hip: [84, 92], t: 74, hand: [124, 128], foot: F } },
  deadlift: { props: [{ k: 'plate', at: 'hand' }],
    a: { hip: [84, 124], t: 50, hand: [118, 144], foot: F }, b: { ...ST, hang: true } },

  /* ---------- Unilateral ---------- */
  bulgarian: { props: [...bench(30, 128, 44), { k: 'db', at: 'hand' }],
    a: { hip: [120, 86], t: 6, hang: true, foot: [138, 160], foot2: [60, 126], ft2: 270 },
    b: { hip: [100, 118], t: 12, hang: true, foot: [138, 160], foot2: [60, 126], ft2: 270 } },
  split: { props: [{ k: 'db', at: 'hand' }],
    a: { hip: [106, 90], t: 4, hang: true, foot: [140, 160], foot2: [64, 156], ft2: 130 },
    b: { hip: [100, 120], t: 6, hang: true, foot: [140, 160], foot2: [64, 156], ft2: 130 } },
  stepup: { props: [{ k: 'rect', p: [118, 137, 46, 26] }, { k: 'db', at: 'hand' }],
    a: { hip: [106, 100], t: 16, hang: true, foot: [138, 135], foot2: [96, 160] },
    b: { hip: [130, 58], t: 2, hang: true, foot: [138, 135], foot2: [124, 112] } },

  /* ---------- Máquinas de pierna ---------- */
  legext: { props: [{ k: 'rect', p: [64, 122, 76, 6] }, { k: 'line', p: [86, 122, 78, 62] }, { k: 'line', p: [100, 128, 100, 163] },
                    { k: 'line', p: [140, 125, 150, 163] }, { k: 'pad', at: 'foot' }],
    a: { hip: [100, 116], t: 352, hand: [103, 117], foot: [142, 156] },
    b: { hip: [100, 116], t: 352, hand: [103, 117], foot: [178, 110], ft: 10 } },
  hipthrust_machine: hipThrust([{ k: 'lever', from: [172, 64], at: 'hip' }, { k: 'line', p: [172, 64, 172, 163] }, { k: 'pad', at: 'hip', r: 7 }]),
  hipthrust_bar:     hipThrust([{ k: 'plate', at: 'hip', dy: -9 }]),
  hipthrust_single:  hipThrust([], { foot2: [146, 120] }, { foot2: [152, 96] }),
  bridge: { props: [],
    a: { hip: [100, 152], t: 270, hand: [80, 160], foot: [146, 160] },
    b: { hip: [104, 134], t: 251, hand: [80, 160], foot: [146, 160] } },
  calf_smith: { props: [rail(100), { k: 'rect', p: [115, 152, 40, 11] }, { k: 'plate', at: 'hand' }],
    a: { hip: [110, 77], t: 0, hr: [-9, 1], ed: -1, foot: [112, 156], ft: 62 },
    b: { hip: [112, 63], t: 0, hr: [-9, 1], ed: -1, foot: [114, 142], ft: 125 } },
  calf_db: { props: [{ k: 'rect', p: [115, 152, 40, 11] }, { k: 'db', at: 'hand' }],
    a: { hip: [110, 77], t: 0, hang: true, foot: [112, 156], ft: 62 },
    b: { hip: [112, 63], t: 0, hang: true, foot: [114, 142], ft: 125 } },

  /* ---------- Press acostado ---------- */
  bench_bar:   benchFlat([{ k: 'plate', at: 'hand' }], { hand: [78, 58] }, { hand: [85, 103], al: 0.6 }),
  bench_db:    benchFlat([{ k: 'db', at: 'hand' }],    { hand: [78, 58] }, { hand: [85, 103], al: 0.6 }),
  bench_smith: benchFlat([rail(81), { k: 'plate', at: 'hand' }], { hand: [80, 58] }, { hand: [82, 103], al: 0.6 }),
  bench_conv:  benchFlat([{ k: 'lever', from: [30, 14], at: 'hand' }, { k: 'pad', at: 'hand', r: 4 }], { hand: [80, 60] }, { hand: [88, 104], al: 0.6 }),
  fly_flat:    benchFlat([{ k: 'db', at: 'hand' }], { hand: [76, 60] }, { hand: [74, 124], al: 0.55 }),
  incline_bar:  benchIncline([{ k: 'plate', at: 'hand' }], { hand: [78, 38] }, { hand: [88, 86], al: 0.6 }),
  incline_db:   benchIncline([{ k: 'db', at: 'hand' }],    { hand: [78, 38] }, { hand: [88, 86], al: 0.6 }),
  incline_conv: benchIncline([{ k: 'lever', from: [24, -8], at: 'hand' }, { k: 'pad', at: 'hand', r: 4 }], { hand: [80, 40] }, { hand: [90, 88], al: 0.6 }),
  fly_incline:  benchIncline([{ k: 'db', at: 'hand' }], { hand: [78, 40] }, { hand: [76, 102], al: 0.55 }),
  decline_bar: { props: [{ k: 'line', p: [134, 110, 66, 138] }, { k: 'line', p: [100, 126, 100, 163] }, { k: 'pad', at: 'foot', r: 5 }, { k: 'plate', at: 'hand' }],
    a: { hip: [122, 104], t: 244, hand: [80, 72], foot: [150, 128] },
    b: { hip: [122, 104], t: 244, hand: [92, 118], al: 0.6, foot: [150, 128] } },
  pullover: { props: [...bench(50, 128, 40), { k: 'db', at: 'hand' }],
    a: { hip: [116, 132], t: 282, hand: [22, 124], foot: [160, 160] },
    b: { hip: [116, 132], t: 282, hand: [72, 70], foot: [160, 160] } },
  skull: benchFlat([{ k: 'plate', at: 'hand', r: 7 }], { hand: [70, 60] }, { hand: [50, 84] }),

  /* ---------- Press vertical ---------- */
  ohp_seated_db:    seated([{ k: 'db', at: 'hand' }], { hr: [6, 6], al: 0.7 }, { hr: [2, 52] }),
  ohp_smith:        seated([rail(118), { k: 'plate', at: 'hand' }], { hr: [8, 4], al: 0.7 }, { hr: [6, 52] }),
  ohp_standing_bar: { props: [{ k: 'plate', at: 'hand' }], a: { ...ST, hr: [6, 6], al: 0.7 }, b: { ...ST, hr: [2, 52] } },

  /* ---------- Tracciones ---------- */
  pullup: { props: [{ k: 'line', p: [70, -8, 170, -8] }, { k: 'line', p: [74, -8, 74, 163] }, { k: 'line', p: [166, -8, 166, 163] }],
    a: { hip: [118, 98], t: 356, hand: [118, -6], fr: [-30, 30] },
    b: { hip: [110, 58], t: 356, hand: [118, -6], fr: [-30, 30] } },
  pullup_band: { props: [{ k: 'line', p: [70, -8, 170, -8] }, { k: 'line', p: [74, -8, 74, 163] }, { k: 'line', p: [166, -8, 166, 163] }, { k: 'band', from: [118, -6], at: 'knee' }],
    a: { hip: [118, 98], t: 356, hand: [118, -6], fr: [-30, 30] },
    b: { hip: [110, 58], t: 356, hand: [118, -6], fr: [-30, 30] } },
  row_bar: { props: [{ k: 'plate', at: 'hand' }],
    a: { hip: [84, 92], t: 74, hand: [124, 128], foot: F }, b: { hip: [84, 92], t: 74, hand: [114, 106], foot: F } },
  row_one: { props: [...bench(158, 120, 44), { k: 'db', at: 'hand' }],
    a: { hip: [92, 88], t: 84, hand: [138, 134], hand2: [178, 120], foot: [110, 160] },
    b: { hip: [92, 88], t: 84, hand: [122, 104], hand2: [178, 120], foot: [110, 160] } },
  row_chest: chestSupported([{ k: 'db', at: 'hand' }], { hang: true }, { hand: [118, 88] }),
  reverse_fly: chestSupported([{ k: 'db', at: 'hand' }], { hang: true }, { hand: [140, 64], al: 0.4 }),
  curl_spider: chestSupported([{ k: 'plate', at: 'hand', r: 6 }], { hang: true }, { hand: [150, 70] }),
  row_inverted: { props: [rail(70), { k: 'line', p: [56, 52, 100, 52] }],
    a: { hip: [120, 122], t: 290, hand: [78, 52], foot: [196, 152], ft: 0 },
    b: { hip: [126, 106], t: 298, hand: [78, 52], foot: [196, 152], ft: 0 } },
  facepull: { props: [{ k: 'line', p: [212, 4, 212, 163] }, { k: 'band', from: [210, 36], at: 'hand' }],
    a: { ...ST, hand: [160, 38] }, b: { ...ST, hand: [126, 30], ed: -1, al: 0.8 } },

  /* ---------- Brazos ---------- */
  curl_bar: { props: [{ k: 'plate', at: 'hand', r: 6 }], a: { ...ST, hand: [115, 85] }, b: { ...ST, hand: [124, 46] } },
  curl_db:  { props: [{ k: 'db', at: 'hand' }],          a: { ...ST, hand: [115, 85] }, b: { ...ST, hand: [124, 46] } },
  curl_incline: { props: [{ k: 'line', p: [124, 124, 82, 64] }, { k: 'line', p: [112, 126, 150, 126] }, { k: 'line', p: [118, 126, 118, 163] }, { k: 'db', at: 'hand' }],
    a: { hip: [112, 122], t: 332, hand: [86, 128], foot: [152, 160] },
    b: { hip: [112, 122], t: 332, hand: [100, 86], foot: [152, 160] } },
  curl_conc: { props: [{ k: 'rect', p: [76, 123, 44, 5] }, { k: 'line', p: [84, 128, 84, 163] }, { k: 'line', p: [112, 128, 112, 163] }, { k: 'db', at: 'hand' }],
    a: { hip: [100, 118], t: 38, hand: [134, 130], foot: [150, 160] },
    b: { hip: [100, 118], t: 38, hand: [136, 92], foot: [150, 160] } },
  ohext: seated([{ k: 'db', at: 'hand' }], { hand: [100, 58] }, { hand: [112, 16] }),
  kickback: { props: [...bench(150, 112, 50), { k: 'db', at: 'hand' }],
    a: { hip: [90, 90], t: 78, hand: [132, 104], hand2: [170, 112], foot: F },
    b: { hip: [90, 90], t: 78, hand: [88, 82], hand2: [170, 112], foot: F } },
  benchdip: { props: [...bench(38, 110, 46)],
    a: { hip: [94, 112], t: 356, hand: [82, 108], foot: [172, 158], ft: 10 },
    b: { hip: [95, 140], t: 356, hand: [82, 108], foot: [172, 158], ft: 10 } },

  /* ---------- Core ---------- */
  vup: { props: [],
    a: { hip: [110, 156], t: 270, hand: [10, 154], foot: [190, 158], ft: 0 },
    b: { hip: [112, 154], t: 318, hand: [124, 100], foot: [158, 92], ft: 30 } },
  sideplank: { props: [],
    a: { hip: [124, 138], t: 291, hand: [98, 160], foot: [202, 160], ft: 0 },
    b: { hip: [124, 133], t: 289, hand: [98, 160], foot: [202, 160], ft: 0 } },
  plank: { props: [],
    a: { hip: [126, 139], t: 283, hand: [98, 160], foot: [204, 160], ft: 160 },
    b: { hip: [126, 134], t: 281, hand: [98, 160], foot: [204, 160], ft: 160 } },
  deadbug: { props: [],
    a: { hip: [110, 152], t: 270, hand: [64, 100], hand2: [64, 100], foot: [150, 112], foot2: [150, 112], ft: 30 },
    b: { hip: [110, 152], t: 270, hand: [14, 146], hand2: [64, 100], foot: [188, 146], foot2: [150, 112], ft: 30 } },
  pallof: { props: [{ k: 'line', p: [214, 4, 214, 163] }, { k: 'band', from: [212, 70], at: 'hand' }],
    a: { ...ST, hr: [12, -26] }, b: { ...ST, hr: [50, -26] } },

  /* ---------- Vista frontal ---------- */
  latraise_db:   { view: 'front', props: [{ k: 'db', at: 'hand' }, { k: 'db', at: 'hand2' }], a: { ab: 8, eb: 0 }, b: { ab: 86, eb: 10 } },
  latraise_band: { view: 'front', props: [{ k: 'band', from: [120, 160], at: 'hand' }, { k: 'band', from: [120, 160], at: 'hand2' }], a: { ab: 8, eb: 0 }, b: { ab: 84, eb: 10 } },
  pullapart:     { view: 'front', props: [{ k: 'band', from: 'hand2', at: 'hand' }], a: { ab: 90, eb: 0, al: -0.32 }, b: { ab: 90, eb: 0, al: 1 } },
};
