import { pickWeighted, randInt } from '../../engine/rng';

// The payout table is the spec itself (a multi-outcome bet, so cote(p, e) per line
// does not apply). Its global house edge is 13.5 %, checked in the tests.
export const TABLE = [
  { id: 'perdu', p: 0.66, cote: 0, symbol: -1 },
  { id: 'x1', p: 0.24, cote: 1, symbol: 0 },
  { id: 'x2', p: 0.08, cote: 2, symbol: 1 },
  { id: 'x5', p: 0.015, cote: 5, symbol: 2 },
  { id: 'jackpot', p: 0.005, cote: 10, symbol: 3 },
] as const;

/** 0 cerise, 1 cloche, 2 diamant, 3 sept (jackpot), 4-5 fillers */
export const SYMBOLS = ['🍒', '🔔', '💎', '7️⃣', '🍋', '🍀'];

export type SlotResult = { line: (typeof TABLE)[number]; reels: [number, number, number] };

export function pull(): SlotResult {
  const line = TABLE[pickWeighted(TABLE.map((t) => t.p))];
  if (line.symbol >= 0) return { line, reels: [line.symbol, line.symbol, line.symbol] };
  // Losing combo: never three of a kind; often a near miss for the drama.
  const a = randInt(SYMBOLS.length);
  let b = randInt(3) === 0 ? a : randInt(SYMBOLS.length);
  let c = randInt(SYMBOLS.length);
  while (c === a && c === b) c = randInt(SYMBOLS.length);
  if (a === b && c === a) b = (a + 1) % SYMBOLS.length;
  return { line, reels: [a, b, c] };
}
