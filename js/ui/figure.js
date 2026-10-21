/**
 * Motor de figuras: resuelve poses con cinemática inversa de dos huesos y
 * dibuja un muñeco de líneas en SVG. Las animaciones viven en data/figures.js.
 */
import { FIGURES } from '../data/figures.js';

const D2R = Math.PI / 180;
const LEN = { trunk: 50, head: 15, ua: 27, fa: 25, th: 40, sh: 40, foot: 12 };
const GROUND = 163;

const seg = (p, a, l) => [p[0] + Math.sin(a * D2R) * l, p[1] - Math.cos(a * D2R) * l];
const angTo = (p, q) => Math.atan2(q[0] - p[0], -(q[1] - p[1])) / D2R;
const lerp = (a, b, u) => a + (b - a) * u;
const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

/** IK de dos huesos: devuelve [articulación, extremo]. `s` elige el lado de flexión. */
function ik(root, target, l1, l2, s) {
  let d = Math.hypot(target[0] - root[0], target[1] - root[1]);
  d = Math.min(Math.max(d, 1e-3), l1 + l2 - 1e-3);
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const off = Math.acos(Math.max(-1, Math.min(1, c))) / D2R;
  const joint = seg(root, angTo(root, target) + s * off, l1);
  return [joint, seg(joint, angTo(joint, target), l2)];
}

/** Hombro y puntos derivados de una pose (sin interpolar). */
const shoulderOf = (p) => seg(p.hip, p.t, LEN.trunk);
const frame = (S, t, [f, u]) => seg(seg(S, t + 90, f), t, u);

function handTarget(p, S, al, which) {
  const own = which === 2 ? p.hand2 : null;
  if (own) return own;
  if (p.hand) return p.hand;
  if (p.hr) return frame(S, p.t, p.hr);
  return [S[0] + 4, S[1] + (LEN.ua + LEN.fa) * al - 2]; // hang
}
const footTarget = (p, which) => (which === 2 && p.foot2) || p.foot || [p.hip[0] + p.fr[0], p.hip[1] + p.fr[1]];

/** Interpola dos poses laterales y devuelve el esqueleto. */
function sideSkeleton(a, b, u) {
  const hip = lerp2(a.hip, b.hip, u);
  const t = lerp(a.t, b.t, u);
  const al = lerp(a.al ?? 1, b.al ?? 1, u);
  const S = seg(hip, t, LEN.trunk);
  const head = seg(S, t, LEN.head);
  const ed = b.ed ?? a.ed ?? 1;
  const kd = b.kd ?? a.kd ?? -1;

  const hand = (which) => {
    if (a.hr && b.hr && !(which === 2 && (a.hand2 || b.hand2))) return frame(S, t, lerp2(a.hr, b.hr, u));
    if (a.hang && b.hang && !(which === 2 && (a.hand2 || b.hand2))) return [S[0] + 4, S[1] + (LEN.ua + LEN.fa) * al - 2];
    return lerp2(handTarget(a, shoulderOf(a), a.al ?? 1, which), handTarget(b, shoulderOf(b), b.al ?? 1, which), u);
  };
  const foot = (which) => {
    if (a.fr && b.fr && !(which === 2 && (a.foot2 || b.foot2))) return [hip[0] + lerp(a.fr[0], b.fr[0], u), hip[1] + lerp(a.fr[1], b.fr[1], u)];
    return lerp2(footTarget(a, which), footTarget(b, which), u);
  };
  const limb = (which) => {
    const [E, W] = ik(S, hand(which), LEN.ua * al, LEN.fa * al, ed);
    const [K, A] = ik(hip, foot(which), LEN.th, LEN.sh, kd);
    const ftA = which === 2 ? a.ft2 ?? a.ft : a.ft;
    const ftB = which === 2 ? b.ft2 ?? b.ft : b.ft;
    const ft = lerp(ftA ?? 90, ftB ?? 90, u);
    return { E, W, K, A, toe: seg(A, ft, LEN.foot), heel: seg(A, ft + 180, 3) };
  };
  return { hip, S, head, near: limb(1), far: limb(2) };
}

/** Vista frontal simétrica (elevaciones laterales, separaciones). */
function frontSkeleton(a, b, u) {
  const ab = lerp(a.ab, b.ab, u), eb = lerp(a.eb ?? 0, b.eb ?? 0, u), al = lerp(a.al ?? 1, b.al ?? 1, u);
  const cx = 120, sy = 38, hy = 86;
  const arm = (side) => {
    const S = [cx + side * 18, sy];
    const dir = side > 0 ? 180 - ab : 180 + ab;
    const E = seg(S, dir, LEN.ua * al);
    const W = seg(E, side > 0 ? dir - eb : dir + eb, LEN.fa * al);
    return { S, E, W };
  };
  const leg = (side) => ({ H: [cx + side * 8, hy], K: [cx + side * 10, 123], A: [cx + side * 12, 160] });
  return { front: true, head: [cx, sy - 15], neck: [cx, sy], pelvis: [cx, hy], r: arm(1), l: arm(-1), rl: leg(1), ll: leg(-1) };
}

function skeleton(fig, u) {
  return fig.view === 'front' ? frontSkeleton(fig.a, fig.b, u) : sideSkeleton(fig.a, fig.b, u);
}

/* ---------------- Dibujo ---------------- */
const f1 = (n) => n.toFixed(1);
const line = (p, q, cls) => `<line class="${cls}" x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}"/>`;
const poly = (pts, cls) => `<polyline class="${cls}" points="${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')}"/>`;

function anchor(sk, at) {
  if (Array.isArray(at)) return at;
  if (sk.front) return { hand: sk.r.W, hand2: sk.l.W, hip: sk.pelvis }[at];
  return { hand: sk.near.W, hand2: sk.far.W, hip: sk.hip, knee: sk.near.K, foot: sk.near.A, S: sk.S }[at];
}

function drawProps(fig, sk, implementsOnly) {
  let out = '';
  for (const p of fig.props || []) {
    const isImpl = ['plate', 'db', 'band'].includes(p.k);
    if (isImpl !== implementsOnly) continue;
    if (p.k === 'line') out += `<line class="eq${p.dash ? ' dash' : ''}" x1="${p.p[0]}" y1="${p.p[1]}" x2="${p.p[2]}" y2="${p.p[3]}"/>`;
    else if (p.k === 'rect') out += `<rect class="eq" x="${p.p[0]}" y="${p.p[1]}" width="${p.p[2]}" height="${p.p[3]}" rx="1.5"/>`;
    else {
      const at = anchor(sk, p.at);
      if (!at) continue;
      if (p.k === 'pad') out += `<circle class="eq" cx="${f1(at[0])}" cy="${f1(at[1])}" r="${p.r || 5}"/>`;
      else if (p.k === 'lever') out += line(p.from, at, 'eq');
      else if (p.k === 'plate') {
        const c = [at[0], at[1] + (p.dy || 0)];
        out += `<circle class="imp fill" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${p.r || 10}"/><circle class="imp" cx="${f1(c[0])}" cy="${f1(c[1])}" r="1.6"/>`;
      } else if (p.k === 'db') {
        out += `<circle class="imp fill" cx="${f1(at[0])}" cy="${f1(at[1])}" r="5"/><circle class="imp" cx="${f1(at[0])}" cy="${f1(at[1])}" r="1.4"/>`;
      } else if (p.k === 'band') {
        const from = anchor(sk, p.from);
        const mid = [(from[0] + at[0]) / 2, (from[1] + at[1]) / 2 + 4];
        out += `<path class="imp band" d="M${f1(from[0])} ${f1(from[1])} Q${f1(mid[0])} ${f1(mid[1])} ${f1(at[0])} ${f1(at[1])}"/>`;
      }
    }
  }
  return out;
}

function drawBody(sk, cls) {
  if (sk.front) {
    const { r, l, rl, ll } = sk;
    return [
      line(l.S, r.S, cls), line(sk.neck, sk.pelvis, cls), line(ll.H, rl.H, cls),
      poly([rl.H, rl.K, rl.A], cls), poly([ll.H, ll.K, ll.A], cls),
      poly([r.S, r.E, r.W], cls), poly([l.S, l.E, l.W], cls),
      `<circle class="${cls} head" cx="${sk.head[0]}" cy="${sk.head[1]}" r="8"/>`,
    ].join('');
  }
  const limb = (m, c) => poly([sk.S, m.E, m.W], c) + poly([sk.hip, m.K, m.A], c) + poly([m.heel, m.A, m.toe], c);
  return (
    limb(sk.far, `${cls} far`) +
    line(sk.hip, sk.S, cls) +
    `<circle class="${cls} head" cx="${f1(sk.head[0])}" cy="${f1(sk.head[1])}" r="8"/>` +
    limb(sk.near, cls)
  );
}

function frameSVG(fig, u, ghost) {
  const sk = skeleton(fig, u);
  const g = ghost ? `<g class="ghost">${drawBody(skeleton(fig, 0), 'body')}</g>` : '';
  return (
    `<line class="ground" x1="4" y1="${GROUND}" x2="236" y2="${GROUND}"/>` +
    drawProps(fig, sk, false) + g + drawBody(sk, 'body') + drawProps(fig, sk, true)
  );
}

export const hasFigure = (id) => !!FIGURES[id];

/** SVG estático: pose final con la inicial como fantasma (miniaturas, movimiento reducido). */
export function figureStatic(id) {
  const fig = FIGURES[id];
  if (!fig) return '';
  return `<svg class="fig" viewBox="0 -30 240 200" aria-hidden="true">${frameSVG(fig, 1, true)}</svg>`;
}

/** Un cuadro puntual de la animación (u = 0 inicio, 1 final). Útil para revisar poses. */
export function figureAt(id, u) {
  const fig = FIGURES[id];
  return fig ? `<svg class="fig" viewBox="0 -30 240 200" aria-hidden="true">${frameSVG(fig, u, false)}</svg>` : '';
}

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/** Ciclo: pausa en a → sube → pausa en b → vuelve. Devuelve una función para frenarlo. */
export function playFigure(svg, id) {
  const fig = FIGURES[id];
  if (!fig) return () => {};
  if (reduced()) { svg.innerHTML = frameSVG(fig, 1, true); return () => {}; }
  const T = [450, 1000, 350, 1000, 400];
  const total = T.reduce((a, b) => a + b, 0);
  let raf = 0;
  const t0 = performance.now();
  const step = (now) => {
    let x = (now - t0) % total, u;
    if (x < T[0]) u = 0;
    else if ((x -= T[0]) < T[1]) u = ease(x / T[1]);
    else if ((x -= T[1]) < T[2]) u = 1;
    else if ((x -= T[2]) < T[3]) u = 1 - ease(x / T[3]);
    else u = 0;
    svg.innerHTML = frameSVG(fig, u, false);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
