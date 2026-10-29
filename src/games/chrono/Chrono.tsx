import { useEffect, useRef, useState } from 'react';
import { useScene } from '../../pixi/useScene';
import { ChronoScene } from './scene';
import { TARGET, judge } from './logic';
import { PlayerRail, StakePicker, usePlayerKeys } from '../../ui/common';
import { getState, unitWord, useStore } from '../../store';
import { hex } from '../../pixi/kit';
import { sfx } from '../../audio/sfx';
import type { GameProps } from '../registry';

const TIMEOUT = 20_000;

export default function Chrono({ finish }: GameProps) {
  const { host, scene, ready } = useScene((st) => new ChronoScene(st));
  const players = useStore((s) => s.players);
  const minBet = useStore((s) => s.settings.minBet);
  const win = useStore((s) => s.settings.chronoWindow);
  const [phase, setPhase] = useState<'bet' | 'count' | 'blind' | 'reveal'>('bet');
  const [stakes, setStakes] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, minBet])));
  const [times, setTimes] = useState<Record<string, number>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const t0 = useRef(0);
  const timesRef = useRef(times);
  const ended = useRef<() => void>(() => undefined);
  const inGame = players.filter((p) => stakes[p.id] > 0);

  useEffect(() => {
    if (ready) scene.current?.idle(`Fenêtre : ±${win.toFixed(2).replace('.', ',')} s`);
  }, [ready, win]);

  usePlayerKeys((i) => {
    const p = players[i];
    if (!p || !stakes[p.id] || timesRef.current[p.id] !== undefined) return;
    const t = (performance.now() - t0.current) / 1000;
    timesRef.current = { ...timesRef.current, [p.id]: t };
    setTimes(timesRef.current);
    scene.current?.pressed(i, players.length, p.avatar, hex(p.color));
    if (inGame.every((x) => timesRef.current[x.id] !== undefined)) ended.current();
  }, phase === 'blind');

  const start = async () => {
    timesRef.current = {};
    setTimes({});
    setShown({});
    setPhase('count');
    await scene.current!.countdown();
    t0.current = performance.now();
    setPhase('blind');
    // shortcut: pausing during the blind phase does not stop the clock; it is 20 s at most.
    await new Promise<void>((r) => {
      const id = setTimeout(r, TIMEOUT);
      ended.current = () => (clearTimeout(id), r());
    });
    setPhase('reveal');
    sfx.drum(1);
    const entries = inGame.map((p) => ({ playerId: p.id, stake: stakes[p.id], time: timesRef.current[p.id] ?? null }));
    const w = getState().settings.chronoWindow;
    const err = (t: number | null) => (t === null ? 99 : Math.abs(t - TARGET));
    // Worst first, best last: the suspense builds.
    for (const e of [...entries].sort((a, b) => err(b.time) - err(a.time))) {
      const p = players.find((x) => x.id === e.playerId)!;
      await scene.current!.reveal(p.avatar, p.name, hex(p.color), e.time, err(e.time) <= w + 1e-9);
      setShown((s) => ({ ...s, [p.id]: true }));
    }
    await finish(judge(entries, w));
    scene.current?.idle(`Fenêtre : ±${w.toFixed(2).replace('.', ',')} s`);
    setPhase('bet');
  };

  return (
    <>
      <div className="flex-1 min-h-0 relative">
        <div ref={host} className="absolute inset-0" />
        {phase === 'bet' && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <button className="btn btn-gold text-[44px] px-14 py-3 pop-in" disabled={!ready || inGame.length < 1} onClick={() => (sfx.click(), start())}>
              ⏱️ Lancer le chrono
            </button>
            <div className="text-white/60 text-[18px]">Tout le monde en même temps : appuie sur TA touche quand tu penses être à 10,00 s</div>
          </div>
        )}
        {phase === 'blind' && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/40 text-[20px]">
            Personne dans la fenêtre ? Tout le monde boit sa mise.
          </div>
        )}
      </div>
      <PlayerRail
        dim={(p) => phase !== 'bet' && !stakes[p.id]}
        glow={(p) => phase === 'blind' && times[p.id] === undefined && !!stakes[p.id]}
        status={(p) => {
          if (phase === 'bet') return <span className="text-white/60">Mise : {stakes[p.id] ? unitWord(stakes[p.id]) : 'ne joue pas'}</span>;
          if (!stakes[p.id]) return null;
          if (shown[p.id]) {
            const t = times[p.id];
            const ok = t !== undefined && Math.abs(t - TARGET) <= win + 1e-9;
            return <span className={ok ? 'text-green-400' : 'text-ruby'}>{t === undefined ? '—' : `${t.toFixed(2).replace('.', ',')} s`}</span>;
          }
          return times[p.id] !== undefined ? <span className="text-white/70">✓ Arrêté</span> : <span className="text-white/50">Touche {players.indexOf(p) + 1}…</span>;
        }}
        render={(p) => phase === 'bet' && <StakePicker value={stakes[p.id] ?? 0} color={p.color} onChange={(v) => setStakes({ ...stakes, [p.id]: v })} />}
      />
    </>
  );
}
