import { useEffect } from 'react';
import { Player, go, resetEvening, score, useStore } from '../store';
import { Avatar, Logo } from '../ui/common';
import { FloatingChips } from './Title';
import { fmt } from '../engine/odds';
import { sfx } from '../audio/sfx';

interface Award {
  icon: string;
  title: string;
  pick: (ps: Player[]) => Player;
  line: (p: Player) => string;
}

const by = (f: (p: Player) => number) => (ps: Player[]) => [...ps].sort((a, b) => f(b) - f(a))[0];

const AWARDS: Award[] = [
  { icon: '🧽', title: 'L’Éponge', pick: by((p) => p.drunk), line: (p) => `${fmt(p.drunk)} bues` },
  { icon: '🏦', title: 'Le Banquier', pick: by((p) => p.given), line: (p) => `${fmt(p.given)} distribuées` },
  { icon: '🐈‍⬛', title: 'Le Chat noir', pick: by((p) => p.losses), line: (p) => `${p.losses} manches perdues` },
  { icon: '🎯', title: 'Le Sniper', pick: by((p) => p.wins), line: (p) => `${p.wins} manches gagnées` },
  { icon: '💣', title: 'Le Distributeur fou', pick: by((p) => p.bestGift), line: (p) => `${fmt(p.bestGift)} d’un coup` },
  { icon: '😇', title: 'L’Ange gardien', pick: by((p) => -p.drunk), line: (p) => `seulement ${fmt(p.drunk)} bues` },
];

export default function End() {
  const players = useStore((s) => s.players);
  const ranked = [...players].sort((a, b) => score(b) - score(a));
  useEffect(() => sfx.bigWin(), []);
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  return (
    <div className="h-full relative overflow-hidden flex flex-col screen-enter">
      <FloatingChips n={12} />
      <div className="relative flex items-center px-8 h-[84px]">
        <Logo size={44} />
        <div className="flex-1" />
        <button className="btn btn-ghost text-[22px] px-5 h-12" onClick={() => go('lobby')}>
          ← Retour au casino
        </button>
      </div>
      <div className="relative text-center display gold-text text-[96px] fade-up">Fin de soirée</div>
      <div className="relative flex-1 min-h-0 grid grid-cols-[1.1fr_1fr] gap-8 px-10 pb-8">
        <div className="flex items-end justify-center gap-6">
          {podium.map((p) => {
            const rank = ranked.indexOf(p);
            const h = [240, 175, 125][rank];
            return (
              <div key={p.id} className="flex flex-col items-center gap-3 fade-up" style={{ animationDelay: `${0.6 + (2 - rank) * 0.5}s` }}>
                <div className="text-[54px]">{['👑', '🥈', '🥉'][rank]}</div>
                <Avatar p={p} size={rank === 0 ? 130 : 100} />
                <div className="text-[28px] font-extrabold" style={{ color: p.color }}>
                  {p.name}
                </div>
                <div
                  className="w-[200px] rounded-t-2xl grid place-items-center display text-[90px]"
                  style={{ height: h, background: `linear-gradient(180deg, ${p.color}, ${p.color}33)`, boxShadow: `0 0 40px ${p.color}66` }}
                >
                  {rank + 1}
                </div>
                <div className="display text-[30px] text-gold">
                  solde {score(p) > 0 ? '+' : ''}
                  {fmt(score(p))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 justify-center">
          {AWARDS.map((a, i) => {
            const p = a.pick(players);
            return (
              <div key={a.title} className="panel px-5 py-3 flex items-center gap-4 fade-up" style={{ animationDelay: `${2 + i * 0.25}s` }}>
                <div className="text-[46px]">{a.icon}</div>
                <div className="flex-1">
                  <div className="display text-[34px] text-gold-hi">{a.title}</div>
                  <div className="text-[18px] text-white/60">{a.line(p)}</div>
                </div>
                <Avatar p={p} size={56} />
                <div className="text-[24px] font-bold w-36 truncate" style={{ color: p.color }}>
                  {p.name}
                </div>
              </div>
            );
          })}
          <button className="btn btn-red text-[26px] py-3 mt-3 fade-up" style={{ animationDelay: '3.6s' }} onClick={() => (resetEvening(), go('setup'))}>
            Nouvelle soirée (remise à zéro)
          </button>
        </div>
      </div>
    </div>
  );
}
