export const MAX_COTE = 10;
/** Total sips that can be handed out in one round, across all winners. */
export const ROUND_GAIN_CAP = 8;

/**
 * Net odds: a winning stake of s hands out s * cote sips.
 * cote(p, e) = (1 - e - p) / p, floored to the half point, capped at x10.
 */
export function cote(p: number, e: number): number {
  if (e < 0.05 || e > 0.18) throw new Error(`house edge out of range: ${e}`);
  if (p <= 0 || p >= 1) return 0;
  const raw = (1 - e - p) / p;
  return Math.min(MAX_COTE, Math.max(0, Math.floor(raw * 2 + 1e-9) / 2));
}

export const floorHalf = (x: number) => Math.floor(x * 2 + 1e-9) / 2;

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));
