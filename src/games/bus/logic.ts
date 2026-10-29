import { cote } from '../../engine/odds';
import { Card } from '../cards';

export const E = 0.1;
export const FLOORS = 4;
export const ATTEMPTS = 2;

/** Each floor: is the next card higher ("plus") or lower ("moins") than the current one? Ties fall. */
export const floorWins = (plus: boolean, cur: Card, next: Card) => (plus ? next.rank > cur.rank : next.rank < cur.rank);

/** The side with more winning cards left (what a sensible climber picks). */
export function sensibleChoice(cur: Card, unseen: Card[]): boolean {
  const hi = unseen.filter((c) => c.rank > cur.rank).length;
  const lo = unseen.filter((c) => c.rank < cur.rank).length;
  return hi >= lo;
}

// Exact probability of clearing all floors in one attempt with optimal play.
const memo = new Map<string, number>();
function clear(counts: number[], cur: number, k: number): number {
  if (k === 0) return 1;
  const key = counts.join(',') + '|' + cur + '|' + k;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const n = counts.reduce((a, b) => a + b, 0);
  let up = 0;
  let down = 0;
  for (let r = 0; r < 13; r++) {
    if (!counts[r] || r === cur) continue;
    counts[r]--;
    const v = ((counts[r] + 1) / n) * clear(counts, r, k - 1);
    counts[r]++;
    if (r > cur) up += v;
    else down += v;
  }
  const res = Math.max(up, down);
  memo.set(key, res);
  return res;
}

let cached: { attempt: number; success: number } | null = null;
export function busProbabilities() {
  if (cached) return cached;
  const counts = Array(13).fill(4);
  let attempt = 0;
  for (let r = 0; r < 13; r++) {
    counts[r]--;
    attempt += (1 / 13) * clear(counts, r, FLOORS);
    counts[r]++;
  }
  cached = { attempt, success: 1 - (1 - attempt) ** ATTEMPTS };
  return cached;
}

export const busCote = (side: 'pour' | 'contre') => {
  const { success } = busProbabilities();
  return cote(side === 'pour' ? success : 1 - success, E);
};
