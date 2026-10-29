import type { FC } from 'react';
import type { Outcome } from '../engine/settle';
import Crash from './crash/Crash';
import Roulette from './roulette/Roulette';
import Slots from './slots/Slots';
import Horses from './horses/Horses';
import Purple from './purple/Purple';
import Bus from './bus/Bus';
import Chrono from './chrono/Chrono';

export interface FinishOptions {
  /** Extra sips outside the bets (jackpot: everyone else drinks 1). */
  extra?: { playerId: string; amount: number; reason: string }[];
}

export interface GameProps {
  finish: (outcomes: Outcome[], opts?: FinishOptions) => Promise<void>;
}

export interface GameModule {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  accent: string;
  odds: string;
  Component: FC<GameProps>;
}

export const GAMES: GameModule[] = [
  { id: 'crash', name: 'Crash', tagline: 'Encaisse avant l’explosion', icon: '🚀', accent: '#ff2d75', odds: 'jusqu’à x5 · auto x6', Component: Crash },
  { id: 'roulette', name: 'Mini-roulette', tagline: '13 cases, une bille, zéro pitié', icon: '🎡', accent: '#e0193f', odds: 'x1 · x2 · x10', Component: Roulette },
  { id: 'slots', name: 'Machine à sous', tagline: 'Trois 7 et la table trinque', icon: '🎰', accent: '#f4c14b', odds: 'x1 à x10 jackpot', Component: Slots },
  { id: 'horses', name: 'Course', tagline: 'Cinq canassons, un photo-finish', icon: '🏇', accent: '#2ec4b6', odds: 'x1,5 à x10', Component: Horses },
  { id: 'purple', name: 'Purple', tagline: 'Quatre cartes, quatre pronostics', icon: '🃏', accent: '#9b5de5', odds: 'cote cumulée ≤ x10', Component: Purple },
  { id: 'bus', name: 'Le Bus', tagline: 'Monte les 4 étages sans tomber', icon: '🚌', accent: '#ff8c42', odds: 'pour · contre', Component: Bus },
  { id: 'chrono', name: 'Chrono aveugle', tagline: 'Arrête-toi pile à 10,00 s', icon: '⏱️', accent: '#2de2e6', odds: 'pot partagé · ≤ x2', Component: Chrono },
];
