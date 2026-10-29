import { useEffect, useRef, useState } from 'react';
import { useScene } from '../../pixi/useScene';
import { BusScene } from './scene';
import { ATTEMPTS, FLOORS, busCote, floorWins } from './logic';
import { Card, newDeck } from '../cards';
import { PlayerRail, StakePicker } from '../../ui/common';
import { unitWord, useStore } from '../../store';
import { hex } from '../../pixi/kit';
import { fmt } from '../../engine/odds';
import { sfx } from '../../audio/sfx';
import type { GameProps } from '../registry';

let turn = 0;
const SIDE_MAX = 3;

export default function Bus({ finish }: GameProps) {
  const { host, scene, ready } = useScene((st) => new BusScene(st));
  const players = useStore((s) => s.players);
  const minBet = useStore((s) => s.settings.minBet);
  const maxBet = useStore((s) => s.settings.maxBet);
  const [activeIdx, setActiveIdx] = useState(turn % players.length);
  const climber = players[activeIdx];
  const [phase, setPhase] = useState<'bet' | 'choose' | 'anim' | 'end'>('bet');
  const [stakes, setStakes] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, minBet])));
  const [sides, setSides] = useState<Record<string, 'pour' | 'contre'>>({});
  const [attempt, setAttempt] = useState(0);
  const [floor, setFloor] = useState(0);
  const deck = useRef<Card[]>([]);

  useEffect(() => {
    if (!ready) return;
    scene.current?.setClimber(climber.avatar, hex(climber.color));
    scene.current?.setInfo(`${climber.name} prend le bus`);
  }, [ready, activeIdx]);

  const startAttempt = async (a: number) => {
    deck.current = newDeck(); // the whole attempt is drawn up front
    setAttempt(a);
    setFloor(0);
    setPhase('anim');
    scene.current!.setInfo(`Essai ${a + 1} / ${ATTEMPTS}`);
    await scene.current!.startAttempt(deck.current[0]);
    setPhase('choose');
  };

  const done = async (top: boolean) => {
    setPhase('end');
    await finish(
      players
        .filter((p) => (p.id === climber.id || sides[p.id]) && stakes[p.id] > 0)
        .map((p) => {
          const side = p.id === climber.id ? 'pour' : sides[p.id];
          return { playerId: p.id, stake: p.id === climber.id ? stakes[p.id] : Math.min(SIDE_MAX, stakes[p.id]), won: (side === 'pour') === top, cote: busCote(side) };
        }),
    );
    turn++;
    setSides({});
    setActiveIdx(turn % players.length);
    setPhase('bet');
  };

  const pick = async (plus: boolean) => {
    setPhase('anim');
    const cur = deck.current[floor];
    const next = deck.current[floor + 1];
    const ok = floorWins(plus, cur, next);
    await scene.current!.step(next, ok);
    if (ok && floor + 1 === FLOORS) {
      await scene.current!.summit();
      return done(true);
    }
    if (ok) {
      setFloor(floor + 1);
      setPhase('choose');
      return;
    }
    if (attempt + 1 < ATTEMPTS) {
      scene.current!.setInfo('Dernière chance…');
      return startAttempt(attempt + 1);
    }
    done(false);
  };

  return (
    <>
      <div className="flex-1 min-h-0 relative">
        <div ref={host} className="absolute inset-0" />
        <div className="absolute bottom-5 right-6 panel px-5 py-3 text-[20px] font-semibold">
          Pour : <span className="text-gold">x{fmt(busCote('pour'))}</span> · Contre : <span className="text-gold">x{fmt(busCote('contre'))}</span>
          <div className="text-[15px] text-white/50">{ATTEMPTS} essais pour monter 4 étages · plus ou moins que la carte</div>
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-4">
          {phase === 'bet' && (
            <button className="btn btn-gold text-[42px] px-12 py-3 pop-in" disabled={!ready || !stakes[climber.id]} onClick={() => (sfx.click(), startAttempt(0))}>
              🚌 {climber.name} monte
            </button>
          )}
          {phase === 'choose' && (
            <>
              <button className="btn btn-red text-[46px] px-12 py-2 pop-in" onClick={() => pick(true)}>
                ▲ Plus
              </button>
              <button className="btn btn-ghost text-[46px] px-12 py-2 pop-in" onClick={() => pick(false)}>
                ▼ Moins
              </button>
            </>
          )}
        </div>
      </div>
      <PlayerRail
        glow={(p) => p.id === climber.id}
        status={(p) =>
          p.id === climber.id ? (
            <span className="text-gold">🚌 Grimpe · étage {floor}/{FLOORS}</span>
          ) : sides[p.id] ? (
            <span>
              Parie <b className={sides[p.id] === 'pour' ? 'text-green-400' : 'text-ruby'}>{sides[p.id]}</b> · {unitWord(stakes[p.id])}
            </span>
          ) : (
            <span className="text-white/40">Ne parie pas</span>
          )
        }
        render={(p) =>
          phase === 'bet' &&
          (p.id === climber.id ? (
            <StakePicker allowZero={false} value={stakes[p.id] ?? minBet} color={p.color} onChange={(v) => setStakes({ ...stakes, [p.id]: v })} />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {(['pour', 'contre'] as const).map((s) => (
                  <button
                    key={s}
                    className={`btn flex-1 text-[22px] py-1 ${sides[p.id] === s ? 'btn-gold' : 'btn-ghost'}`}
                    onClick={() => {
                      sfx.chip();
                      const n = { ...sides };
                      if (n[p.id] === s) delete n[p.id];
                      else n[p.id] = s;
                      setSides(n);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <StakePicker allowZero={false} max={Math.min(SIDE_MAX, maxBet)} value={Math.min(stakes[p.id] ?? minBet, SIDE_MAX)} color={p.color} onChange={(v) => setStakes({ ...stakes, [p.id]: v })} />
            </div>
          ))
        }
      />
    </>
  );
}
