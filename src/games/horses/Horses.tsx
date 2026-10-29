import { useState } from 'react';
import { useScene } from '../../pixi/useScene';
import { HorsesScene } from './scene';
import { HORSES, drawRace, horseCote } from './logic';
import { PlayerRail, StakePicker } from '../../ui/common';
import { useStore } from '../../store';
import { fmt } from '../../engine/odds';
import { sfx } from '../../audio/sfx';
import type { GameProps } from '../registry';

const css = (n: number) => '#' + n.toString(16).padStart(6, '0');

export default function Horses({ finish }: GameProps) {
  const { host, scene, ready } = useScene((st) => new HorsesScene(st));
  const players = useStore((s) => s.players);
  const minBet = useStore((s) => s.settings.minBet);
  const [phase, setPhase] = useState<'bet' | 'race' | 'done'>('bet');
  const [stakes, setStakes] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, minBet])));
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [winner, setWinner] = useState<number | null>(null);

  const start = async () => {
    const plan = drawRace(); // the winner is drawn first, the race only stages it
    setPhase('race');
    setWinner(null);
    await scene.current!.race(plan);
    setWinner(plan.winner);
    setPhase('done');
    await finish(
      players
        .filter((p) => picks[p.id] !== undefined && stakes[p.id] > 0)
        .map((p) => ({ playerId: p.id, stake: stakes[p.id], won: picks[p.id] === plan.winner, cote: horseCote(picks[p.id]) })),
    );
    scene.current?.reset();
    setPicks({});
    setPhase('bet');
  };

  return (
    <>
      <div className="flex-1 min-h-0 relative">
        <div ref={host} className="absolute inset-0" />
        {phase === 'bet' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-3 fade-up">
            {HORSES.map((h, i) => (
              <div key={h.name} className="panel px-4 py-2 text-center whitespace-nowrap" style={{ borderColor: css(h.color) }}>
                <div className="display text-[28px]" style={{ color: css(h.color) }}>
                  {i + 1}. {h.name}
                </div>
                <div className="text-[18px] font-bold">
                  cote <span className="text-gold">x{fmt(horseCote(i))}</span> · {Math.round(h.p * 100)} %
                </div>
              </div>
            ))}
          </div>
        )}
        {phase === 'bet' && (
          <button className="absolute bottom-[130px] left-1/2 -translate-x-1/2 btn btn-gold text-[44px] px-14 py-3 pop-in" disabled={!ready || !Object.keys(picks).length} onClick={() => (sfx.click(), start())}>
            🏁 Départ
          </button>
        )}
      </div>
      <PlayerRail
        glow={(p) => winner !== null && picks[p.id] === winner}
        status={(p) =>
          picks[p.id] !== undefined ? (
            <span style={{ color: css(HORSES[picks[p.id]].color) }}>
              Sur {HORSES[picks[p.id]].name} · x{fmt(horseCote(picks[p.id]))}
              {winner !== null && (picks[p.id] === winner ? ' · gagné !' : ' · perdu')}
            </span>
          ) : (
            <span className="text-white/40">Choisis ton cheval</span>
          )
        }
        render={(p) =>
          phase === 'bet' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {HORSES.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => (sfx.chip(), setPicks({ ...picks, [p.id]: i }))}
                    className="btn display flex-1 text-[22px] py-1"
                    style={{ background: picks[p.id] === i ? css(h.color) : css(h.color) + '33', color: picks[p.id] === i ? '#120a10' : '#fff', outline: picks[p.id] === i ? '2px solid #ffe7a3' : undefined }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <StakePicker allowZero={false} value={stakes[p.id] ?? minBet} color={p.color} onChange={(v) => setStakes({ ...stakes, [p.id]: v })} />
            </div>
          )
        }
      />
    </>
  );
}
