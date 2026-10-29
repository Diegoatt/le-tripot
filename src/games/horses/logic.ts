import { cote } from '../../engine/odds';
import { pickWeighted, random, shuffle } from '../../engine/rng';

export const E = 0.12;
export const HORSES = [
  { name: 'Tonnerre', p: 0.35, color: 0xe63946, emoji: '🐎' },
  { name: 'Mojito', p: 0.25, color: 0x2ec4b6, emoji: '🐎' },
  { name: 'Gueule de Bois', p: 0.2, color: 0xf4c14b, emoji: '🐎' },
  { name: 'Last Call', p: 0.12, color: 0x9b5de5, emoji: '🐎' },
  { name: 'Petit Jaune', p: 0.08, color: 0xff8c42, emoji: '🐎' },
];
export const horseCote = (i: number) => cote(HORSES[i].p, E);

export interface RacePlan {
  winner: number;
  order: number[]; // finishing order
  photoFinish: boolean;
}

export function drawRace(): RacePlan {
  const winner = pickWeighted(HORSES.map((h) => h.p));
  const rest = shuffle(HORSES.map((_, i) => i).filter((i) => i !== winner));
  return { winner, order: [winner, ...rest], photoFinish: random() < 0.4 };
}
