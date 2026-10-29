import { useRef } from 'react';
import { GAMES, GameModule } from '../games/registry';
import { go, useStore } from '../store';
import { sfx } from '../audio/sfx';
import { Logo, Ranking, SoundButton } from '../ui/common';
import { setPaused } from '../store';

function TableCard({ g, i }: { g: GameModule; i: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const tilt = (e: React.PointerEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateY(-8px) scale(1.03)`;
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
    el.style.setProperty('--my', `${(y + 0.5) * 100}%`);
  };
  const reset = () => (ref.current!.style.transform = '');
  return (
    <button
      ref={ref}
      onPointerMove={tilt}
      onPointerEnter={() => sfx.hover()}
      onPointerLeave={reset}
      onClick={() => (sfx.whoosh(), go('game', g.id))}
      className="group relative overflow-hidden rounded-[26px] text-left fade-up transition-[transform,box-shadow] duration-200 ease-out"
      style={{
        animationDelay: `${i * 0.06}s`,
        background: `radial-gradient(circle at var(--mx,50%) var(--my,30%), ${g.accent}55, transparent 55%), linear-gradient(160deg, #1b0d16, #0b070c)`,
        border: `1px solid ${g.accent}66`,
        boxShadow: `0 20px 50px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06)`,
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: `inset 0 0 60px ${g.accent}66, 0 0 40px ${g.accent}55` }} />
      <div className="absolute -right-6 -top-8 text-[170px] opacity-20 group-hover:opacity-40 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">{g.icon}</div>
      <div className="relative h-full p-6 flex flex-col justify-end gap-1">
        <div className="text-[64px] leading-none mb-2 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6 origin-bottom-left">{g.icon}</div>
        <div className="display text-[50px]" style={{ color: '#fff', textShadow: `0 0 24px ${g.accent}` }}>
          {g.name}
        </div>
        <div className="text-[19px] text-white/75 font-semibold">{g.tagline}</div>
        <div className="mt-2 inline-flex self-start rounded-full px-3 py-1 text-[15px] font-bold" style={{ background: `${g.accent}33`, color: g.accent }}>
          {g.odds}
        </div>
      </div>
    </button>
  );
}

export default function Lobby() {
  const rounds = useStore((s) => s.rounds);
  return (
    <div className="h-full flex flex-col screen-enter">
      <div className="flex items-center gap-5 px-8 h-[84px] shrink-0">
        <Logo size={48} />
        <div className="flex-1 flex justify-center">
          <Ranking />
        </div>
        <button className="btn btn-ghost text-[20px] px-4 h-11" onClick={() => go('setup')}>
          ⚙ Joueurs & réglages
        </button>
        <button className="btn btn-red text-[20px] px-4 h-11" onClick={() => setPaused(true)}>
          ⏸ Pause
        </button>
        <SoundButton />
      </div>
      <div className="px-8 flex items-end justify-between mb-4">
        <div>
          <div className="display text-[64px] gold-text">Choisissez votre table</div>
          <div className="text-white/60 text-[20px]">{rounds} manche{rounds > 1 ? 's' : ''} jouée{rounds > 1 ? 's' : ''} ce soir</div>
        </div>
        <button className="btn btn-gold text-[28px] px-8 py-3" onClick={() => (sfx.fanfare(), go('end'))}>
          🌙 Fin de soirée
        </button>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-4 grid-rows-2 gap-5 px-8 pb-8">
        {GAMES.map((g, i) => (
          <TableCard key={g.id} g={g} i={i} />
        ))}
        <div className="rounded-[26px] border border-dashed border-white/10 p-6 flex flex-col justify-center gap-2 text-white/50 fade-up" style={{ animationDelay: '0.45s' }}>
          <div className="display text-[34px] text-white/70">Règles de la maison</div>
          <div className="text-[17px]">Perdu : tu bois ta mise. Gagné : tu distribues mise × cote.</div>
          <div className="text-[17px]">Max 8 gorgées distribuées par manche. Cotes plafonnées à x10.</div>
          <div className="text-[17px]">La banque gagne toujours un peu. Bois de l’eau.</div>
        </div>
      </div>
    </div>
  );
}
