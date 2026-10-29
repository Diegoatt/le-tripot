import { useEffect, useState } from 'react';
import { SIMS, SIM_LABELS, SimStats } from '../engine/simulate';
import { go } from '../store';

const N = 200_000;
const pct = (x: number) => `${(x * 100).toFixed(2).replace('.', ',')} %`;

/** Hidden screen (long press on the logo): observed frequencies from a live Monte Carlo run. */
export default function Balance() {
  const [res, setRes] = useState<Record<string, SimStats>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const k of Object.keys(SIMS)) {
        await new Promise((r) => setTimeout(r, 30)); // let the UI paint between games
        if (!alive) return;
        const s = SIMS[k](N);
        setRes((r) => ({ ...r, [k]: s }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="h-full overflow-y-auto p-8 screen-enter">
      <div className="flex items-center mb-6">
        <div className="display text-[60px] gold-text">Équilibrage</div>
        <div className="ml-4 text-white/50 text-[18px]">{N.toLocaleString('fr-FR')} manches simulées par jeu, 1 gorgée misée, stratégie de référence</div>
        <div className="flex-1" />
        <button className="btn btn-ghost text-[22px] px-5 h-12" onClick={() => go('lobby')}>
          ← Retour
        </button>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {Object.keys(SIMS).map((k) => {
          const s = res[k];
          return (
            <div key={k} className="panel p-5">
              <div className="display text-[36px] text-gold-hi">{SIM_LABELS[k]}</div>
              {!s ? (
                <div className="text-white/50 text-[18px] py-6">Simulation…</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-4 text-[18px] my-3">
                    <span className="text-white/60">Espérance / gorgée</span>
                    <b className={s.ev < 0 ? 'text-ruby' : 'text-green-400'}>{pct(s.ev)}</b>
                    <span className="text-white/60">Taux de gain</span>
                    <b>{pct(s.winRate)}</b>
                    <span className="text-white/60">Gains ≥ x5</span>
                    <b>{pct(s.bigRate)}</b>
                    <span className="text-white/60">Cote max observée</span>
                    <b>x{s.maxCote}</b>
                  </div>
                  <div className="flex flex-col gap-1">
                    {Object.entries(s.freq)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([tag, f]) => (
                        <div key={tag} className="flex items-center gap-2 text-[14px]">
                          <span className="w-28 truncate text-white/70">{tag}</span>
                          <div className="flex-1 h-2.5 rounded bg-white/5 overflow-hidden">
                            <div className="h-full bg-gold" style={{ width: `${Math.min(100, f * 100 * 1.5)}%` }} />
                          </div>
                          <span className="w-16 text-right">{pct(f)}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div className="panel p-5 text-[17px] text-white/70">
          <div className="display text-[36px] text-gold-hi">Chrono aveugle</div>
          Jeu d’adresse : pas de tirage. Les gagnants (fenêtre réglable) se partagent le pot et distribuent au plus 2× leur mise.
        </div>
      </div>
    </div>
  );
}
