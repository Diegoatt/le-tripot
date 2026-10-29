import { floorHalf } from '../../engine/odds';
import type { Outcome } from '../../engine/settle';

export const TARGET = 10;

export interface ChronoEntry {
  playerId: string;
  stake: number;
  time: number | null; // seconds, null = never pressed
}

/**
 * Winners (|t - 10| <= window) share the pot of all stakes, each handing out at most 2x their stake.
 * Nobody in the window: everybody drinks their stake.
 */
export function judge(entries: ChronoEntry[], window: number): Outcome[] {
  const inWindow = (e: ChronoEntry) => e.time !== null && Math.abs(e.time - TARGET) <= window + 1e-9;
  const winners = entries.filter(inWindow);
  const pot = entries.reduce((a, e) => a + e.stake, 0);
  const wStakes = winners.reduce((a, e) => a + e.stake, 0);
  return entries.map((e) => {
    if (!inWindow(e)) return { playerId: e.playerId, stake: e.stake, won: false, cote: 0 };
    const gain = Math.min(2 * e.stake, floorHalf((pot * e.stake) / wStakes));
    return { playerId: e.playerId, stake: e.stake, won: true, cote: gain / e.stake };
  });
}
