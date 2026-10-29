import { cote } from '../../engine/odds';
import { random } from '../../engine/rng';

export const E = 0.15;
export const MAX_MULT = 6;

/** P(crash point >= m) = 0.85 / m. Returns MAX_MULT when the cap is reached (auto cash-out). */
export function drawCrash(): number {
  const u = 1 - random(); // (0, 1]
  const m = (1 - E) / u;
  if (m < 1) return 1;
  return Math.min(MAX_MULT, Math.floor(m * 100) / 100);
}

/** Odds for cashing out at multiplier m: cote(0.85/m, 0.15) = m - 1, floored to the half. */
export const cashoutCote = (m: number) => cote((1 - E) / m, E);

/** Multiplier shown after t seconds of flight. */
export const multAt = (t: number) => Math.min(MAX_MULT, Math.exp(0.16 * t));
export const timeFor = (m: number) => Math.log(m) / 0.16;
