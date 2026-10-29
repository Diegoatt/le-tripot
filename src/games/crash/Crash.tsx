import { useEffect, useRef, useState } from 'react';
import { useScene } from '../../pixi/useScene';
import { CrashScene } from './scene';
import { MAX_MULT, cashoutCote, drawCrash } from './logic';
import { PlayerRail, StakePicker, usePlayerKeys } from '../../ui/common';
import { getState, unitWord, useStore } from '../../store';
import { hex, wait } from '../../pixi/kit';
import type { GameProps } from '../registry';
import { fmt } from '../../engine/odds';
import { sfx } from '../../audio/sfx';

const history: number[] = [];

export default function Crash({ finish }: GameProps) {
  const { host, scene, ready } = useScene((st) => new CrashScene(st));
  const players = useStore((s) => s.players);
  const minBet = useStore((s) => s.settings.minBet);
  const [phase, setPhase] = useState<'bet' | 'flight' | 'result'>('bet');
  const [stakes, setStakes] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, minBet])));
  const [cashed, setCashed] = useState<Record<string, number>>({});
  const [live, setLive] = useState(1);
  const cashedRef = useRef(cashed);
  cashedRef.current = cashed;

  useEffect(() => {
    if (ready) scene.current?.idle('PRÊT AU DÉCOLLAGE');
  }, [ready]);

  useEffect(() => {
    if (phase !== 'flight') return;
    const id = setInterval(() => setLive(scene.current?.multiplier ?? 1), 100);
    return () => clearInterval(id);
  }, [phase]);

  const cashout = (i: number) => {
    const p = getState().players[i];
    const sc = scene.current;
    if (!p || !sc || phase !== 'flight' || !sc.flying || !stakes[p.id] || cashedRef.current[p.id]) return;
    const m = sc.multiplier;
    cashedRef.current = { ...cashedRef.current, [p.id]: m };
    setCashed(cashedRef.current);
    sc.markCashout(p.avatar, p.name, hex(p.color), m);
  };
  usePlayerKeys(cashout, phase === 'flight');

  const launch = async () => {
    const sc = scene.current!;
    const crashAt = drawCrash(); // drawn before any animation
    setCashed({});
    cashedRef.current = {};
    setPhase('flight');
    await sc.countdown();
    const end = await sc.fly(crashAt);
    history.unshift(crashAt);
    history.length = Math.min(history.length, 12);
    const final = { ...cashedRef.current };
    if (end === 'cap') for (const p of players) if (stakes[p.id] && !final[p.id]) final[p.id] = MAX_MULT;
    setCashed(final);
    setPhase('result');
    await wait(1.8);
    await finish(
      players
        .filter((p) => stakes[p.id] > 0)
        .map((p) => ({ playerId: p.id, stake: stakes[p.id], won: !!final[p.id], cote: final[p.id] ? cashoutCote(final[p.id]) : 0 })),
    );
    setPhase('bet');
    sc.idle('PRÊT AU DÉCOLLAGE');
  };

  const anyStake = players.some((p) => stakes[p.id] > 0);

  return (
    <>
      <div className="flex-1 min-h-0 relative">
        <div ref={host} className="absolute inset-0" />
        <div className="absolute top-4 left-6 flex gap-2">
          {history.map((m, i) => (
            <div key={i} className="display text-[22px] px-3 py-0.5 rounded-full fade-up" style={{ background: m >= 2 ? '#f4c14b22' : '#ff2d5522', color: m >= MAX_MULT ? '#f4c14b' : m >= 2 ? '#ffe7a3' : '#ff6b81' }}>
              {m.toFixed(2)}x
            </div>
          ))}
        </div>
        {phase === 'bet' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <button className="btn btn-red text-[46px] px-16 py-3 pop-in" disabled={!ready || !anyStake} onClick={() => (sfx.click(), launch())}>
              🚀 Décollage
            </button>
            <div className="text-white/60 text-[18px]">En vol : chacun appuie sur SA touche pour encaisser · plafond x6 encaissé automatiquement</div>
          </div>
        )}
      </div>
      <PlayerRail
        glow={(p) => !!cashed[p.id]}
        dim={(p) => phase !== 'bet' && !stakes[p.id]}
        status={(p) => {
          if (phase === 'bet') return <span className="text-white/60">Mise : {stakes[p.id] ? unitWord(stakes[p.id]) : 'ne joue pas'}</span>;
          if (!stakes[p.id]) return <span className="text-white/40">Spectateur</span>;
          if (cashed[p.id]) {
            const gain = stakes[p.id] * cashoutCote(cashed[p.id]);
            return <span style={{ color: p.color }}>✓ {cashed[p.id].toFixed(2)}x → {gain > 0 ? `distribue ${fmt(gain)}` : 'sauvé, ne boit pas'}</span>;
          }
          if (phase === 'result') return <span className="text-ruby">💥 Boit {unitWord(stakes[p.id])}</span>;
          return (
            <span className="text-white/80">
              En vol · si j’encaisse : <b className="text-gold">+{fmt(stakes[p.id] * cashoutCote(live))}</b>
            </span>
          );
        }}
        render={(p, i) =>
          phase === 'bet' ? (
            <StakePicker value={stakes[p.id] ?? 0} color={p.color} onChange={(v) => setStakes({ ...stakes, [p.id]: v })} />
          ) : phase === 'flight' && stakes[p.id] && !cashed[p.id] ? (
            <button className="btn display text-[30px] py-2 pulse-glow" style={{ background: p.color, color: '#120a10', ['--g' as string]: p.color }} onClick={() => cashout(i)}>
              ENCAISSER [{i + 1}]
            </button>
          ) : null
        }
      />
    </>
  );
}
