import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Buffer } from 'node:buffer';
import process from 'node:process';

// Deliberately quiet confirmation sounds. Keep this generator so preview and
// packaged assets can be reproduced byte-for-byte.
const sounds = {
  soft: [
    [0, 0.29, 784, 0.075],
    [0.16, 0.31, 1046.5, 0.065],
  ],
  glass: [
    [0, 0.24, 880, 0.052],
    [0.14, 0.32, 1174.7, 0.058],
  ],
  warm: [
    [0, 0.33, 523.25, 0.078],
    [0.17, 0.30, 659.25, 0.071],
  ],
  ripple: [
    [0, 0.22, 1046.5, 0.044],
    [0.11, 0.22, 880, 0.048],
    [0.22, 0.25, 784, 0.054],
  ],
  sparkle: [
    [0, 0.16, 1174.7, 0.047],
    [0.11, 0.17, 1568, 0.043],
    [0.20, 0.22, 1318.5, 0.042],
  ],
  bloom: [
    [0, 0.35, 659.25, 0.061],
    [0.13, 0.34, 987.77, 0.057],
  ],
};

const preset = process.argv[3] || 'soft';
if (!(preset in sounds)) throw new Error(`Unknown sound preset: ${preset}`);
const sampleRate = 44_100;
const duration = 0.48;
const sampleCount = Math.round(sampleRate * duration);
const pcm = Buffer.alloc(sampleCount * 2);

const bell = (time, start, length, frequency, gain) => {
  const position = time - start;
  if (position < 0 || position >= length) return 0;
  const attack = Math.min(1, position / 0.012);
  const release = Math.pow(1 - position / length, 2.4);
  const fundamental = Math.sin(2 * Math.PI * frequency * position);
  const overtone = 0.16 * Math.sin(2 * Math.PI * frequency * 2 * position);
  return gain * attack * release * (fundamental + overtone);
};

for (let index = 0; index < sampleCount; index++) {
  const time = index / sampleRate;
  const value = sounds[preset].reduce((sum, [start, length, frequency, gain]) =>
    sum + bell(time, start, length, frequency, gain), 0);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), index * 2);
}

const wav = Buffer.alloc(44 + pcm.length);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(pcm.length, 40);
pcm.copy(wav, 44);

const target = resolve(process.argv[2] || 'output/completion-chime-preview.wav');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, wav);
process.stdout.write(`${target}\n`);
