import { cote } from '../../engine/odds';
import { Card, isRed } from '../cards';

export const E = 0.12;
export const STEPS = [
  { title: 'Couleur', options: ['Rouge', 'Noir'] },
  { title: 'Plus ou moins', options: ['Plus', 'Moins'] },
  { title: 'Entre ou dehors', options: ['Entre', 'Dehors'] },
  { title: 'Symbole', options: ['♥', '♦', '♣', '♠'] },
];

/** Does `card` satisfy option `opt` at step `step`, given the cards already shown? */
export function optionWins(step: number, opt: number, shown: Card[], card: Card): boolean {
  if (step === 0) return isRed(card) === (opt === 0);
  if (step === 1) return opt === 0 ? card.rank > shown[0].rank : card.rank < shown[0].rank;
  if (step === 2) {
    const lo = Math.min(shown[0].rank, shown[1].rank);
    const hi = Math.max(shown[0].rank, shown[1].rank);
    const inside = card.rank > lo && card.rank < hi;
    const outside = card.rank < lo || card.rank > hi;
    return opt === 0 ? inside : outside;
  }
  return card.suit === opt;
}

/** True probability of an option over the cards not yet shown (ties lose). */
export function optionProb(step: number, opt: number, shown: Card[], unseen: Card[]): number {
  return unseen.filter((c) => optionWins(step, opt, shown, c)).length / unseen.length;
}

/** Odds for cashing out after having survived steps with cumulative probability P. */
export const purpleCote = (P: number) => cote(P, E);
/** Odds of a side bet "contre": the player fails this step. */
export const contreCote = (pStep: number) => cote(1 - pStep, E);

export function bestOption(step: number, shown: Card[], unseen: Card[]): number {
  let best = 0;
  let bp = -1;
  STEPS[step].options.forEach((_, o) => {
    const p = optionProb(step, o, shown, unseen);
    if (p > bp) [best, bp] = [o, p];
  });
  return best;
}
