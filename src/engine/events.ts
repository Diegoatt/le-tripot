import { random, randInt } from './rng';

export type EventId = 'happy' | 'taxe' | 'roi' | 'tournee';

export interface TripotEvent {
  id: EventId;
  title: string;
  text: string;
  icon: string;
}

export const EVENTS: TripotEvent[] = [
  { id: 'happy', title: 'Happy hour', text: 'Gains x2 pendant 3 manches', icon: '🍸' },
  { id: 'taxe', title: 'Taxe du tripot', text: 'Tout le monde boit 1', icon: '💸' },
  { id: 'roi', title: 'Le roi trinque', text: 'Le premier du classement boit 2', icon: '👑' },
  { id: 'tournee', title: 'Tournée du patron', text: 'Le dernier du classement distribue 2', icon: '🎁' },
];

export const EVENT_CHANCE = 0.12;

export const rollEvent = (): TripotEvent | null => (random() < EVENT_CHANCE ? EVENTS[randInt(EVENTS.length)] : null);
