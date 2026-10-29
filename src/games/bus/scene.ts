import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { H, Particles, Stage, W, bokeh, emoji, glowSprite, onFrame, shake, txt, wait } from '../../pixi/kit';
import { CardView } from '../../pixi/cards';
import type { Card } from '../cards';
import { FLOORS } from './logic';
import { sfx } from '../../audio/sfx';

// Floor 0 is the ground; floors 1..4 climb diagonally.
const floorPos = (f: number) => ({ x: 330 + f * 250, y: 770 - f * 150 });

export class BusScene {
  private world = new Container();
  private platforms: Graphics[] = [];
  private glows: ReturnType<typeof glowSprite>[] = [];
  private token = new Container();
  private tokenFace: Text;
  private ring = new Graphics();
  private card: CardView | null = null;
  private particles = new Particles();
  private banner: Text;
  private info: Text;
  private floor = 0;
  private stopFrame: () => void;

  constructor(private st: Stage) {
    const { root, app } = st;
    root.addChild(new Graphics().rect(-W, -H, W * 3, H * 3).fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0.33, color: 0x0c0920 }, { offset: 0.67, color: 0x1d0a12 }] })));
    const bk = new Container();
    root.addChild(bk);
    const tickBokeh = bokeh(bk, [0xff8c42, 0x2de2e6, 0xff2d75], 24);
    root.addChild(this.world);
    const ground = new Graphics().rect(-W, 800, W * 3, 400).fill(0x120b10).rect(-W, 800, W * 3, 4).fill({ color: 0xff8c42, alpha: 0.6 });
    this.world.addChild(ground);
    const crown = emoji('👑', 90);
    const top = floorPos(FLOORS);
    crown.position.set(top.x, top.y - 150);
    this.world.addChild(glowSprite(0xf4c14b, 300, 0.4), crown);
    this.world.children[this.world.children.length - 2].position.set(top.x, top.y - 150);
    for (let f = 1; f <= FLOORS; f++) {
      const { x, y } = floorPos(f);
      const g = glowSprite(0xff8c42, 360, 0.15);
      g.position.set(x, y + 20);
      const p = new Graphics()
        .roundRect(-110, 0, 220, 26, 10)
        .fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: 0x3a2030 }, { offset: 1, color: 0x1a0d14 }] }))
        .roundRect(-110, 0, 220, 26, 10)
        .stroke({ width: 4, color: 0xff8c42 });
      p.position.set(x, y + 40);
      const n = txt(`ÉTAGE ${f}`, 28, 0xffb38a);
      n.position.set(x, y + 95);
      this.platforms.push(p);
      this.glows.push(g);
      this.world.addChild(g, p, n);
    }
    // Climber token
    this.ring.circle(0, 0, 54).fill(0x120a10).circle(0, 0, 54).stroke({ width: 7, color: 0xffffff });
    this.tokenFace = emoji('🦊', 62);
    this.token.addChild(glowSprite(0xffffff, 200, 0.4), this.ring, this.tokenFace);
    this.world.addChild(this.token, this.particles.layer);
    this.banner = txt('', 140, 0xffffff, { stroke: { color: 0x120a10, width: 12 } });
    this.banner.position.set(520, 260);
    this.info = txt('', 44, 0xffe7a3);
    this.info.position.set(420, 90);
    root.addChild(this.banner, this.info);
    this.placeToken(0);
    this.stopFrame = onFrame(app, (dt) => {
      tickBokeh(dt);
      this.particles.update(dt);
      this.token.children[0].alpha = 0.3 + Math.sin(performance.now() / 300) * 0.1;
    });
  }

  private placeToken(f: number) {
    const { x, y } = floorPos(f);
    this.token.position.set(x, f === 0 ? y - 25 : y - 20);
    this.floor = f;
  }

  setClimber(avatar: string, color: number) {
    this.tokenFace.text = avatar;
    this.ring.clear().circle(0, 0, 54).fill(0x120a10).circle(0, 0, 54).stroke({ width: 7, color });
    (this.token.children[0] as ReturnType<typeof glowSprite>).tint = color;
  }

  setInfo(t: string) {
    this.info.text = t;
  }

  /** Start an attempt: show the ground card face up next to the climber. */
  async startAttempt(first: Card) {
    this.banner.text = '';
    this.platforms.forEach((p) => {
      p.alpha = 1;
      p.rotation = 0;
      p.tint = 0xffffff;
    });
    this.glows.forEach((g) => (g.alpha = 0.15));
    this.token.rotation = 0;
    this.token.alpha = 1;
    this.placeToken(0);
    this.card?.destroy({ children: true });
    this.card = new CardView();
    this.card.scale.set(0.8);
    this.card.position.set(floorPos(0).x - 200, floorPos(0).y - 110);
    this.world.addChild(this.card);
    await this.card.flip(first);
  }

  /** Reveal the next card on the next floor, then jump or fall. */
  async step(next: Card, ok: boolean) {
    const f = this.floor + 1;
    const { x, y } = floorPos(f);
    const c = new CardView();
    c.scale.set(0.8);
    c.position.set(x, y - 150);
    c.alpha = 0;
    this.world.addChild(c);
    await gsap.to(c, { alpha: 1, duration: 0.2 });
    sfx.drum(0.7);
    await wait(0.5);
    await c.flip(next, true);
    this.card?.destroy({ children: true });
    this.card = c;
    if (ok) {
      sfx.whoosh();
      const from = { x: this.token.x, y: this.token.y };
      const o = { k: 0 };
      await gsap.to(o, {
        k: 1,
        duration: 0.55,
        ease: 'power1.inOut',
        onUpdate: () => this.token.position.set(from.x + (x - from.x) * o.k, from.y + (y - 20 - from.y) * o.k - Math.sin(o.k * Math.PI) * 140),
      });
      this.floor = f;
      gsap.to(this.card, { x: x + 200, y: y - 60, duration: 0.3 });
      this.glows[f - 1].alpha = 0.6;
      this.platforms[f - 1].tint = 0xffe7a3;
      sfx.cashout();
      this.particles.emit(x, y + 40, { n: 40, colors: [0xff8c42, 0xffe7a3], speed: 450, life: 0.8, size: 20 });
      shake(this.st.root, 6, 0.2);
    } else {
      await this.fall();
    }
  }

  private async fall() {
    const p = this.platforms[this.floor] ?? this.platforms[0];
    sfx.boom();
    shake(this.st.root, 26, 0.6);
    gsap.to(p, { rotation: 0.5, y: p.y + 260, alpha: 0, duration: 0.9, ease: 'power2.in' });
    this.banner.text = 'CHUTE !';
    this.banner.style.fill = 0xff2d55;
    gsap.fromTo(this.banner.scale, { x: 3, y: 3 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2)' });
    sfx.fall();
    const g = floorPos(0);
    await gsap.to(this.token, { x: g.x + 40, y: g.y - 10, rotation: Math.PI * 3, duration: 0.9, ease: 'power2.in' });
    this.particles.emit(this.token.x, this.token.y + 40, { n: 70, colors: [0x8a6542, 0xffffff, 0xff2d55], speed: 600, life: 1, size: 26, g: 800 });
    gsap.to(this.token, { rotation: Math.PI * 3.1, duration: 0.2, yoyo: true, repeat: 3 });
    this.floor = 0;
    await wait(1.2);
  }

  async summit() {
    this.banner.text = 'AU SOMMET !';
    this.banner.style.fill = 0xf4c14b;
    gsap.fromTo(this.banner.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2)' });
    sfx.bigWin();
    const t = floorPos(FLOORS);
    for (let k = 0; k < 6; k++) gsap.delayedCall(k * 0.25, () => this.particles.emit(t.x - 300 + Math.random() * 600, t.y - 200 + Math.random() * 200, { n: 80, colors: [0xf4c14b, 0xff8c42, 0x2de2e6, 0xffffff], speed: 650, life: 1.4, size: 22, g: 250 }));
    await wait(2);
  }

  dispose() {
    this.stopFrame();
  }
}
