import { useEffect, useRef, useState } from 'react';
import { useScene } from '../../pixi/useScene';
import { PurpleScene } from './scene';
import { STEPS, contreCote, optionProb, optionWins, purpleCote } from './logic';
import { Card, newDeck } from '../cards';
import { PlayerRail, StakePicker, usePlayerKeys } from '../../ui/common';
import { unitWord, useStore } from '../../store';
import { fmt } from '../../engine/odds';
import type { Outcome } from '../../engine/settle';
import { sfx } from '../../audio/sfx';
import type { GameProps } from '../registry';

let turn = 0;

type Phase = 'stake' | 'choose' | 'contre' | 'reveal' | 'decide' | 'end';

export default function Purple({ finish }: GameProps) {
  const { host, scene, ready } = useScene((st) => new PurpleScene(st));
  const players = useStore((s) => s.players);
  const minBet = useStore((s) => s.settings.minBet);
  const [activeIdx, setActiveIdx] = useState(turn % players.length);
  const active = players[activeIdx];
  const [phase, setPhase] = useState<Phase>('stake');
  const [stakes, setStakes] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.id, minBet])));
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [P, setP] = useState(1);
  const [contres, setContres] = useState<{ playerId: string; step: number; cote: number }[]>([]);
  const deck = useRef<Card[]>([]);

  const shown = () => deck.current.slice(0, step);
  const unseen = () => deck.current.slice(step);
  const pOf = (o: number) => optionProb(step, o, shown(), unseen());

  useEffect(() => {
    if (!ready) return;
    scene.current?.reset();
    scene.current?.setCote(`${active.avatar} ${active.name.toUpperCase()}`, 'Joue Purple : mise, puis 4 pronostics');
  }, [ready, activeIdx]);

  const begin = () => {
    deck.current = newDeck(); // every card is drawn before any reveal
    setStep(0);
    setP(1);
    setContres([]);
    setChoice(null);
    scene.current!.reset();
    scene.current!.focus(0);
    scene.current!.setCote('COTE —', 'Étape 1 : la couleur');
    setPhase('choose');
  };

  const choose = (o: number) => {
    setChoice(o);
    scene.current!.setPick(step, STEPS[step].options[o]);
    setPhase('contre');
  };

  usePlayerKeys((i) => {
    const p = players[i];
    if (!p || p.id === active.id || choice === null || !stakes[p.id] || contres.some((c) => c.playerId === p.id)) return;
    sfx.chip();
    setContres([...contres, { playerId: p.id, step, cote: contreCote(pOf(choice)) }]);
  }, phase === 'contre');

  const end = async (activeWon: boolean, failedStep: number | null, finalP: number) => {
    setPhase('end');
    const outs: Outcome[] = [{ playerId: active.id, stake: stakes[active.id], won: activeWon, cote: activeWon ? purpleCote(finalP) : 0 }];
    for (const c of contres) outs.push({ playerId: c.playerId, stake: stakes[c.playerId], won: failedStep === c.step, cote: c.cote });
    await finish(outs);
    turn++;
    setActiveIdx(turn % players.length);
    setPhase('stake');
  };

  const reveal = async () => {
    if (choice === null) return;
    setPhase('reveal');
    const card = deck.current[step];
    const ok = optionWins(step, choice, shown(), card);
    const nextP = P * pOf(choice);
    await scene.current!.reveal(step, card, ok);
    if (!ok) {
      await scene.current!.bust();
      return end(false, step, nextP);
    }
    setP(nextP);
    if (step === 3) {
      await scene.current!.cashout(`x${fmt(purpleCote(nextP))}`);
      return end(true, null, nextP);
    }
    scene.current!.setCote(`x${fmt(purpleCote(nextP))}`, `Encaisser maintenant : ${active.name} distribue ${fmt(stakes[active.id] * purpleCote(nextP))}`);
    setPhase('decide');
  };

  const next = () => {
    setStep(step + 1);
    setChoice(null);
    scene.current!.focus(step + 1);
    scene.current!.setCote(`x${fmt(purpleCote(P))}`,`Étape ${step + 2} : ${STEPS[step + 1].title.toLowerCase()}`);
    setPhase('choose');
  };

  const cash = async () => {
    setPhase('reveal');
    await scene.current!.cashout(`x${fmt(purpleCote(P))}`);
    end(true, null, P);
  };

  return (
    <>
      <div className="flex-1 min-h-0 relative">
        <div ref={host} className="absolute inset-0" />
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          {phase === 'stake' && (
            <button className="btn btn-gold text-[42px] px-12 py-3 pop-in" disabled={!ready || !stakes[active.id]} onClick={() => (sfx.click(), begin())}>
              🃏 {active.name} commence
            </button>
          )}
          {phase === 'choose' && (
            <div className="flex gap-3 pop-in">
              {STEPS[step].options.map((o, i) => (
                <button key={o} className={`btn ${i % 2 ? 'btn-ghost' : 'btn-red'} text-[40px] px-8 py-2 min-w-[150px]`} onClick={() => (sfx.click(), choose(i))}>
                  {o}
                  <div className="text-[16px] font-sans font-bold opacity-80">→ x{fmt(purpleCote(P * pOf(i)))}</div>
                </button>
              ))}
            </div>
          )}
          {phase === 'contre' && (
            <>
              <div className="text-[20px] text-white/80 font-semibold">Les autres : appuyez sur votre touche pour parier CONTRE {active.name} (cote x{fmt(contreCote(pOf(choice!)))})</div>
              <button className="btn btn-gold text-[40px] px-12 py-2 pop-in" onClick={() => (sfx.click(), reveal())}>
                Retourner la carte
              </button>
            </>
          )}
          {phase === 'decide' && (
            <div className="flex gap-4 pop-in">
              <button className="btn btn-gold text-[40px] px-10 py-2" onClick={cash}>
                💰 Encaisser x{fmt(purpleCote(P))}
              </button>
              <button className="btn btn-red text-[40px] px-10 py-2" onClick={next}>
                Continuer →
              </button>
            </div>
          )}
        </div>
      </div>
      <PlayerRail
        glow={(p) => p.id === active.id}
        status={(p) => {
          if (p.id === active.id) return <span className="text-gold">🃏 Joue · mise {unitWord(stakes[p.id] ?? 0)}</span>;
          const c = contres.find((x) => x.playerId === p.id);
          if (c) return <span className="text-ruby">Contre à l’étape {c.step + 1} · x{fmt(c.cote)}</span>;
          return <span className="text-white/50">{stakes[p.id] ? `Peut parier contre (${unitWord(stakes[p.id])})` : 'Ne parie pas contre'}</span>;
        }}
        render={(p) => phase === 'stake' && <StakePicker allowZero={p.id !== active.id} value={stakes[p.id] ?? 0} color={p.color} onChange={(v) => setStakes({ ...stakes, [p.id]: v })} />}
      />
    </>
  );
}
