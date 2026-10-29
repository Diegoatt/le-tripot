import { useMemo } from 'react';
import { go, setState, useStore } from '../store';
import { sfx, startMusic } from '../audio/sfx';
import { Logo, SoundButton } from '../ui/common';

const CHIP_COLORS = ['#e0193f', '#f4c14b', '#2de2e6', '#7cff6b', '#b388ff', '#111'];

export function FloatingChips({ n = 18 }: { n?: number }) {
  // Decorative layout only.
  const chips = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 30 + Math.random() * 70,
        color: CHIP_COLORS[i % CHIP_COLORS.length],
        delay: Math.random() * -6,
        dur: 5 + Math.random() * 6,
        r: Math.random() * 360,
        blur: Math.random() < 0.4 ? 3 + Math.random() * 4 : 0,
      })),
    [n],
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {chips.map((c, i) => (
        <div
          key={i}
          className="chip absolute"
          style={{
            left: `${c.left}%`,
            top: `${c.top}%`,
            ['--c' as string]: c.color,
            ['--s' as string]: `${c.size}px`,
            ['--r' as string]: `${c.r}deg`,
            animation: `float ${c.dur}s ease-in-out ${c.delay}s infinite`,
            filter: c.blur ? `blur(${c.blur}px)` : undefined,
            opacity: c.blur ? 0.5 : 0.85,
          }}
        />
      ))}
    </div>
  );
}

export default function Title() {
  const ageOk = useStore((s) => s.ageOk);
  const enter = () => {
    sfx.unlock();
    sfx.fanfare();
    startMusic();
    go('setup');
  };
  return (
    <div className="h-full relative grid place-items-center overflow-hidden">
      <FloatingChips />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: 'linear-gradient(0deg, rgba(11,77,51,.35), transparent)' }} />
      <div className="absolute top-5 right-5 z-10">
        <SoundButton />
      </div>
      <div className="relative flex flex-col items-center gap-6 fade-up">
        <div className="text-[22px] uppercase tracking-[.6em] text-gold/80 font-bold">Casino de soirée</div>
        <div className="flicker">
          <Logo size={220} />
        </div>
        <div className="text-[28px] text-white/80 font-semibold">Ici, les jetons se boivent.</div>
        <button className="btn btn-gold text-[44px] px-16 py-4 mt-6" onClick={enter} disabled={!ageOk}>
          Entrer dans le tripot
        </button>
        <div className="text-white/40 text-[16px]">F11 : plein écran · touches 1 à 8 : un joueur chacune</div>
      </div>
      {!ageOk && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 backdrop-blur">
          <div className="panel p-12 max-w-[760px] flex flex-col items-center gap-6 text-center pop-in">
            <div className="display text-[120px] neon-red leading-none">18+</div>
            <div className="text-[30px] font-bold">Ce jeu est réservé aux adultes.</div>
            <div className="text-[24px] text-white/80">
              Bois avec modération, ne conduis pas.
              <br />
              Aucun argent réel n’est en jeu.
            </div>
            <div className="text-[18px] text-white/50">Un mode sans alcool remplace les gorgées par des points.</div>
            <button
              className="btn btn-gold text-[32px] px-10 py-3"
              onClick={() => {
                sfx.unlock();
                sfx.click();
                setState({ ageOk: true });
              }}
            >
              J’ai 18 ans ou plus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
