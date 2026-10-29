// Every sound is synthesised with Web Audio: no audio files, nothing to license.
import { getState } from '../store';

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let noiseBuf: AudioBuffer;

function ac(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.35;
    musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; // audio texture only, not a game draw
  }
  if (ctx.state === 'suspended') ctx.resume();
  syncVolume();
  return ctx;
}

export function syncVolume() {
  if (!ctx) return;
  const s = getState().settings;
  master.gain.setTargetAtTime(s.sound ? s.volume : 0, ctx.currentTime, 0.05);
  musicBus.gain.setTargetAtTime(s.music ? 0.35 : 0, ctx.currentTime, 0.2);
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0, slideTo?: number, dest?: AudioNode) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest ?? master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol = 0.3, filter = 2000, type: BiquadFilterType = 'lowpass', delay = 0, dest?: AudioNode) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filter;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(dest ?? master);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
}

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export const sfx = {
  unlock: () => ac(),
  click: () => tone(1400, 0.05, 'triangle', 0.12),
  hover: () => tone(2200, 0.03, 'sine', 0.04),
  chip: () => {
    tone(2600, 0.04, 'triangle', 0.15);
    tone(3400, 0.05, 'triangle', 0.1, 0.03);
  },
  tick: (pitch = 1) => tone(900 * pitch, 0.03, 'square', 0.06),
  whoosh: () => noise(0.4, 0.25, 1200, 'bandpass'),
  cashout: () => [0, 0.06, 0.12].forEach((d, i) => tone(NOTES[i + 2], 0.25, 'triangle', 0.18, d)),
  win: () => [0, 0.09, 0.18, 0.27].forEach((d, i) => tone(NOTES[i * 1 + 1], 0.35, 'triangle', 0.2, d)),
  bigWin: () => {
    [0, 0.1, 0.2, 0.3, 0.45, 0.6].forEach((d, i) => tone(NOTES[i], 0.5, 'sawtooth', 0.09, d));
    [0, 0.1, 0.2, 0.3, 0.45, 0.6].forEach((d, i) => tone(NOTES[i] * 2, 0.5, 'triangle', 0.12, d));
    noise(1.5, 0.08, 8000, 'highpass', 0.3);
  },
  lose: () => {
    tone(220, 0.6, 'sawtooth', 0.15, 0, 90);
    tone(233, 0.6, 'sawtooth', 0.1, 0.02, 95);
  },
  boom: () => {
    noise(1.2, 0.8, 900);
    tone(120, 0.9, 'sine', 0.7, 0, 30);
    noise(0.15, 0.5, 5000, 'highpass');
  },
  heartbeat: (vol = 0.5) => {
    tone(60, 0.12, 'sine', vol);
    tone(55, 0.12, 'sine', vol * 0.7, 0.16);
  },
  reelStop: () => {
    tone(180, 0.08, 'square', 0.15);
    noise(0.06, 0.2, 3000, 'bandpass');
  },
  ballBounce: () => tone(2500 + Math.random() * 800, 0.03, 'triangle', 0.08),
  cardFlip: () => noise(0.08, 0.25, 4000, 'bandpass'),
  hoof: () => noise(0.05, 0.12, 400, 'lowpass'),
  crowd: (dur = 2) => noise(dur, 0.12, 900, 'bandpass'),
  drum: (dur = 1.2) => {
    for (let t = 0; t < dur; t += 0.05) noise(0.04, 0.05 + (t / dur) * 0.15, 1500, 'bandpass', t);
  },
  fanfare: () => [0, 0.15, 0.3, 0.6].forEach((d, i) => tone([392, 523.25, 659.25, 783.99][i], 0.5, 'square', 0.08, d)),
  shutter: () => {
    noise(0.04, 0.4, 6000, 'highpass');
    noise(0.05, 0.3, 3000, 'highpass', 0.08);
  },
  fall: () => tone(900, 1, 'sine', 0.2, 0, 80),
};

// --- Ambient lounge loop: Am7 - Dm7 - G7 - Cmaj7, swung hats, walking bass. ---
let musicTimer: number | null = null;
let tension = 0;
const CHORDS = [
  [220, 261.63, 329.63, 392],
  [293.66, 349.23, 440, 523.25],
  [196, 246.94, 293.66, 349.23],
  [261.63, 329.63, 392, 493.88],
];

export function setTension(t: number) {
  tension = Math.max(0, Math.min(1, t));
}

export function startMusic() {
  const c = ac();
  if (!c || musicTimer !== null) return;
  let beat = 0;
  let next = c.currentTime + 0.1;
  musicTimer = window.setInterval(() => {
    const bpm = 92 + tension * 70;
    const spb = 60 / bpm;
    while (next < c.currentTime + 0.3) {
      const chord = CHORDS[Math.floor(beat / 8) % 4];
      const d = next - c.currentTime;
      if (beat % 8 === 0) chord.forEach((f) => tone(f, spb * 7.5, 'triangle', 0.035, d, undefined, musicBus));
      if (beat % 2 === 0) tone(chord[0] / 2 * (beat % 4 === 2 ? 1.5 : 1), spb * 0.9, 'sine', 0.14, d, undefined, musicBus);
      noise(0.04, 0.03 + tension * 0.05, 9000, 'highpass', d + (beat % 2 ? spb * 0.16 : 0), musicBus);
      if (tension > 0.4 && beat % 2 === 0) tone(55, 0.1, 'sine', 0.2 * tension, d, undefined, musicBus);
      next += spb / 2;
      beat++;
    }
  }, 60);
}

export function stopMusic() {
  if (musicTimer !== null) clearInterval(musicTimer);
  musicTimer = null;
}
