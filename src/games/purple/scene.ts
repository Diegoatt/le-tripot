import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { H, Particles, Stage, W, bokeh, glowSprite, onFrame, shake, txt, wait } from '../../pixi/kit';
import { CardView } from '../../pixi/cards';
import { STEPS } from './logic';
import type { Card } from '../cards';
import { sfx } from '../../audio/sfx';

const DECK = { x: 220, y: 420 };
const SLOT_X = [560, 810, 1060, 1310];
const SLOT_Y = 400;

export class PurpleScene {
  private cards: CardView[] = [];
  private table = new Container();
  private marks: Text[] = [];
  private picks: Text[] = [];
  private cote: Text;
  private coteSub: Text;
  private banner: Text;
  private particles = new Particles();
  private slotGlow: ReturnType<typeof glowSprite>[] = [];
  private stopFrame: () => void;

  constructor(private st: Stage) {
    const { root, app } = st;
    root.addChild(new Graphics().rect(-W, -H, W * 3, H * 3).fill(new FillGradient({ type: 'radial', center: { x: 0.5, y: 0.5 }, innerRadius: 0, outerCenter: { x: 0.5, y: 0.5 }, outerRadius: 0.3, colorStops: [{ offset: 0, color: 0x2a0f45 }, { offset: 1, color: 0x07060b }] })));
    const bk = new Container();
    root.addChild(bk);
    const tickBokeh = bokeh(bk, [0x9b5de5, 0xf15bb5, 0xf4c14b], 20);
    // Felt table
    this.table.addChild(
      new Graphics()
        .roundRect(90, 190, 1420, 520, 260)
        .fill(0x3b1d10)
        .roundRect(110, 210, 1380, 480, 240)
        .fill(new FillGradient({ type: 'radial', center: { x: 0.5, y: 0.45 }, innerRadius: 0, outerCenter: { x: 0.5, y: 0.45 }, outerRadius: 0.6, colorStops: [{ offset: 0, color: 0x6a2fa0 }, { offset: 1, color: 0x2b0f4a }] }))
        .roundRect(110, 210, 1380, 480, 240)
        .stroke({ width: 4, color: 0xf4c14b, alpha: 0.7 }),
    );
    root.addChild(this.table);
    SLOT_X.forEach((x, i) => {
      const g = glowSprite(0xf4c14b, 380, 0);
      g.position.set(x, SLOT_Y);
      this.slotGlow.push(g);
      const slot = new Graphics().roundRect(x - 98, SLOT_Y - 138, 196, 276, 18).stroke({ width: 3, color: 0xffe7a3, alpha: 0.35 });
      const label = txt(`${i + 1}. ${STEPS[i].title}`, 32, 0xffe7a3);
      label.position.set(x, SLOT_Y + 175);
      const pick = txt('', 36, 0xffffff);
      pick.position.set(x, SLOT_Y + 218);
      const mark = txt('', 110, 0xffffff);
      mark.position.set(x, SLOT_Y);
      this.picks.push(pick);
      this.marks.push(mark);
      root.addChild(g, slot, label, pick);
    });
    for (let k = 0; k < 6; k++) {
      const c = new CardView();
      c.position.set(DECK.x - k * 2, DECK.y - k * 3);
      root.addChild(c);
    }
    this.cote = txt('', 96, 0xf4c14b);
    this.cote.position.set(W / 2, 90);
    this.coteSub = txt('', 34, 0xffffff);
    this.coteSub.position.set(W / 2, 160);
    this.banner = txt('', 170, 0xffffff, { stroke: { color: 0x120a10, width: 14 } });
    this.banner.position.set(W / 2, SLOT_Y);
    root.addChild(this.cote, this.coteSub);
    this.marks.forEach((m) => root.addChild(m));
    root.addChild(this.particles.layer, this.banner);
    this.stopFrame = onFrame(app, (dt) => {
      tickBokeh(dt);
      this.particles.update(dt);
    });
  }

  reset() {
    this.cards.forEach((c) => c.destroy({ children: true }));
    this.cards = [];
    this.marks.forEach((m) => (m.text = ''));
    this.picks.forEach((p) => (p.text = ''));
    this.slotGlow.forEach((g) => (g.alpha = 0));
    this.banner.text = '';
    this.setCote('', '');
  }

  setCote(main: string, sub: string) {
    if (this.cote.text !== main) gsap.fromTo(this.cote.scale, { x: 1.3, y: 1.3 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2)' });
    this.cote.text = main;
    this.coteSub.text = sub;
  }

  focus(step: number) {
    this.slotGlow.forEach((g, i) => gsap.to(g, { alpha: i === step ? 0.35 : 0, duration: 0.3 }));
  }

  setPick(step: number, label: string) {
    this.picks[step].text = label;
    gsap.fromTo(this.picks[step].scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.3, ease: 'back.out(3)' });
  }

  /** Deal a face-down card to the slot, then reveal it slowly. */
  async reveal(step: number, card: Card, ok: boolean) {
    const c = new CardView();
    c.position.set(DECK.x, DECK.y);
    this.st.root.addChildAt(c, this.st.root.getChildIndex(this.marks[0]));
    this.cards.push(c);
    sfx.whoosh();
    await gsap.to(c, { x: SLOT_X[step], y: SLOT_Y, rotation: 0.02 * (step % 2 ? 1 : -1), duration: 0.45, ease: 'power3.out' });
    sfx.drum(0.8);
    await wait(0.6);
    await c.flip(card, true);
    const m = this.marks[step];
    m.text = ok ? '✓' : '✗';
    m.style.fill = ok ? 0x7cff6b : 0xff2d55;
    gsap.fromTo(m.scale, { x: 2.5, y: 2.5 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2)' });
    gsap.to(m, { alpha: 0.85, duration: 0.2 });
    if (ok) {
      sfx.cashout();
      this.particles.emit(SLOT_X[step], SLOT_Y, { n: 40, colors: [0x7cff6b, 0xf4c14b, 0xffffff], speed: 500, life: 0.9, size: 22 });
    } else {
      sfx.lose();
      shake(this.st.root, 22, 0.5);
      gsap.to(c, { rotation: 0.3, y: SLOT_Y + 30, duration: 0.4, ease: 'bounce.out' });
    }
  }

  async cashout(cote: string) {
    this.banner.text = `ENCAISSÉ ${cote}`;
    this.banner.style.fill = 0xf4c14b;
    gsap.fromTo(this.banner.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2)' });
    sfx.bigWin();
    for (let k = 0; k < 4; k++) gsap.delayedCall(k * 0.2, () => this.particles.emit(300 + Math.random() * 1000, 250 + Math.random() * 300, { n: 80, colors: [0x9b5de5, 0xf4c14b, 0xffffff], speed: 650, life: 1.3, size: 22, g: 200 }));
    await wait(1.6);
  }

  async bust() {
    this.banner.text = 'RATÉ !';
    this.banner.style.fill = 0xff2d55;
    gsap.fromTo(this.banner.scale, { x: 3, y: 3 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2)' });
    await wait(1.4);
  }

  dispose() {
    this.stopFrame();
  }
}
