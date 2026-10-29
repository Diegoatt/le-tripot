import { useEffect, useState } from 'react';
import { useScene } from '../../pixi/useScene';
import { RouletteScene } from './scene';
import { RBet, betCote, betLabel, betWins, colorOf, spin } from './logic';
import { PlayerRail, StakePicker, usePlayerKeys } from '../../ui/common';
import { Player, unitWord, useStore } from '../../store';
import { wait } from '../../pixi/kit';
import { fmt } from '../../engine/odds';
import { sfx } from '../../audio/sfx';
import type { GameProps } from '../registry';

const history: number[] = [];
const same = (a: RBet, b: RBet) => JSON.stringify(a) === JSON.stringify(b);

export default function Roulette({ finish }: GameProps) {
  const { host, scene, ready } = useScene((st) => new RouletteScene(st));
  const players = useStore((s) => s.players);
  const minBet = useStore((s) => s.settings.minBet);
  const [phase, setPhase] = useState<'bet' | 'spin' | 'result'>('bet');
  const [active, setActive] = useState(0);
  const [stakes, setStakes] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, minBet])));
  const [bets, setBets] = useState<Record<string, RBet>>({});
  const [result, setResult] = useState<number | null>(null);

  usePlayerKeys((i) => (sfx.click(), setActive(i)), phase === 'bet');
  useEffect(() => setActive((a) => Math.min(a, players.length - 1)), [players.length]);

  const place = (b: RBet) => {
    if (phase !== 'bet') return;
    const p = players[active];
    sfx.chip();
    setBets({ ...bets, [p.id]: b });
    if (!stakes[p.id]) setStakes({ ...stakes, [p.id]: minBet });
    setActive((active + 1) % players.length);
  };

  const go = async () => {
    const n = spin(); // drawn before the animation
    setPhase('spin');
    setResult(null);
    await scene.current!.spin(n);
    scene.current!.reveal(n);
    setResult(n);
    history.unshift(n);
    history.length = Math.min(history.length, 14);
    setPhase('result');
    const anyWin = players.some((p) => bets[p.id] && betWins(bets[p.id], n));
    anyWin ? sfx.win() : sfx.lose();
    await wait(2.2);
    await finish(
      players
        .filter((p) => bets[p.id] && stakes[p.id] > 0)
        .map((p) => ({ playerId: p.id, stake: stakes[p.id], won: betWins(bets[p.id], n), cote: betCote(bets[p.id]), label: betLabel(bets[p.id]) })),
    );
    setBets({});
    setPhase('bet');
  };

  const chipsOn = (b: RBet) =>
    players
      .filter((p) => bets[p.id] && same(bets[p.id], b))
      .map((p, k) => <BetChip key={p.id} p={p} k={k} stake={stakes[p.id]} win={result !== null && betWins(b, result)} lose={result !== null && !betWins(b, result)} />);

  const Cell = ({ b, className, children, bg }: { b: RBet; className?: string; children: React.ReactNode; bg: string }) => {
    const hit = result !== null && betWins(b, result) && (b.kind !== 'plein' || b.n === result);
    return (
      <button
        onClick={() => place(b)}
        disabled={phase !== 'bet'}
        className={`relative rounded-xl display grid place-items-center transition-all duration-200 hover:brightness-125 hover:-translate-y-0.5 ${className}`}
        style={{ background: bg, boxShadow: hit ? '0 0 0 4px #ffe7a3, 0 0 40px #f4c14b' : 'inset 0 0 0 2px rgba(255,231,163,.35)' }}
      >
        {children}
        <div className="absolute inset-0 pointer-events-none">{chipsOn(b)}</div>
      </button>
    );
  };

  const numBg = (n: number) => (colorOf(n) === 'rouge' ? 'linear-gradient(180deg,#d4173a,#8e0c24)' : 'linear-gradient(180deg,#2a2530,#0e0b12)');

  return (
    <>
      <div className="flex-1 min-h-0 relative">
        <div ref={host} className="absolute inset-0" />
        <div className="absolute top-4 left-6 flex gap-1.5">
          {history.map((n, i) => (
            <div key={i} className="display w-9 h-9 grid place-items-center rounded-full text-[22px] fade-up" style={{ background: colorOf(n) === 'vert' ? '#0f8a4f' : colorOf(n) === 'rouge' ? '#c8102e' : '#222', opacity: 1 - i * 0.05 }}>
              {n}
            </div>
          ))}
        </div>
        <div
          className="absolute right-[3%] top-1/2 -translate-y-1/2 w-[44%] rounded-[28px] p-5 flex flex-col gap-3"
          style={{ background: 'radial-gradient(circle at 50% 30%, #13704a, #0a3d29 80%)', boxShadow: 'inset 0 0 0 6px #5b3414, inset 0 0 0 9px #f4c14b88, 0 30px 80px rgba(0,0,0,.6)' }}
        >
          <div className="flex items-center justify-between">
            <div className="display text-[34px] text-gold-hi">Tapis</div>
            {phase === 'bet' && (
              <div className="text-[18px] font-bold rounded-full px-3 py-1" style={{ background: players[active]?.color, color: '#120a10' }}>
                À {players[active]?.avatar} {players[active]?.name} de poser (clic sur une case)
              </div>
            )}
          </div>
          <Cell b={{ kind: 'plein', n: 0 }} className="h-16 text-[40px]" bg="linear-gradient(180deg,#14a35f,#0a5c35)">
            0 <span className="absolute right-3 text-[18px] text-white/70">plein x{betCote({ kind: 'plein', n: 0 })}</span>
          </Cell>
          {[0, 1, 2].map((tier) => (
            <div key={tier} className="grid grid-cols-[repeat(4,1fr)_1.3fr] gap-2">
              {[1, 2, 3, 4].map((k) => {
                const n = tier * 4 + k;
                return (
                  <Cell key={n} b={{ kind: 'plein', n }} className="h-[68px] text-[40px]" bg={numBg(n)}>
                    {n}
                  </Cell>
                );
              })}
              <Cell b={{ kind: 'tiers', tier: tier as 0 | 1 | 2 }} className="h-[68px] text-[26px] leading-none" bg="linear-gradient(180deg,#1d5c43,#103828)">
                {tier * 4 + 1}-{tier * 4 + 4}
                <span className="text-[16px] text-gold-hi">tiers x{betCote({ kind: 'tiers', tier: 0 })}</span>
              </Cell>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <Cell b={{ kind: 'rouge' }} className="h-[72px] text-[38px]" bg="linear-gradient(180deg,#d4173a,#8e0c24)">
              ◆ Rouge <span className="text-[18px] text-white/70">x{betCote({ kind: 'rouge' })}</span>
            </Cell>
            <Cell b={{ kind: 'noir' }} className="h-[72px] text-[38px]" bg="linear-gradient(180deg,#2a2530,#0e0b12)">
              ◆ Noir <span className="text-[18px] text-white/70">x{betCote({ kind: 'noir' })}</span>
            </Cell>
          </div>
          {phase === 'bet' && (
            <button className="btn btn-gold text-[38px] py-2" disabled={!ready || !Object.keys(bets).length} onClick={() => (sfx.click(), go())}>
              Lancer la bille
            </button>
          )}
          {phase !== 'bet' && <div className="display text-center text-[38px] text-gold-hi py-1">{phase === 'spin' ? 'Rien ne va plus…' : `Le ${result} sort !`}</div>}
        </div>
      </div>
      <PlayerRail
        glow={(p) => (phase === 'bet' ? players[active]?.id === p.id : result !== null && !!bets[p.id] && betWins(bets[p.id], result))}
        status={(p) =>
          bets[p.id] ? (
            <span>
              {betLabel(bets[p.id])} · <span className="text-gold">x{fmt(betCote(bets[p.id]))}</span>
              {result !== null && (betWins(bets[p.id], result) ? <span className="text-green-400"> · gagné</span> : <span className="text-ruby"> · perdu</span>)}
            </span>
          ) : (
            <span className="text-white/40">Pas de pari</span>
          )
        }
        render={(p, i) =>
          phase === 'bet' && (
            <div onClick={() => setActive(i)}>
              <StakePicker allowZero={false} value={stakes[p.id] ?? minBet} color={p.color} onChange={(v) => setStakes({ ...stakes, [p.id]: v })} />
              <div className="text-[14px] text-white/50 mt-1">{unitWord(stakes[p.id] ?? minBet)} misée(s)</div>
            </div>
          )
        }
      />
    </>
  );
}

function BetChip({ p, k, stake, win, lose }: { p: Player; k: number; stake: number; win: boolean; lose: boolean }) {
  return (
    <div
      className="chip absolute pop-in transition-all duration-700"
      style={{
        ['--c' as string]: p.color,
        ['--s' as string]: '40px',
        right: 6 + k * 14,
        top: 4 - k * 4,
        opacity: lose ? 0 : 1,
        transform: lose ? 'translateY(-60px) scale(.5)' : win ? 'scale(1.25)' : undefined,
        boxShadow: win ? `0 0 24px ${p.color}` : undefined,
        fontSize: 18,
      }}
    >
      {stake}
    </div>
  );
}
