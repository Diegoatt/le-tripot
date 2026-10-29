import { describe, expect, it } from 'vitest';
import { SIMS } from './simulate';
import { MAX_COTE, ROUND_GAIN_CAP, cote } from './odds';
import { autoSplit, chipsFor, settleRound } from './settle';
import { HORSES, horseCote } from '../games/horses/logic';
import { betCote } from '../games/roulette/logic';
import { TABLE } from '../games/slots/logic';
import { judge } from '../games/chrono/logic';
import { random } from './rng';

const N = 1_000_000;
const BIG_LIMIT: Record<string, number> = { purple: 0.15, crash: 0.15 };

describe('Monte Carlo 1 000 000 manches', () => {
  for (const [game, sim] of Object.entries(SIMS)) {
    it(game, () => {
      const s = sim(N);
      console.log(game, { ev: s.ev.toFixed(4), win: s.winRate.toFixed(3), big: s.bigRate.toFixed(4), max: s.maxCote });
      expect(s.ev).toBeLessThan(-0.03);
      expect(s.ev).toBeGreaterThan(-0.2);
      expect(s.bigRate).toBeLessThan(BIG_LIMIT[game] ?? 0.05);
      expect(s.maxCote).toBeLessThanOrEqual(MAX_COTE);
    });
  }
});

describe('cotes', () => {
  it('formule et plafond', () => {
    expect(cote(0.01, 0.1)).toBe(10);
    expect(cote(0.5, 0.1)).toBe(0.5);
    expect(() => cote(0.5, 0.3)).toThrow();
  });
  it('roulette x1 / x2 / x10', () => {
    expect(betCote({ kind: 'rouge' })).toBe(1);
    expect(betCote({ kind: 'tiers', tier: 1 })).toBe(2);
    expect(betCote({ kind: 'plein', n: 3 })).toBe(10);
  });
  it('chevaux x1,5 / x2,5 / x3 / x6 / x10', () => {
    expect(HORSES.map((_, i) => horseCote(i))).toEqual([1.5, 2.5, 3, 6, 10]);
  });
  it('machine à sous : avantage maison 13,5 %', () => {
    const ev = TABLE.reduce((a, t) => a + t.p * (t.cote > 0 ? t.cote : -1), 0);
    expect(ev).toBeCloseTo(-0.135, 6);
  });
});

describe('moteur', () => {
  it('ne crée ni ne perd de gorgée, respecte le plafond par manche', () => {
    for (let i = 0; i < 20_000; i++) {
      const outcomes = Array.from({ length: 2 + Math.floor(random() * 7) }, (_, k) => {
        const won = random() < 0.5;
        return { playerId: 'p' + k, stake: 1 + Math.floor(random() * 5), won, cote: won ? Math.floor(random() * 21) / 2 : 0 };
      });
      const mult = random() < 0.2 ? 2 : 1;
      const s = settleRound(outcomes, mult);
      const raw = outcomes.filter((o) => o.won).reduce((a, o) => a + o.stake * o.cote * mult, 0);
      const handed = s.gains.reduce((a, g) => a + g.amount, 0);
      expect(handed).toBeLessThanOrEqual(ROUND_GAIN_CAP);
      expect(handed + s.cappedTotal).toBeCloseTo(raw, 9);
      expect(s.drinks.reduce((a, d) => a + d.amount, 0)).toBe(outcomes.filter((o) => !o.won).reduce((a, o) => a + o.stake, 0));
      for (const g of s.gains) {
        const split = autoSplit(g.amount, ['a', 'b', 'c']);
        expect(Object.values(split).reduce((a, b) => a + b, 0)).toBe(g.amount);
        expect(chipsFor(g.amount).reduce((a, b) => a + b, 0)).toBe(g.amount);
      }
    }
  });

  it('chrono : pot partagé, au plus 2x la mise, tout le monde boit sinon', () => {
    const e = [
      { playerId: 'a', stake: 2, time: 10.02 },
      { playerId: 'b', stake: 3, time: 9.7 },
      { playerId: 'c', stake: 1, time: null },
    ];
    const r = judge(e, 0.05);
    expect(r[0]).toMatchObject({ won: true, cote: 2 });
    expect(r[1].won).toBe(false);
    expect(judge(e, 0.01).every((o) => !o.won)).toBe(true);
    const two = judge([...e, { playerId: 'd', stake: 2, time: 9.99 }], 0.05);
    expect(two[0].cote * 2 + two[3].cote * 2).toBeLessThanOrEqual(8);
  });
});
