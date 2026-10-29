import { shuffle } from '../engine/rng';

export interface Card {
  rank: number; // 2..14 (14 = As)
  suit: number; // 0 ♥, 1 ♦, 2 ♣, 3 ♠
}

export const SUITS = ['♥', '♦', '♣', '♠'];
export const SUIT_NAMES = ['Cœur', 'Carreau', 'Trèfle', 'Pique'];
export const isRed = (c: Card) => c.suit < 2;
export const rankLabel = (r: number) => ({ 11: 'V', 12: 'D', 13: 'R', 14: 'A' } as Record<number, string>)[r] ?? String(r);

export function newDeck(): Card[] {
  const d: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ rank: r, suit: s });
  return shuffle(d);
}
