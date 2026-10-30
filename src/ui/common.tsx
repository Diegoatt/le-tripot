import { ReactNode, useEffect, useRef, useState } from 'react';
import { Player, drinkAll, getState, go, passDrink, score, setPaused, setState, unitWord, useStore } from '../store';
import { sfx, syncVolume } from '../audio/sfx';
import { fmt } from '../engine/odds';
import { randInt } from '../engine/rng';

export function Avatar({ p, size = 56, ring = true }: { p: Player; size?: number; ring?: boolean }) {
  return (
    <div
      className="grid place-items-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.56,
        background: `radial-gradient(circle at 35% 30%, ${p.color}55, #120a10 70%)`,
        boxShadow: ring ? `0 0 0 3px ${p.color}, 0 0 22px ${p.color}88` : undefined,
      }}
    >
      {p.avatar}
    </div>
  );
}

export function Chip({ value, color = '#e0193f', size = 54, onClick, active, title }: { value: ReactNode; color?: string; size?: number; onClick?: () => void; active?: boolean; title?: string }) {
  return (
    <button
      title={title}
      onClick={() => {
        sfx.chip();
        onClick?.();
      }}
      className="chip cursor-pointer hover:-translate-y-1"
      style={{
        ['--c' as string]: color,
        ['--s' as string]: `${size}px`,
        transform: active ? 'translateY(-8px) scale(1.08)' : undefined,
        outline: active ? `3px solid #ffe7a3` : undefined,
        outlineOffset: 3,
        boxShadow: active ? `0 0 26px ${color}, 0 10px 0 rgba(0,0,0,.45)` : undefined,
      }}
    >
      {value}
    </button>
  );
}

export function StakePicker({ value, onChange, color, allowZero = true, max }: { value: number; onChange: (v: number) => void; color: string; allowZero?: boolean; max?: number }) {
  const s = useStore((x) => x.settings);
  const hi = max ?? s.maxBet;
  const opts = [...(allowZero ? [0] : []), ...Array.from({ length: hi - s.minBet + 1 }, (_, i) => s.minBet + i)];
  return (
    <div className="flex gap-1.5 items-center">
      {opts.map((v) => (
        <Chip key={v} value={v === 0 ? '–' : v} size={40} color={v === 0 ? '#444' : color} active={value === v} onClick={() => onChange(v)} title={v === 0 ? 'Ne joue pas' : unitWord(v)} />
      ))}
    </div>
  );
}

const GAGES = [
  'Chante un refrain choisi par la table',
  'Imite le joueur à ta gauche pendant 1 manche',
  'Fais 10 squats',
  'Raconte ton anecdote la plus gênante',
  'Parle avec un accent jusqu’à la prochaine manche',
  'Fais un compliment sincère à chaque joueur',
  'Danse 15 secondes sans musique',
  'Bois un grand verre d’eau 💧',
];

export function PlayerCard({ p, index, children, status, dim, glow }: { p: Player; index: number; children?: ReactNode; status?: ReactNode; dim?: boolean; glow?: boolean }) {
  const noAlcohol = useStore((s) => s.settings.noAlcohol);
  const [gage, setGage] = useState<string | null>(null);
  return (
    <div
      className="relative flex-1 min-w-0 rounded-2xl p-3 flex flex-col gap-2 transition-all duration-300"
      style={{
        background: `linear-gradient(180deg, ${p.color}22, rgba(12,8,12,.92) 55%)`,
        border: `2px solid ${glow ? p.color : p.color + '55'}`,
        boxShadow: glow ? `0 0 30px ${p.color}aa, inset 0 0 20px ${p.color}33` : '0 10px 30px rgba(0,0,0,.4)',
        opacity: dim ? 0.45 : 1,
        transform: glow ? 'translateY(-6px)' : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar p={p} size={52} />
        <div className="min-w-0 flex-1">
          <div className="text-[22px] font-extrabold truncate leading-tight">{p.name}</div>
          <div className="text-[13px] text-white/60 font-semibold">
            🍺 {fmt(p.drunk)} bues · 🎁 {fmt(p.given)} données
          </div>
        </div>
        <kbd className="display text-[26px] w-10 h-10 grid place-items-center rounded-lg" style={{ background: p.color, color: '#120a10', boxShadow: `0 3px 0 ${p.color}66` }}>
          {index + 1}
        </kbd>
      </div>
      {p.owed > 0 && (
        <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 pulse-glow" style={{ background: 'rgba(224,25,63,.22)', ['--g' as string]: p.color + 'aa' }}>
          <span className="display text-[24px] text-ruby flex-1 truncate">
            {noAlcohol ? 'Points' : 'À boire'} : {fmt(p.owed)}
          </span>
          <button className="btn btn-gold text-[18px] px-3 py-1" onClick={() => (sfx.click(), drinkAll(p.id))}>
            ✓ {noAlcohol ? 'Noté' : 'Bu'}
          </button>
          {!noAlcohol && (
            <button
              className="btn btn-ghost text-[16px] px-2 py-1"
              title="Passer : converti en pénalité + gage"
              onClick={() => {
                sfx.click();
                setGage(GAGES[randInt(GAGES.length)]);
                passDrink(p.id);
              }}
            >
              Passer
            </button>
          )}
        </div>
      )}
      {gage && (
        <button className="text-left text-[14px] rounded-lg px-2 py-1 bg-white/10 pop-in" onClick={() => setGage(null)}>
          🎭 Gage : <b>{gage}</b> <span className="text-white/50">(ok)</span>
        </button>
      )}
      {status && <div className="text-[18px] font-bold min-h-[24px]">{status}</div>}
      {children}
    </div>
  );
}

export function PlayerRail({ render, status, dim, glow }: { render?: (p: Player, i: number) => ReactNode; status?: (p: Player, i: number) => ReactNode; dim?: (p: Player) => boolean; glow?: (p: Player) => boolean }) {
  const players = useStore((s) => s.players);
  return (
    <div className="flex gap-3 px-4 pb-4 pt-2">
      {players.map((p, i) => (
        <PlayerCard key={p.id} p={p} index={i} status={status?.(p, i)} dim={dim?.(p)} glow={glow?.(p)}>
          {render?.(p, i)}
        </PlayerCard>
      ))}
    </div>
  );
}

/** Keys 1..8 map to players. */
export function usePlayerKeys(handler: (index: number) => void, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const on = (e: KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement)?.tagName === 'INPUT' || getState().paused) return;
      // Physical key, not the character: on AZERTY the top row types & é " ' without Shift.
      const m = /^(?:Digit|Numpad)([1-8])$/.exec(e.code);
      const n = m ? Number(m[1]) : NaN;
      if (n >= 1 && n <= getState().players.length) ref.current(n - 1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [active]);
}

export function SoundButton() {
  const s = useStore((x) => x.settings);
  const muted = !s.sound && !s.music;
  return (
    <button
      className="btn btn-ghost w-12 h-12 text-[22px] grid place-items-center"
      title={muted ? 'Activer le son' : 'Couper le son'}
      onClick={() => {
        setState({ settings: { ...s, sound: muted, music: muted } });
        syncVolume();
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

/** Logo: long press (1 s) opens the hidden balance screen. */
export function Logo({ size = 40 }: { size?: number }) {
  const timer = useRef<number>(0);
  const down = () => (timer.current = window.setTimeout(() => go('balance'), 1000));
  const up = () => clearTimeout(timer.current);
  return (
    <div onPointerDown={down} onPointerUp={up} onPointerLeave={up} className="display neon-red cursor-default select-none" style={{ fontSize: size }}>
      LE <span className="gold-text">TRIPOT</span>
    </div>
  );
}

export function Ranking() {
  const players = useStore((s) => s.players);
  const sorted = [...players].sort((a, b) => score(b) - score(a));
  return (
    <div className="flex items-center gap-2">
      {sorted.map((p, i) => (
        <div key={p.id} className="flex items-center gap-1 rounded-full pl-1 pr-3 py-1 transition-all duration-500" style={{ background: `${p.color}22`, border: `1px solid ${p.color}66` }}>
          <span className="display text-[18px] w-5 text-center text-gold">{i + 1}</span>
          <span className="text-[20px]">{p.avatar}</span>
          <span className="display text-[20px]" style={{ color: p.color }}>
            {score(p) > 0 ? '+' : ''}
            {fmt(score(p))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TopBar({ title, back = true }: { title?: string; back?: boolean }) {
  const happy = useStore((s) => s.happyHour);
  return (
    <div className="flex items-center gap-4 px-5 h-[72px] shrink-0 border-b border-gold/15 bg-black/30 backdrop-blur-sm relative z-20">
      {back && (
        <button className="btn btn-ghost text-[20px] px-4 h-11" onClick={() => (sfx.click(), go('lobby'))}>
          ← Lobby
        </button>
      )}
      <Logo size={36} />
      {title && <div className="display text-[34px] text-gold-hi ml-2">{title}</div>}
      {happy > 0 && (
        <div className="display text-[22px] px-3 py-1 rounded-full pop-in" style={{ background: 'linear-gradient(90deg,#ff2d75,#f4c14b)', color: '#1a0710' }}>
          🍸 Happy hour x2 · {happy} manche{happy > 1 ? 's' : ''}
        </div>
      )}
      <div className="flex-1 flex justify-center overflow-hidden">
        <Ranking />
      </div>
      <button className="btn btn-red text-[20px] px-4 h-11" onClick={() => (sfx.click(), setPaused(true))}>
        ⏸ Pause
      </button>
      <SoundButton />
    </div>
  );
}
