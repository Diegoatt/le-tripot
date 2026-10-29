import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { H, Particles, Stage, W, emoji, glowSprite, onFrame, shake, txt, wait } from '../../pixi/kit';
import { sfx } from '../../audio/sfx';

const CX = W / 2;
const CY = 430;
const R = 270;

export class ChronoScene {
  private zoom = new Container();
  private ring = new Graphics();
  private ringGlow = glowSprite(0x2de2e6, 900, 0.2);
  private big: Text;
  private sub: Text;
  private who = new Container();
  private dots = new Container();
  private particles = new Particles();
  private t = 0;
  private stopFrame: () => void;

  constructor(private st: Stage) {
    const { root, app } = st;
    root.addChild(new Graphics().rect(-W, -H, W * 3, H * 3).fill(0x020205));
    this.zoom.position.set(CX, CY);
    this.zoom.pivot.set(CX, CY);
    root.addChild(this.zoom);
    this.ringGlow.position.set(CX, CY);
    this.ring.position.set(CX, CY);
    this.big = txt('', 230, 0xffffff);
    this.big.position.set(CX, CY);
    this.sub = txt('', 50, 0x9fdfe3);
    this.sub.position.set(CX, CY + 170);
    this.who.position.set(CX, CY - 175);
    this.dots.position.set(CX, CY);
    this.zoom.addChild(this.ringGlow, this.ring, this.dots, this.big, this.sub, this.who, this.particles.layer);
    this.drawRing(0x2de2e6, 1);
    this.stopFrame = onFrame(app, (dt) => {
      this.t += dt;
      // Irregular "breathing" so nobody can count beats.
      const b = 0.5 + 0.25 * Math.sin(this.t * 1.7) + 0.15 * Math.sin(this.t * 2.9 + 1) + 0.1 * Math.sin(this.t * 5.3);
      this.ringGlow.alpha = 0.08 + b * 0.18;
      this.ring.rotation += dt * (0.2 + b * 0.3);
      this.particles.update(dt);
    });
  }

  private drawRing(color: number, alpha: number) {
    const g = this.ring.clear();
    g.circle(0, 0, R).stroke({ width: 3, color, alpha: alpha * 0.4 });
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const long = i % 5 === 0;
      g.moveTo(Math.cos(a) * (R - (long ? 30 : 14)), Math.sin(a) * (R - (long ? 30 : 14)))
        .lineTo(Math.cos(a) * R, Math.sin(a) * R)
        .stroke({ width: long ? 5 : 2, color, alpha: alpha * (long ? 0.9 : 0.4) });
    }
    this.ringGlow.tint = color;
  }

  idle(text: string) {
    this.big.text = '10,00';
    this.big.style.fill = 0xffffff;
    this.big.alpha = 0.9;
    this.sub.text = text;
    this.who.removeChildren();
    this.dots.removeChildren();
    this.drawRing(0x2de2e6, 1);
    this.zoom.scale.set(1);
  }

  async countdown() {
    this.sub.text = '';
    for (const n of ['3', '2', '1', 'GO']) {
      this.big.text = n;
      sfx.tick(n === 'GO' ? 2 : 1.4);
      gsap.fromTo(this.big.scale, { x: 1.6, y: 1.6 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2)' });
      if (n !== 'GO') await wait(0.8);
    }
    gsap.to(this.big, { alpha: 0, duration: 0.6, delay: 0.3 });
    this.sub.text = 'Arrête-toi pile à 10,00 s';
  }

  /** Someone pressed: show that they stopped, never when. */
  pressed(index: number, n: number, avatar: string, color: number) {
    const a = -Math.PI / 2 + (index / n) * Math.PI * 2;
    const c = new Container();
    c.position.set(Math.cos(a) * (R + 70), Math.sin(a) * (R + 70));
    c.addChild(glowSprite(color, 150, 0.6), new Graphics().circle(0, 0, 36).fill(0x0b0710).circle(0, 0, 36).stroke({ width: 4, color }), emoji(avatar, 40));
    this.dots.addChild(c);
    gsap.from(c.scale, { x: 0, y: 0, duration: 0.3, ease: 'back.out(3)' });
    sfx.chip();
  }

  /** Spectacular reveal of one player's real time. */
  async reveal(avatar: string, name: string, color: number, time: number | null, win: boolean) {
    this.who.removeChildren();
    const tag = txt(`${name}`, 60, color);
    const av = emoji(avatar, 70);
    av.x = -tag.width / 2 - 50;
    this.who.addChild(av, tag);
    this.sub.text = '';
    this.big.alpha = 1;
    this.big.style.fill = 0xffffff;
    this.drawRing(color, 1);
    gsap.fromTo(this.who, { alpha: 0 }, { alpha: 1, duration: 0.3 });
    if (time === null) {
      this.big.text = '—';
      this.sub.text = 'n’a jamais appuyé';
      sfx.lose();
      await wait(1.6);
      return;
    }
    const o = { v: 0 };
    let last = -1;
    gsap.to(this.zoom.scale, { x: 1.18, y: 1.18, duration: 2.2, ease: 'power2.in' });
    await gsap.to(o, {
      v: time,
      duration: 2.2,
      ease: 'expo.out',
      onUpdate: () => {
        this.big.text = o.v.toFixed(2).replace('.', ',');
        const tick = Math.floor(o.v * 10);
        if (tick !== last) {
          last = tick;
          sfx.tick(0.8 + (o.v / 10) * 0.6);
        }
      },
    });
    this.big.text = time.toFixed(2).replace('.', ',');
    const d = time - 10;
    this.sub.text = `écart ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2).replace('.', ',')} s`;
    this.big.style.fill = win ? 0x7cff6b : 0xff2d55;
    gsap.to(this.zoom.scale, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' });
    gsap.fromTo(this.big.scale, { x: 1.4, y: 1.4 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' });
    if (win) {
      sfx.bigWin();
      this.drawRing(0x7cff6b, 1);
      this.particles.emit(CX, CY, { n: 160, colors: [0x7cff6b, 0xf4c14b, 0xffffff, color], speed: 900, life: 1.6, size: 26, g: 300 });
    } else {
      sfx.lose();
      this.drawRing(0xff2d55, 0.8);
      shake(this.st.root, 10, 0.3);
    }
    await wait(1.6);
  }

  dispose() {
    this.stopFrame();
  }
}
