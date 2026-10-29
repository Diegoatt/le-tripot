import { MAX_COTE, ROUND_GAIN_CAP, floorHalf } from './odds';

/** What a game reports for one player's bet once the round is decided. */
export interface Outcome {
  playerId: string;
  stake: number;
  won: boolean;
  /** Net odds applied on a win (0 = stake saved, nothing to hand out). */
  cote: number;
  label?: string;
}

export interface Settlement {
  drinks: { playerId: string; amount: number }[];
  gains: { playerId: string; amount: number; capped: number; raw: number }[];
  /** Sips lost to the per-round cap ("plafond atteint"). */
  cappedTotal: number;
}

export function settleRound(outcomes: Outcome[], gainMultiplier = 1): Settlement {
  const drinks: Settlement['drinks'] = [];
  const raws: { playerId: string; raw: number }[] = [];
  for (const o of outcomes) {
    if (o.stake <= 0) continue;
    if (o.cote > MAX_COTE) throw new Error('cote above cap');
    if (!o.won) drinks.push({ playerId: o.playerId, amount: o.stake });
    else if (o.cote > 0) raws.push({ playerId: o.playerId, raw: o.stake * o.cote * gainMultiplier });
  }
  const total = raws.reduce((a, g) => a + g.raw, 0);
  const scale = total > ROUND_GAIN_CAP ? ROUND_GAIN_CAP / total : 1;
  const gains = raws.map((g) => {
    const amount = scale < 1 ? floorHalf(g.raw * scale) : g.raw;
    return { playerId: g.playerId, raw: g.raw, amount, capped: g.raw - amount };
  });
  return { drinks, gains, cappedTotal: gains.reduce((a, g) => a + g.capped, 0) };
}

/** Chips a winner hands out: whole sips, plus one half chip if needed. */
export function chipsFor(amount: number): number[] {
  const whole = Math.floor(amount);
  const chips: number[] = Array(whole).fill(1);
  if (amount - whole >= 0.5) chips.push(0.5);
  return chips;
}

/** Even split among recipients, round-robin, starting at a random offset. */
export function autoSplit(amount: number, recipients: string[], offset = 0): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(recipients.map((r) => [r, 0]));
  chipsFor(amount).forEach((c, i) => (out[recipients[(i + offset) % recipients.length]] += c));
  return out;
}
