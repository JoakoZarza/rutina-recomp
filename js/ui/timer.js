/**
 * Temporizador de descanso flotante. Suena y vibra al terminar.
 * El audio sólo se puede crear después de un toque del usuario (unlockAudio).
 */
import { $, mmss } from './dom.js';

const state = { end: 0, total: 0, label: '', goUntil: 0 };
const CIRC = 2 * Math.PI * 24;
let els, actx = null;

export function unlockAudio() {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch { /* sin audio */ }
}

function beep() {
  try {
    if (actx) {
      const t0 = actx.currentTime;
      [0, 0.22, 0.44].forEach((d, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square';
        o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(0.18, t0 + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.16);
        o.connect(g).connect(actx.destination);
        o.start(t0 + d);
        o.stop(t0 + d + 0.18);
      });
    }
  } catch { /* sin audio */ }
  try { navigator.vibrate?.([200, 100, 200, 100, 300]); } catch { /* sin vibración */ }
}

export function startTimer(seconds, label = 'Descanso') {
  unlockAudio();
  Object.assign(state, { total: seconds, end: Date.now() + seconds * 1000, label, goUntil: 0 });
  tick();
}

export function addTime(seconds) {
  if (!state.end) return;
  state.end += seconds * 1000;
  state.total = Math.max(state.total, (state.end - Date.now()) / 1000);
  if (state.end <= Date.now()) state.end = Date.now() + 1;
  tick();
}

export function stopTimer() {
  state.end = 0;
  state.goUntil = 0;
  tick();
}

function tick() {
  const now = Date.now();
  const { idle, run, dock, time, label, ring } = els;
  if (state.end) {
    const left = (state.end - now) / 1000;
    if (left > 0) {
      idle.hidden = true; run.hidden = false; dock.classList.remove('go');
      time.textContent = mmss(Math.ceil(left));
      label.textContent = state.label;
      ring.style.strokeDashoffset = CIRC * (1 - Math.min(1, left / state.total));
      run.classList.toggle('low', left <= 10);
      dock.classList.remove('is-idle');
      return;
    }
    state.end = 0;
    state.goUntil = now + 5000;
    beep();
  }
  if (state.goUntil > now) {
    idle.hidden = true; run.hidden = false; dock.classList.add('go');
    time.textContent = '¡A la serie!';
    label.textContent = state.label;
    ring.style.strokeDashoffset = 0;
  } else {
    idle.hidden = false; run.hidden = true; dock.classList.remove('go');
  }
  dock.classList.toggle('is-idle', !idle.hidden);
}

export function initTimer() {
  els = {
    dock: $('#dockIn'), idle: $('#tIdle'), run: $('#tRun'),
    time: $('#tTime'), label: $('#tLabel'), ring: $('#tRing'),
  };
  els.ring.style.strokeDasharray = CIRC;
  setInterval(tick, 250);
  tick();
}
