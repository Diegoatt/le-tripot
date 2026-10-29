// Monte Carlo over the real game logic, with one sip staked per round and a reference strategy.
// Shared by the Vitest suite and the hidden "Équilibrage" screen.
import { randInt, random } from './rng';
import { RBet, betCote, betWins, spin } from '../games/roulette/logic';
import { pull } from '../games/slots/logic';
import { drawCrash, cashoutCote } from '../games/crash/logic';
import { HORSES, drawRace, horseCote } from '../games/horses/logic';
import { STEPS, bestOption, optionProb, optionWins, purpleCote } from '../games/purple/logic';
import { ATTEMPTS, FLOORS, busCote, floorWins, sensibleChoice } from '../games/bus/logic';
import { newDeck } from '../games/cards';

export interface SimStats {
  rounds: number;
  ev: number; // mean net sips per sip staked
  winRate: number;
  bigRate: number; // share of bets paying x5 or more
  maxCote: number;
  freq: Record<string, number>;
}

type Round = { cote: number; won: boolean; tag: string };

function run(n: number, play: () => Round): SimStats {
  let net = 0;
  let wins = 0;
  let big = 0;
  let maxCote = 0;
  const freq: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const r = play();
    net += r.won ? r.cote : -1;
    if (r.won) wins++;
    if (r.won && r.cote >= 5) big++;
    if (r.cote > maxCote) maxCote = r.cote;
    freq[r.tag] = (freq[r.tag] ?? 0) + 1;
  }
  for (const k in freq) freq[k] /= n;
  return { rounds: n, ev: net / n, winRate: wins / n, bigRate: big / n, maxCote, freq };
}

const ROULETTE_BETS: RBet[] = [{ kind: 'rouge' }, { kind: 'noir' }, { kind: 'tiers', tier: 0 }, { kind: 'tiers', tier: 2 }];

export const SIMS: Record<string, (n: number) => SimStats> = {
  roulette: (n) =>
    run(n, () => {
      // Mixed table: a third simple chances, a third tiers, a third plein.
      const k = randInt(3);
      const bet: RBet = k === 2 ? { kind: 'plein', n: randInt(13) } : ROULETTE_BETS[k * 2 + randInt(2)];
      const num = spin();
      return { cote: betCote(bet), won: betWins(bet, num), tag: `n${num}` };
    }),
  slots: (n) =>
    run(n, () => {
      const r = pull();
      return { cote: r.line.cote, won: r.line.cote > 0, tag: r.line.id };
    }),
  crash: (n) =>
    run(n, () => {
      // Players aim for a target between x1.5 and the x6 auto cash-out.
      const target = [1.5, 2, 2.5, 3, 4, 6][randInt(6)];
      const c = drawCrash();
      const won = c >= target;
      return { cote: cashoutCote(target), won, tag: c >= 6 ? 'x6' : c < 2 ? '<x2' : c < 3 ? 'x2-3' : 'x3-6' };
    }),
  horses: (n) =>
    run(n, () => {
      const pick = randInt(HORSES.length);
      const race = drawRace();
      return { cote: horseCote(pick), won: race.winner === pick, tag: HORSES[race.winner].name };
    }),
  purple: (n) =>
    run(n, () => {
      // Best option at every step, cash out after step 3 (the best line: about -17 %).
      const stop = 3;
      const deck = newDeck();
      let P = 1;
      for (let s = 0; s < stop; s++) {
        const shown = deck.slice(0, s);
        const unseen = deck.slice(s);
        const o = bestOption(s, shown, unseen);
        P *= optionProb(s, o, shown, unseen);
        if (!optionWins(s, o, shown, deck[s])) return { cote: purpleCote(P), won: false, tag: `rate ${STEPS[s].title}` };
      }
      return { cote: purpleCote(P), won: true, tag: `encaisse ${stop}` };
    }),
  bus: (n) =>
    run(n, () => {
      const pour = random() < 0.5;
      let climbed = false;
      for (let a = 0; a < ATTEMPTS && !climbed; a++) {
        const deck = newDeck();
        let f = 0;
        for (; f < FLOORS; f++) {
          const cur = deck[f];
          if (!floorWins(sensibleChoice(cur, deck.slice(f + 1)), cur, deck[f + 1])) break;
        }
        climbed = f === FLOORS;
      }
      return { cote: busCote(pour ? 'pour' : 'contre'), won: climbed === pour, tag: climbed ? 'au sommet' : 'chute' };
    }),
};

export const SIM_LABELS: Record<string, string> = {
  roulette: 'Mini-roulette',
  slots: 'Machine à sous',
  crash: 'Crash',
  horses: 'Course',
  purple: 'Purple',
  bus: 'Le Bus',
};
