import { useSyncExternalStore } from 'react';
import gsap from 'gsap';
import type { Settlement } from './engine/settle';
import { fmt } from './engine/odds';
import type { TripotEvent } from './engine/events';

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
  drunk: number;
  given: number;
  owed: number;
  penalties: number;
  wins: number;
  losses: number;
  bestGift: number;
  drinkLog: number[]; // timestamps of validated sips (hourly cap)
}

export interface Settings {
  sipSize: 'Petite' | 'Normale' | 'Grosse';
  minBet: number;
  maxBet: number; // 1..5
  hourlyCap: number;
  noAlcohol: boolean;
  sound: boolean;
  music: boolean;
  volume: number;
  events: boolean;
  chronoWindow: number;
}

export type Screen = 'title' | 'setup' | 'lobby' | 'game' | 'end' | 'balance';

export interface State {
  screen: Screen;
  gameId: string | null;
  ageOk: boolean;
  players: Player[];
  settings: Settings;
  happyHour: number; // rounds left
  event: TripotEvent | null;
  paused: boolean;
  rounds: number;
  capWarning: string | null;
}

export const PLAYER_COLORS = ['#ff4d6d', '#3ad0ff', '#ffd23f', '#7cff6b', '#b388ff', '#ff9f43', '#f15bb5', '#00f5d4'];
export const AVATARS = ['🦊', '🐸', '🐼', '🦄', '🐯', '🐙', '🦉', '🐵', '🐲', '🦩', '🐺', '🐻', '🦁', '🐧', '👽', '🤠'];

export const newPlayer = (i: number, name = `Joueur ${i + 1}`): Player => ({
  id: crypto.randomUUID(),
  name,
  color: PLAYER_COLORS[i % PLAYER_COLORS.length],
  avatar: AVATARS[i % AVATARS.length],
  drunk: 0,
  given: 0,
  owed: 0,
  penalties: 0,
  wins: 0,
  losses: 0,
  bestGift: 0,
  drinkLog: [],
});

const DEFAULT_SETTINGS: Settings = {
  sipSize: 'Normale',
  minBet: 1,
  maxBet: 3,
  hourlyCap: 20,
  noAlcohol: false,
  sound: true,
  music: true,
  volume: 0.6,
  events: true,
  chronoWindow: 0.05,
};

const KEY = 'tripot-v1';

function load(): State {
  const base: State = {
    screen: 'title',
    gameId: null,
    ageOk: false,
    players: [0, 1, 2, 3].map((i) => newPlayer(i)),
    settings: DEFAULT_SETTINGS,
    happyHour: 0,
    event: null,
    paused: false,
    rounds: 0,
    capWarning: null,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved) return { ...base, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings }, screen: 'title', paused: false, event: null };
  } catch {
    // corrupt or blocked storage: start fresh
  }
  return base;
}

let state = load();
const listeners = new Set<() => void>();

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  try {
    const { screen, gameId, paused, event, capWarning, ...persist } = state;
    localStorage.setItem(KEY, JSON.stringify(persist));
  } catch {
    // storage unavailable: the evening still works, it just won't be remembered
  }
  listeners.forEach((l) => l());
}

export const getState = () => state;
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => sel(state),
  );
}

export const go = (screen: Screen, gameId: string | null = state.gameId) => setState({ screen, gameId });

export function setPaused(paused: boolean) {
  if (paused) gsap.globalTimeline.pause();
  else gsap.globalTimeline.resume();
  setState({ paused });
}

export const unitWord = (n: number, s = state.settings) =>
  `${fmt(n)} ${s.noAlcohol ? (n > 1 ? 'points' : 'point') : n > 1 ? 'gorgées' : 'gorgée'}`;

const mapPlayers = (fn: (p: Player) => Player) => setState((s) => ({ players: s.players.map(fn) }));

/** Losers owe their stake; winners record their win. Gifts are applied by applyGift. */
export function applySettlement(st: Settlement) {
  mapPlayers((p) => {
    const d = st.drinks.find((x) => x.playerId === p.id);
    const g = st.gains.find((x) => x.playerId === p.id);
    return {
      ...p,
      owed: p.owed + (d?.amount ?? 0),
      losses: p.losses + (d ? 1 : 0),
      wins: p.wins + (g ? 1 : 0),
    };
  });
}

export function applyGift(giverId: string, split: Record<string, number>) {
  const total = Object.values(split).reduce((a, b) => a + b, 0);
  mapPlayers((p) => ({
    ...p,
    owed: p.owed + (split[p.id] ?? 0),
    given: p.id === giverId ? p.given + total : p.given,
    bestGift: p.id === giverId ? Math.max(p.bestGift, total) : p.bestGift,
  }));
}

export const everyoneDrinks = (n: number, except?: string) =>
  mapPlayers((p) => (p.id === except ? p : { ...p, owed: p.owed + n }));

export function drinkAll(id: string) {
  const now = Date.now();
  let warn: string | null = null;
  mapPlayers((p) => {
    if (p.id !== id || p.owed <= 0) return p;
    const log = [...p.drinkLog.filter((t) => now - t < 3_600_000), ...Array(Math.ceil(p.owed)).fill(now)];
    if (!state.settings.noAlcohol && log.length >= state.settings.hourlyCap)
      warn = `${p.avatar} ${p.name} a bu ${log.length} gorgées en moins d'une heure. Pause eau conseillée 💧`;
    return { ...p, drunk: p.drunk + p.owed, owed: 0, drinkLog: log };
  });
  if (warn) setState({ capWarning: warn });
}

/** Pass a drink: converted into penalty points (and a forfeit shown by the UI). */
export const passDrink = (id: string) => mapPlayers((p) => (p.id === id ? { ...p, penalties: p.penalties + p.owed, owed: 0 } : p));

export const score = (p: Player) => p.given - p.drunk - p.owed - p.penalties;

export function resetEvening() {
  setState((s) => ({
    players: s.players.map((p, i) => ({ ...newPlayer(i, p.name), id: p.id, color: p.color, avatar: p.avatar })),
    happyHour: 0,
    rounds: 0,
    event: null,
  }));
}
