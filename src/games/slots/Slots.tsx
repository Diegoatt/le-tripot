import { useEffect, useState } from 'react';
import { useScene } from '../../pixi/useScene';
import { SlotsScene } from './scene';
import { SlotResult, pull } from './logic';
import { PlayerRail, StakePicker, usePlayerKeys } from '../../ui/common';
import { unitWord, useStore } from '../../store';
import { sfx } from '../../audio/sfx';
import type { GameProps } from '../registry';

export default function Slots({ finish }: GameProps) {
  const { host, scene, ready } = useScene((st) => new SlotsScene(st));
  const players = useStore((s) => s.players);
  const minBet = useStore((s) => s.settings.minBet);
  const [phase, setPhase] = useState<'bet' | 'play'>('bet');
  const [stakes, setStakes] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, minBet])));
  const [queue, setQueue] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, SlotResult>>({});
  const [busy, setBusy] = useState(false);
  const current = players.find((p) => p.id === queue[0]);

  useEffect(() => {
    if (ready && phase === 'bet') scene.current?.setTurn('Misez, puis tirez le levier chacun votre tour');
  }, [ready, phase]);
  useEffect(() => {
    if (current) scene.current?.setTurn(`À ${current.name} : touche ${players.indexOf(current) + 1} ou LEVIER`);
  }, [current?.id]);

  const start = () => {
    setResults({});
    setQueue(players.filter((p) => stakes[p.id] > 0).map((p) => p.id));
    setPhase('play');
  };

  const play = async () => {
    if (!current || busy) return;
    setBusy(true);
    const r = pull(); // drawn before the animation
    const sc = scene.current!;
    await sc.spin(r.reels);
    if (r.line.cote > 0) await sc.celebrate(r.line.cote);
    else await sc.lose();
    const all = { ...results, [current.id]: r };
    setResults(all);
    const rest = queue.slice(1);
    setQueue(rest);
    setBusy(false);
    if (rest.length) return;
    sc.clear();
    const jackpots = Object.entries(all).filter(([, x]) => x.line.id === 'jackpot');
    await finish(
      Object.entries(all).map(([id, x]) => ({ playerId: id, stake: stakes[id], won: x.line.cote > 0, cote: x.line.cote })),
      {
        extra: jackpots.flatMap(([id]) => players.filter((p) => p.id !== id).map((p) => ({ playerId: p.id, amount: 1, reason: `Jackpot de ${players.find((x) => x.id === id)?.name} 🎰` }))),
      },
    );
    setPhase('bet');
  };

  usePlayerKeys((i) => players[i]?.id === current?.id && play(), phase === 'play');

  return (
    <>
      <div className="flex-1 min-h-0 relative">
        <div ref={host} className="absolute inset-0" />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          {phase === 'bet' ? (
            <button className="btn btn-gold text-[44px] px-14 py-3 pop-in" disabled={!ready || !players.some((p) => stakes[p.id] > 0)} onClick={() => (sfx.click(), start())}>
              🎰 À vos leviers
            </button>
          ) : (
            current && (
              <button className="btn display text-[44px] px-14 py-3 pulse-glow" disabled={busy} style={{ background: current.color, color: '#120a10', ['--g' as string]: current.color }} onClick={play}>
                {current.avatar} Tirer le levier [{players.indexOf(current) + 1}]
              </button>
            )
          )}
        </div>
      </div>
      <PlayerRail
        glow={(p) => p.id === current?.id}
        dim={(p) => phase === 'play' && !stakes[p.id]}
        status={(p) => {
          const r = results[p.id];
          if (r) return r.line.cote > 0 ? <span className="text-gold">{r.line.id === 'jackpot' ? 'JACKPOT x10 !' : `Gagné ${r.line.id}`}</span> : <span className="text-ruby">Perdu</span>;
          if (phase === 'play') return stakes[p.id] ? <span className="text-white/60">{p.id === current?.id ? 'À toi !' : 'En attente…'}</span> : null;
          return <span className="text-white/60">Mise : {stakes[p.id] ? unitWord(stakes[p.id]) : 'ne joue pas'}</span>;
        }}
        render={(p) => phase === 'bet' && <StakePicker value={stakes[p.id] ?? 0} color={p.color} onChange={(v) => setStakes({ ...stakes, [p.id]: v })} />}
      />
    </>
  );
}
