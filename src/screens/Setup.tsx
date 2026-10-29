import { ReactNode } from 'react';
import { AVATARS, PLAYER_COLORS, Settings, go, newPlayer, setState, useStore } from '../store';
import { Avatar, Logo, SoundButton } from '../ui/common';
import { sfx, syncVolume } from '../audio/sfx';

const Row = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <div className="flex items-center gap-4 py-2.5 border-b border-white/5">
    <div className="flex-1">
      <div className="text-[19px] font-semibold">{label}</div>
      {hint && <div className="text-[14px] text-white/50">{hint}</div>}
    </div>
    {children}
  </div>
);

const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => (
  <button onClick={() => (sfx.click(), set(!on))} className="w-16 h-9 rounded-full relative transition-colors" style={{ background: on ? '#f4c14b' : '#ffffff22' }}>
    <span className="absolute top-1 w-7 h-7 rounded-full bg-white transition-all shadow" style={{ left: on ? 32 : 4 }} />
  </button>
);

const Stepper = ({ v, set, min, max, step = 1, fmt = String }: { v: number; set: (n: number) => void; min: number; max: number; step?: number; fmt?: (n: number) => string }) => (
  <div className="flex items-center gap-2">
    <button className="btn btn-ghost w-10 h-10 text-[24px]" onClick={() => set(Math.max(min, +(v - step).toFixed(2)))}>
      −
    </button>
    <div className="display text-[30px] w-20 text-center text-gold">{fmt(v)}</div>
    <button className="btn btn-ghost w-10 h-10 text-[24px]" onClick={() => set(Math.min(max, +(v + step).toFixed(2)))}>
      +
    </button>
  </div>
);

export default function Setup() {
  const players = useStore((s) => s.players);
  const s = useStore((x) => x.settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setState({ settings: { ...s, [k]: v } });
    syncVolume();
  };
  const update = (id: string, patch: object) => setState({ players: players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <div className="h-full flex flex-col screen-enter">
      <div className="flex items-center px-8 h-[84px] shrink-0">
        <Logo size={44} />
        <div className="display text-[44px] text-white/80 ml-6">Qui joue ce soir ?</div>
        <div className="flex-1" />
        <SoundButton />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1.35fr_1fr] gap-6 px-8 pb-6">
        <div className="panel p-6 overflow-y-auto">
          <div className="flex flex-col gap-3">
            {players.map((p, i) => (
              <div key={p.id} className="rounded-2xl p-3 flex flex-col gap-2 fade-up" style={{ background: `${p.color}14`, border: `1px solid ${p.color}55`, animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-3">
                  <kbd className="display text-[28px] w-11 h-11 grid place-items-center rounded-lg" style={{ background: p.color, color: '#120a10' }}>
                    {i + 1}
                  </kbd>
                  <Avatar p={p} size={54} />
                  <input
                    value={p.name}
                    maxLength={14}
                    onChange={(e) => update(p.id, { name: e.target.value })}
                    className="flex-1 bg-black/40 rounded-xl px-4 h-12 text-[24px] font-bold outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as string]: p.color }}
                  />
                  {players.length > 2 && (
                    <button className="btn btn-ghost w-10 h-10" title="Retirer" onClick={() => setState({ players: players.filter((x) => x.id !== p.id) })}>
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap items-center pl-14">
                  {PLAYER_COLORS.map((c) => (
                    <button key={c} onClick={() => update(p.id, { color: c })} className="w-7 h-7 rounded-full transition hover:scale-125" style={{ background: c, outline: p.color === c ? '3px solid white' : undefined }} />
                  ))}
                  <span className="w-3" />
                  {AVATARS.map((a) => (
                    <button key={a} onClick={() => (sfx.hover(), update(p.id, { avatar: a }))} className="text-[24px] w-10 h-10 rounded-lg transition hover:scale-125" style={{ background: p.avatar === a ? `${p.color}55` : 'transparent' }}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {players.length < 8 && (
              <button className="btn btn-ghost text-[26px] py-3" onClick={() => (sfx.chip(), setState({ players: [...players, newPlayer(players.length)] }))}>
                + Ajouter un joueur
              </button>
            )}
          </div>
        </div>
        <div className="panel p-6 flex flex-col min-h-0">
          <div className="display text-[36px] text-gold mb-2">Réglages de la maison</div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <Row label="Taille d’une gorgée" hint="Rappelée à chaque « BOIS »">
            <div className="flex gap-1">
              {(['Petite', 'Normale', 'Grosse'] as const).map((v) => (
                <button key={v} className={`btn text-[18px] px-3 py-1.5 ${s.sipSize === v ? 'btn-gold' : 'btn-ghost'}`} onClick={() => set('sipSize', v)}>
                  {v}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Mise minimum">
            <Stepper v={s.minBet} min={1} max={s.maxBet} set={(v) => set('minBet', v)} />
          </Row>
          <Row label="Mise maximum" hint="Plafond réglable jusqu’à 5">
            <Stepper v={s.maxBet} min={s.minBet} max={5} set={(v) => set('maxBet', v)} />
          </Row>
          <Row label="Plafond de boisson / heure" hint="Alerte + pause conseillée">
            <Stepper v={s.hourlyCap} min={5} max={40} set={(v) => set('hourlyCap', v)} />
          </Row>
          <Row label="Fenêtre du chrono aveugle" hint="Tolérance autour de 10,00 s">
            <Stepper v={s.chronoWindow} min={0.01} max={0.3} step={0.01} set={(v) => set('chronoWindow', v)} fmt={(n) => `±${n.toFixed(2).replace('.', ',')}`} />
          </Row>
          <Row label="Mode sans alcool" hint="Les gorgées deviennent des points">
            <Toggle on={s.noAlcohol} set={(v) => set('noAlcohol', v)} />
          </Row>
          <Row label="Événements aléatoires" hint="Happy hour, taxe…">
            <Toggle on={s.events} set={(v) => set('events', v)} />
          </Row>
          <Row label="Effets sonores">
            <Toggle on={s.sound} set={(v) => set('sound', v)} />
          </Row>
          <Row label="Musique d’ambiance">
            <Toggle on={s.music} set={(v) => set('music', v)} />
          </Row>
          <Row label="Volume">
            <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => set('volume', +e.target.value)} className="w-44" />
          </Row>
          </div>
          <button className="btn btn-gold text-[38px] py-4 mt-5 shrink-0" onClick={() => (sfx.fanfare(), go('lobby'))}>
            Ouvrir le casino →
          </button>
        </div>
      </div>
    </div>
  );
}
