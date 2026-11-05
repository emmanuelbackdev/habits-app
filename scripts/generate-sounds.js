#!/usr/bin/env node
/**
 * Synthesizes the app's reward sounds into assets/sounds/*.wav (16-bit mono PCM).
 * Run with `node scripts/generate-sounds.js` after tweaking any of the recipes below.
 *
 *   tap.wav      soft marimba-style pluck: one step of a count habit
 *   complete.wav two-note bell chime: a habit is done for today
 *   fanfare.wav  rising four-note arpeggio: perfect day / challenge won
 */
const fs = require('fs');
const path = require('path');

const RATE = 44100;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

/** A struck note: a few partials, each with an exponential decay and a short attack ramp. */
function note({ freq, start, duration, decay, partials, gain = 1 }) {
  return { freq, start, duration, decay, partials, gain };
}

const BELL = [
  [1, 1],
  [2, 0.35],
  [2.76, 0.18],
  [5.4, 0.06],
];
const MARIMBA = [
  [1, 1],
  [4, 0.25],
  [9.2, 0.04],
];

function render(notes, length) {
  const samples = new Float32Array(Math.ceil(length * RATE));
  for (const n of notes) {
    const startIdx = Math.floor(n.start * RATE);
    const count = Math.floor(n.duration * RATE);
    for (let i = 0; i < count && startIdx + i < samples.length; i++) {
      const t = i / RATE;
      const attack = Math.min(1, t / 0.004);
      let v = 0;
      for (const [ratio, amp] of n.partials) {
        // Higher partials die away faster, like a real struck bar.
        const env = Math.exp(-t / (n.decay / Math.sqrt(ratio)));
        v += amp * env * Math.sin(2 * Math.PI * n.freq * ratio * t);
      }
      samples[startIdx + i] += v * attack * n.gain;
    }
  }
  // Normalize to a polite peak (about -4 dBFS) and fade the tail to avoid clicks.
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peak > 0 ? 0.63 / peak : 0;
  const fade = Math.floor(0.02 * RATE);
  for (let i = 0; i < samples.length; i++) {
    const tail = Math.min(1, (samples.length - i) / fade);
    samples[i] *= scale * tail;
  }
  return samples;
}

function writeWav(file, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;

const sounds = {
  tap: render([note({ freq: A5, start: 0, duration: 0.18, decay: 0.05, partials: MARIMBA })], 0.18),
  complete: render(
    [
      note({ freq: E6, start: 0, duration: 0.7, decay: 0.22, partials: BELL, gain: 0.8 }),
      note({ freq: G6, start: 0.1, duration: 0.8, decay: 0.3, partials: BELL }),
    ],
    0.9
  ),
  fanfare: render(
    [C5, E5, G5, C6].map((freq, i) =>
      note({ freq, start: i * 0.09, duration: 1.4, decay: i === 3 ? 0.5 : 0.3, partials: BELL, gain: 0.7 + i * 0.1 })
    ).concat([
      // Sparkle on top of the final note.
      note({ freq: E6, start: 0.3, duration: 1.1, decay: 0.35, partials: BELL, gain: 0.35 }),
      note({ freq: G6, start: 0.36, duration: 1.1, decay: 0.35, partials: BELL, gain: 0.3 }),
    ]),
    1.7
  ),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  const file = path.join(OUT_DIR, `${name}.wav`);
  writeWav(file, samples);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${(samples.length / RATE).toFixed(2)}s)`);
}
