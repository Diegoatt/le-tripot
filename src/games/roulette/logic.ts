import { cote } from '../../engine/odds';
import { randInt } from '../../engine/rng';

export const E = 1 / 13;
export const POCKETS = 13; // 0 vert + 1..12
/** Red = odd, black = even (0 is green). */
export const colorOf = (n: number): 'vert' | 'rouge' | 'noir' => (n === 0 ? 'vert' : n % 2 ? 'rouge' : 'noir');
/** Wheel order, alternating colours like a real wheel. */
export const WHEEL = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5, 12];

export type RBet = { kind: 'rouge' } | { kind: 'noir' } | { kind: 'tiers'; tier: 0 | 1 | 2 } | { kind: 'plein'; n: number };

export function betProb(b: RBet): number {
  if (b.kind === 'plein') return 1 / POCKETS;
  if (b.kind === 'tiers') return 4 / POCKETS;
  return 6 / POCKETS;
}
export const betCote = (b: RBet) => cote(betProb(b), E);

export function betWins(b: RBet, n: number): boolean {
  if (b.kind === 'plein') return b.n === n;
  if (n === 0) return false;
  if (b.kind === 'tiers') return Math.floor((n - 1) / 4) === b.tier;
  return colorOf(n) === b.kind;
}

export function betLabel(b: RBet): string {
  if (b.kind === 'plein') return `N° ${b.n}`;
  if (b.kind === 'tiers') return `${b.tier * 4 + 1}-${b.tier * 4 + 4}`;
  return b.kind === 'rouge' ? 'Rouge' : 'Noir';
}

export const spin = () => randInt(POCKETS);
