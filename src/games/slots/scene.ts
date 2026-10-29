import { BlurFilter, Container, FillGradient, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { H, Particles, Stage, W, bokeh, emoji, glowSprite, onFrame, shake, txt, wait } from '../../pixi/kit';
import { SYMBOLS } from './logic';
import { sfx } from '../../audio/sfx';
import { randInt } from '../../engine/rng';

const CX = W / 2;
const CY = 470;
const REEL_W = 230;
const REEL_H = 400;
const GAP = 24;
const SYM_H = 170;
const N = 10;

class Reel {
  node = new Container();
  strip: number[] = Array.from({ length: N }, () => randInt(SYMBOLS.length));
  texts: Text[];
  blur = new BlurFilter({ strength: 0, quality: 3 });
  pos = 0;
  speed = 0;
  spinning = false;

  constructor(x: number) {
    this.node.position.set(x, CY);
    const mask = new Graphics().rect(-REEL_W / 2, -REEL_H / 2, REEL_W, REEL_H).fill(0xffffff);
    const inner = new Container();
    inner.addChild(new Graphics().rect(-REEL_W / 2, -REEL_H / 2, REEL_W, REEL_H).fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: 0x8f8a86 }, { offset: 0.5, color: 0xfffaf0 }, { offset: 1, color: 0x8f8a86 }] })));
    this.texts = this.strip.map((s) => inner.addChild(emoji(SYMBOLS[s], 118)));
    inner.filters = [this.blur];
    inner.mask = mask;
    this.node.addChild(inner, mask);
    // Glass shading top/bottom
    this.node.addChild(
      new Graphics().rect(-REEL_W / 2, -REEL_H / 2, REEL_W, REEL_H).fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: 'rgba(0,0,0,0.75)' }, { offset: 0.28, color: 'rgba(0,0,0,0)' }, { offset: 0.72, color: 'rgba(0,0,0,0)' }, { offset: 1, color: 'rgba(0,0,0,0.75)' }] })),
    );
    this.layout();
  }

  layout() {
    this.texts.forEach((t, j) => {
      let d = (((j - this.pos) % N) + N) % N;
      if (d > N / 2) d -= N;
      t.y = d * SYM_H;
    });
    this.blur.strengthY = Math.min(40, this.speed * 1.6);
    this.blur.strengthX = 0;
  }

  update(dt: number) {
    if (this.spinning) {
      this.speed = Math.min(26, this.speed + dt * 60);
      this.pos += this.speed * dt;
    }
    this.layout();
  }

  /** Lands `symbol` on the payline with an overshoot-and-settle bounce. */
  stop(symbol: number, extra = 3, dur = 0.55): Promise<void> {
    const final = Math.ceil(this.pos) + extra;
    this.strip[final % N] = symbol;
    this.texts[final % N].text = SYMBOLS[symbol];
    this.spinning = false;
    return new Promise((r) =>
      gsap.to(this, {
        pos: final,
        speed: 0,
        duration: dur,
        ease: 'back.out(1.8)',
        onComplete: () => {
          sfx.reelStop();
          r();
        },
      }),
    );
  }

  /** Re-randomise symbols that are off-screen while spinning. */
  shuffleHidden() {
    this.texts.forEach((t, j) => {
      if (Math.abs(t.y) > SYM_H * 2.2) {
        const s = randInt(SYMBOLS.length);
        if (this.strip[j] !== s) {
          this.strip[j] = s;
          t.text = SYMBOLS[s];
        }
      }
    });
  }
}

export class SlotsScene {
  private reels: Reel[] = [];
  private bulbs: Graphics[] = [];
  private particles = new Particles();
  private banner: Text;
  private sub: Text;
  private payline = new Graphics();
  private lever = new Container();
  private flash = new Graphics();
  private glow = glowSprite(0xf4c14b, 1200, 0.15);
  private chase = 0;
  private chaseSpeed = 4;
  private stopFrame: () => void;

  constructor(private st: Stage) {
    const { root, app } = st;
    root.addChild(new Graphics().rect(-W, -H, W * 3, H * 3).fill(new FillGradient({ type: 'radial', center: { x: 0.5, y: 0.48 }, innerRadius: 0, outerCenter: { x: 0.5, y: 0.48 }, outerRadius: 0.27, colorStops: [{ offset: 0, color: 0x2b0b19 }, { offset: 1, color: 0x06050a }] })));
    const bk = new Container();
    root.addChild(bk);
    const tickBokeh = bokeh(bk, [0xf4c14b, 0xff2d75, 0x2de2e6], 22);
    this.glow.position.set(CX, CY);
    root.addChild(this.glow);

    // Cabinet
    const bw = 3 * REEL_W + 2 * GAP + 120;
    const bh = REEL_H + 200;
    const cab = new Graphics()
      .roundRect(CX - bw / 2 - 20, CY - bh / 2 - 110, bw + 40, bh + 170, 50)
      .fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: 0x8e0c24 }, { offset: 1, color: 0x3b0716 }] }))
      .roundRect(CX - bw / 2 - 20, CY - bh / 2 - 110, bw + 40, bh + 170, 50)
      .stroke({ width: 12, color: 0xf4c14b })
      .roundRect(CX - bw / 2 + 20, CY - REEL_H / 2 - 30, bw - 40, REEL_H + 60, 26)
      .fill(0x120a0c)
      .roundRect(CX - bw / 2 + 20, CY - REEL_H / 2 - 30, bw - 40, REEL_H + 60, 26)
      .stroke({ width: 6, color: 0xffe7a3 });
    root.addChild(cab);

    // Marquee bulbs around the cabinet
    const x0 = CX - bw / 2 - 2;
    const x1 = CX + bw / 2 + 2;
    const y0 = CY - bh / 2 - 92;
    const y1 = CY + bh / 2 + 42;
    const pts: [number, number][] = [];
    for (let x = x0 + 30; x < x1 - 20; x += 44) pts.push([x, y0]);
    for (let y = y0 + 30; y < y1 - 20; y += 44) pts.push([x1, y]);
    for (let x = x1 - 30; x > x0 + 20; x -= 44) pts.push([x, y1]);
    for (let y = y1 - 30; y > y0 + 20; y -= 44) pts.push([x0, y]);
    for (const [x, y] of pts) {
      const b = new Graphics().circle(0, 0, 9).fill(0xffffff);
      b.position.set(x, y);
      this.bulbs.push(b);
      root.addChild(b);
    }

    const title = txt('TRIPLE SEPT', 96, 0xffe7a3, { stroke: { color: 0x8e0c24, width: 8 } });
    title.position.set(CX, CY - bh / 2 - 22);
    root.addChild(glowSprite(0xff2d75, 700, 0.25), title);
    root.children[root.children.length - 2].position.set(CX, CY - bh / 2 - 22);

    this.reels = [0, 1, 2].map((i) => new Reel(CX + (i - 1) * (REEL_W + GAP)));
    this.reels.forEach((r) => root.addChild(r.node));
    this.payline.moveTo(CX - bw / 2 + 30, CY).lineTo(CX + bw / 2 - 30, CY).stroke({ width: 5, color: 0xff2d55, alpha: 0.85 });
    this.payline.alpha = 0.5;
    root.addChild(this.payline);

    // Paytable strip
    const pay = txt('🍒🍒🍒 x1   🔔🔔🔔 x2   💎💎💎 x5   7️⃣7️⃣7️⃣ JACKPOT x10', 34, 0xffe7a3, { fontFamily: 'Inter, "Segoe UI Emoji", sans-serif', fontWeight: '800' });
    pay.position.set(CX, CY + REEL_H / 2 + 72);
    root.addChild(pay);

    // Lever
    this.lever.position.set(CX + bw / 2 + 70, CY - 20);
    this.lever.addChild(
      new Graphics().roundRect(-18, -10, 36, 120, 12).fill(0x555055).roundRect(-18, -10, 36, 120, 12).stroke({ width: 4, color: 0xf4c14b }),
      new Graphics().roundRect(-6, -230, 12, 230, 6).fill(0xc0c0c8),
      new Graphics().circle(0, -240, 34).fill(0xe0193f).circle(-10, -250, 10).fill({ color: 0xffffff, alpha: 0.6 }),
    );
    this.lever.pivot.set(0, 0);
    root.addChild(this.lever);

    this.banner = txt('', 150, 0xf4c14b, { stroke: { color: 0x3b0716, width: 12 } });
    this.banner.position.set(CX, CY);
    this.sub = txt('', 40, 0xffffff);
    this.sub.position.set(CX, 24);
    root.addChild(this.particles.layer, this.banner, this.sub);
    this.flash.rect(0, 0, W, H).fill(0xffffff);
    this.flash.alpha = 0;
    root.addChild(this.flash);

    this.stopFrame = onFrame(app, (dt) => {
      tickBokeh(dt);
      this.particles.update(dt);
      this.reels.forEach((r) => {
        r.update(dt);
        if (r.spinning) r.shuffleHidden();
      });
      this.chase += dt * this.chaseSpeed;
      this.bulbs.forEach((b, i) => {
        const on = (Math.floor(this.chase) + i) % 3 === 0;
        b.tint = on ? 0xffe7a3 : 0x6b4a1a;
      });
    });
  }

  setTurn(text: string) {
    this.sub.text = text;
    gsap.fromTo(this.sub, { alpha: 0 }, { alpha: 1, duration: 0.3 });
  }

  async spin(reels: [number, number, number]) {
    this.banner.text = '';
    this.payline.alpha = 0.5;
    sfx.click();
    gsap.to(this.lever.scale, { y: -0.4, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.in' });
    await wait(0.25);
    this.chaseSpeed = 14;
    this.reels.forEach((r) => (r.spinning = true));
    sfx.whoosh();
    await wait(1.1);
    await this.reels[0].stop(reels[0]);
    await wait(0.35);
    await this.reels[1].stop(reels[1]);
    if (reels[0] === reels[1]) {
      // Near miss: the last reel drags on.
      this.setTurn('…');
      this.glow.tint = 0xff2d75;
      gsap.to(this.glow, { alpha: 0.4, duration: 0.3, yoyo: true, repeat: 5 });
      sfx.drum(1.6);
      await wait(1.6);
      await this.reels[2].stop(reels[2], 6, 1.4);
    } else {
      await wait(0.35);
      await this.reels[2].stop(reels[2]);
    }
    this.chaseSpeed = 4;
    this.glow.tint = 0xf4c14b;
  }

  async celebrate(cote: number) {
    gsap.fromTo(this.payline, { alpha: 1 }, { alpha: 0.2, duration: 0.15, yoyo: true, repeat: 9 });
    this.chaseSpeed = 30;
    if (cote >= 10) {
      sfx.bigWin();
      this.banner.text = 'JACKPOT !';
      this.flash.alpha = 0.8;
      gsap.to(this.flash, { alpha: 0, duration: 0.8 });
      shake(this.st.root, 24, 0.8);
      for (let k = 0; k < 9; k++) {
        gsap.delayedCall(k * 0.3, () => {
          const x = 200 + Math.random() * (W - 400);
          const y = 120 + Math.random() * 380;
          sfx.boom();
          this.particles.emit(x, y, { n: 120, colors: [[0xf4c14b, 0xff2d75, 0x2de2e6, 0x7cff6b][k % 4], 0xffffff], speed: 700, life: 1.6, size: 22, g: 260, drag: 1 });
        });
      }
    } else {
      cote >= 5 ? sfx.bigWin() : sfx.win();
      this.banner.text = `x${cote} !`;
      this.particles.emit(CX, CY + 60, { n: 40 + cote * 20, colors: [0xf4c14b, 0xffe7a3], speed: 800, life: 1.4, size: 26, g: 1200, angle: -Math.PI / 2, spread: 1.3, drag: 0.6 });
    }
    gsap.fromTo(this.banner.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2.5)' });
    await wait(cote >= 10 ? 3 : 1.4);
    this.chaseSpeed = 4;
  }

  async lose() {
    sfx.lose();
    this.banner.text = 'PERDU';
    this.banner.style.fill = 0xff2d55;
    gsap.fromTo(this.banner, { alpha: 0 }, { alpha: 1, duration: 0.3 });
    await wait(1.1);
    this.banner.style.fill = 0xf4c14b;
  }

  clear() {
    this.banner.text = '';
  }

  dispose() {
    this.stopFrame();
  }
}
