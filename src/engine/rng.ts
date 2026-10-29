// All randomness goes through crypto.getRandomValues (buffered for speed).
const buf = new Uint32Array(4096);
let idx = buf.length;

export function random(): number {
  if (idx >= buf.length) {
    crypto.getRandomValues(buf);
    idx = 0;
  }
  return buf[idx++] / 4294967296;
}

export const randInt = (n: number) => Math.floor(random() * n);

export function pickWeighted(weights: readonly number[]): number {
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
