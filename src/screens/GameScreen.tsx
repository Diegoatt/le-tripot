import { useCallback, useRef, useState } from 'react';
import { GAMES, FinishOptions } from '../games/registry';
import { applyGift, applySettlement, everyoneDrinks, getState, score, setState, useStore } from '../store';
import { Outcome, Settlement, settleRound } from '../engine/settle';
import { rollEvent, TripotEvent } from '../engine/events';
import { TopBar } from '../ui/common';
import { DrinkOverlay, EventOverlay, GiftOverlay } from '../ui/overlays';

type Gifts = Settlement['gains'];
type Flow =
  | { step: 'drink'; items: { playerId: string; amount: number; reason?: string }[]; gifts: Gifts }
  | { step: 'gift'; gifts: Gifts; fromEvent: boolean }
  | { step: 'event'; ev: TripotEvent };

const addOwed = (id: string, n: number) => setState((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, owed: p.owed + n } : p)) }));

/** Generic round pipeline: settle → "BOIS" → distributions → random event → next round. */
export default function GameScreen() {
  const gameId = useStore((s) => s.gameId);
  const players = useStore((s) => s.players);
  const mod = GAMES.find((g) => g.id === gameId)!;
  const [flow, setFlow] = useState<Flow | null>(null);
  const resolve = useRef<() => void>(() => undefined);

  const close = () => {
    setFlow(null);
    resolve.current();
  };

  const endRound = () => {
    const s = getState();
    setState({ rounds: s.rounds + 1, happyHour: Math.max(0, s.happyHour - 1) });
    const ev = s.settings.events ? rollEvent() : null;
    if (ev) setFlow({ step: 'event', ev });
    else close();
  };

  const nextGift = (gifts: Gifts, fromEvent = false) => {
    if (gifts.length) setFlow({ step: 'gift', gifts, fromEvent });
    else if (fromEvent) close();
    else endRound();
  };

  const finish = useCallback((outcomes: Outcome[], opts?: FinishOptions) => {
    return new Promise<void>((res) => {
      resolve.current = res;
      const st = settleRound(outcomes, getState().happyHour > 0 ? 2 : 1);
      applySettlement(st);
      for (const x of opts?.extra ?? []) addOwed(x.playerId, x.amount);
      const items = [...st.drinks, ...(opts?.extra ?? [])];
      const gifts = st.gains.filter((g) => g.amount > 0);
      if (items.length) setFlow({ step: 'drink', items, gifts });
      else nextGift(gifts);
    });
  }, []);

  const applyEvent = (ev: TripotEvent) => {
    const ranked = [...getState().players].sort((a, b) => score(b) - score(a));
    if (ev.id === 'happy') setState({ happyHour: 3 });
    if (ev.id === 'taxe') everyoneDrinks(1);
    if (ev.id === 'roi') addOwed(ranked[0].id, 2);
    if (ev.id === 'tournee') return nextGift([{ playerId: ranked[ranked.length - 1].id, amount: 2, capped: 0, raw: 2 }], true);
    close();
  };

  const byId = (id: string) => players.find((p) => p.id === id)!;

  return (
    <div className="h-full flex flex-col relative">
      <TopBar title={mod.name} />
      <div className="flex-1 min-h-0 relative flex flex-col">
        <mod.Component finish={finish} />
        {flow?.step === 'drink' && (
          <DrinkOverlay items={flow.items.map((d) => ({ p: byId(d.playerId), amount: d.amount, reason: d.reason }))} onDone={() => nextGift(flow.gifts)} />
        )}
        {flow?.step === 'gift' && (
          <GiftOverlay
            key={flow.gifts[0].playerId + flow.gifts.length}
            giver={byId(flow.gifts[0].playerId)}
            amount={flow.gifts[0].amount}
            capped={flow.gifts[0].capped}
            players={players}
            onDone={(split) => {
              applyGift(flow.gifts[0].playerId, split);
              nextGift(flow.gifts.slice(1), flow.fromEvent);
            }}
          />
        )}
        {flow?.step === 'event' && <EventOverlay ev={flow.ev} onDone={() => applyEvent(flow.ev)} />}
      </div>
    </div>
  );
}
