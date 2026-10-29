import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Player, setPaused, setState, unitWord, useStore } from '../store';
import { Avatar } from './common';
import { sfx } from '../audio/sfx';
import { chipsFor, autoSplit } from '../engine/settle';
import { fmt } from '../engine/odds';
import { randInt } from '../engine/rng';
import type { TripotEvent } from '../engine/events';

const Backdrop = ({ children, tint = 'rgba(7,6,11,.86)', className = '' }: { children: React.ReactNode; tint?: string; className?: string }) => (
  <div className={`absolute inset-0 z-40 grid place-items-center ${className}`} style={{ background: tint, backdropFilter: 'blur(6px)' }}>
    {children}
  </div>
);

export function DrinkOverlay({ items, onDone }: { items: { p: Player; amount: number; reason?: string }[]; onDone: () => void }) {
  const noAlcohol = useStore((s) => s.settings.noAlcohol);
  const sip = useStore((s) => s.settings.sipSize);
  useEffect(() => {
    sfx.lose();
    sfx.boom();
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, []);
  const big = items.length === 1;
  return (
    <Backdrop tint="radial-gradient(circle at 50% 50%, rgba(120,8,30,.82), rgba(7,6,11,.95) 70%)" className="shake cursor-pointer">
      <div className="flex flex-col items-center gap-8" onClick={onDone}>
        <div className="display neon-red text-[150px] pop-in">{noAlcohol ? 'PERDU' : 'BOIS !'}</div>
        <div className="flex flex-wrap justify-center gap-6 max-w-[1300px]">
          {items.map(({ p, amount, reason }, i) => (
            <div key={p.id + i} className="flex flex-col items-center gap-3 pop-in" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
              <Avatar p={p} size={big ? 150 : 104} />
              <div className="text-[30px] font-extrabold" style={{ color: p.color }}>
                {p.name}
              </div>
              <div className="display text-white" style={{ fontSize: big ? 96 : 60, textShadow: `0 0 30px ${p.color}` }}>
                {noAlcohol ? `+${unitWord(amount)}` : `BOIS ${unitWord(amount).toUpperCase()}`}
              </div>
              {reason && <div className="text-[20px] text-gold-hi">{reason}</div>}
            </div>
          ))}
        </div>
        {!noAlcohol && <div className="text-white/50 text-[18px]">Gorgée {sip.toLowerCase()} · clic pour continuer</div>}
      </div>
    </Backdrop>
  );
}

export function GiftOverlay({ giver, amount, capped, players, onDone }: { giver: Player; amount: number; capped: number; players: Player[]; onDone: (split: Record<string, number>) => void }) {
  const others = players.filter((p) => p.id !== giver.id);
  const chips = chipsFor(amount);
  const [split, setSplit] = useState<Record<string, number>>(() => Object.fromEntries(others.map((p) => [p.id, 0])));
  const [used, setUsed] = useState(0);
  const [done, setDone] = useState(false);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const targetRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const noAlcohol = useStore((s) => s.settings.noAlcohol);

  useEffect(() => sfx.win(), []);

  const fly = (i: number, to: string) => {
    const el = chipRefs.current[i];
    const tgt = targetRefs.current[to];
    if (!el || !tgt) return;
    const a = el.getBoundingClientRect();
    const b = tgt.getBoundingClientRect();
    gsap.to(el, {
      x: b.left + b.width / 2 - (a.left + a.width / 2),
      y: b.top + b.height / 2 - (a.top + a.height / 2),
      scale: 0.5,
      rotation: 360,
      duration: 0.55,
      ease: 'power3.in',
      onComplete: () => {
        gsap.to(el, { opacity: 0, duration: 0.15 });
        gsap.fromTo(tgt, { scale: 1.25 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
        sfx.chip();
      },
    });
  };

  const give = (to: string) => {
    if (used >= chips.length) return;
    fly(used, to);
    setSplit((s) => ({ ...s, [to]: s[to] + chips[used] }));
    setUsed(used + 1);
    if (used + 1 === chips.length) setTimeout(() => setDone(true), 650);
  };

  const random = () => {
    const ids = others.map((p) => p.id);
    const rest = autoSplit(chips.slice(used).reduce((a, b) => a + b, 0), ids, randInt(ids.length));
    let k = used;
    for (const id of ids) for (let n = rest[id]; n > 0; n -= n >= 1 ? 1 : 0.5) fly(k++, id);
    setSplit((s) => Object.fromEntries(ids.map((id) => [id, s[id] + rest[id]])));
    setUsed(chips.length);
    setTimeout(() => setDone(true), 700);
  };

  return (
    <Backdrop tint="radial-gradient(circle at 50% 30%, rgba(244,193,75,.22), rgba(7,6,11,.94) 65%)">
      <div className="flex flex-col items-center gap-6 w-[min(1300px,94vw)]">
        <div className="flex items-center gap-6 pop-in">
          <Avatar p={giver} size={120} />
          <div>
            <div className="display gold-text text-[96px]">GAGNÉ !</div>
            <div className="text-[30px] font-extrabold">
              <span style={{ color: giver.color }}>{giver.name}</span> distribue {unitWord(amount)}
            </div>
            {capped > 0 && <div className="text-[20px] text-ruby font-bold">Plafond atteint : {fmt(capped)} perdue{capped > 1 ? 's' : ''} (max 8 par manche)</div>}
          </div>
        </div>
        <div className="flex gap-3 min-h-[70px] flex-wrap justify-center">
          {chips.map((c, i) => (
            <div key={i} ref={(el) => void (chipRefs.current[i] = el)} className="chip pop-in" style={{ ['--c' as string]: giver.color, ['--s' as string]: '64px', animationDelay: `${i * 0.06}s` }}>
              {c === 1 ? '1' : '½'}
            </div>
          ))}
        </div>
        <div className="text-[22px] text-white/70">{done ? 'Distribution terminée' : `Clique sur un joueur pour lui envoyer un jeton (${chips.length - used} restant${chips.length - used > 1 ? 's' : ''})`}</div>
        <div className="flex gap-6 flex-wrap justify-center">
          {others.map((p) => (
            <button key={p.id} ref={(el) => void (targetRefs.current[p.id] = el)} onClick={() => give(p.id)} disabled={done} className="relative flex flex-col items-center gap-2 p-4 rounded-2xl transition hover:bg-white/5">
              <Avatar p={p} size={96} />
              <div className="text-[22px] font-bold">{p.name}</div>
              <div className="display text-[44px]" style={{ color: split[p.id] ? p.color : '#ffffff33' }}>
                {fmt(split[p.id])}
              </div>
              {done && split[p.id] > 0 && (
                <div className="absolute -top-6 whitespace-nowrap rounded-full px-3 py-1 text-[18px] font-bold pop-in" style={{ background: p.color, color: '#120a10' }}>
                  {giver.name} te donne {unitWord(split[p.id])}
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          {!done && (
            <button className="btn btn-ghost text-[24px] px-6 py-3" onClick={random}>
              🎲 Au hasard
            </button>
          )}
          {done && (
            <button className="btn btn-gold text-[30px] px-10 py-3 pop-in" onClick={() => (sfx.click(), onDone(split))}>
              {noAlcohol ? 'Valider' : 'Santé ! 🥂'}
            </button>
          )}
        </div>
      </div>
    </Backdrop>
  );
}

export function EventOverlay({ ev, onDone }: { ev: TripotEvent; onDone: () => void }) {
  useEffect(() => sfx.fanfare(), []);
  return (
    <Backdrop>
      <div className="panel p-12 flex flex-col items-center gap-4 pop-in" style={{ borderColor: '#f4c14b88', boxShadow: '0 0 80px rgba(244,193,75,.3)' }}>
        <div className="text-[120px] leading-none">{ev.icon}</div>
        <div className="text-[20px] uppercase tracking-[.3em] text-white/50 font-bold">Événement</div>
        <div className="display gold-text text-[88px]">{ev.title}</div>
        <div className="text-[34px] font-bold">{ev.text}</div>
        <button className="btn btn-gold text-[30px] px-10 py-3 mt-4" onClick={() => (sfx.click(), onDone())}>
          C’est parti
        </button>
      </div>
    </Backdrop>
  );
}

export function PauseOverlay() {
  const paused = useStore((s) => s.paused);
  if (!paused) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center" style={{ background: 'rgba(7,6,11,.9)', backdropFilter: 'blur(10px)' }}>
      <div className="flex flex-col items-center gap-6 fade-up">
        <div className="display neon-red text-[160px] flicker">PAUSE</div>
        <div className="text-[30px] font-bold">💧 Un verre d’eau, une pause, on reprend quand tout le monde est prêt.</div>
        <div className="text-[22px] text-white/60">Bois avec modération, ne conduis pas.</div>
        <button className="btn btn-gold text-[36px] px-12 py-4" onClick={() => (sfx.click(), setPaused(false))}>
          Reprendre
        </button>
      </div>
    </div>
  );
}

export function CapWarning() {
  const w = useStore((s) => s.capWarning);
  if (!w) return null;
  return (
    <div className="fixed inset-0 z-[55] grid place-items-center bg-black/70">
      <div className="panel p-10 max-w-[760px] flex flex-col items-center gap-5 pop-in text-center">
        <div className="text-[90px]">🚰</div>
        <div className="display text-gold text-[64px]">Plafond horaire atteint</div>
        <div className="text-[26px] font-semibold">{w}</div>
        <div className="flex gap-4">
          <button className="btn btn-red text-[26px] px-6 py-3" onClick={() => (setState({ capWarning: null }), setPaused(true))}>
            Faire une pause
          </button>
          <button className="btn btn-ghost text-[26px] px-6 py-3" onClick={() => setState({ capWarning: null })}>
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
