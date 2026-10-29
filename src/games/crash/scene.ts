import { Container, FillGradient, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { H, Particles, Stage, W, bokeh, glowSprite, onFrame, shake, txt, wait, emoji } from '../../pixi/kit';
import { MAX_MULT, multAt } from './logic';
import { setTension, sfx } from '../../audio/sfx';

const X0 = 150;
const X1 = 1500;
const Y0 = 800;
const Y1 = 150;
const GRID_STEPS = [1, 1.5, 2, 3, 4, 5, 6];

interface Marker {
  t: number;
  m: number;
  node: Container;
}

const lerpColor = (a: number, b: number, k: number) => {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * k;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};
export const heatColor = (k: number) => (k < 0.5 ? lerpColor(0x2de2e6, 0xf4c14b, k * 2) : lerpColor(0xf4c14b, 0xff2d55, (k - 0.5) * 2));

export class CrashScene {
  private world = new Container();
  private grid = new Graphics();
  private gridLabels = new Container();
  private area = new Graphics();
  private curve = new Graphics();
  private head = new Container();
  private headGlow = glowSprite(0xffffff, 220, 0.9);
  private particles = new Particles();
  private bigText: Text;
  private subText: Text;
  private flash = new Graphics();
  private markers: Marker[] = [];
  private t = 0;
  private m = 1;
  private tMax = 8;
  private mMax = 2;
  private running = false;
  private crashed = false;
  private beat = 0;
  private stopFrame: () => void;
  private resolveFlight: ((r: 'crash' | 'cap') => void) | null = null;
  private crashAt = 1;

  constructor(private st: Stage) {
    const { root, app } = st;
    const bg = new Graphics().rect(-W, -H, W * 3, H * 3).fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0.33, color: 0x150816 }, { offset: 0.67, color: 0x050309 }] }));
    root.addChild(bg);
    const bokehLayer = new Container();
    root.addChild(bokehLayer);
    const tickBokeh = bokeh(bokehLayer, [0xff2d75, 0x2de2e6, 0xf4c14b]);
    root.addChild(this.world);
    this.world.addChild(this.grid, this.gridLabels, this.area, this.curve, this.particles.layer, this.head);
    this.head.addChild(this.headGlow, new Graphics().circle(0, 0, 13).fill(0xffffff));
    this.head.visible = false;

    this.bigText = txt('1.00x', 240, 0xffffff);
    this.bigText.position.set(W / 2, 330);
    this.subText = txt('PRÊT AU DÉCOLLAGE', 52, 0xffe7a3);
    this.subText.position.set(W / 2, 480);
    root.addChild(this.bigText, this.subText);
    this.flash.rect(0, 0, W, H).fill(0xffffff);
    this.flash.alpha = 0;
    root.addChild(this.flash);

    this.drawGrid();
    this.stopFrame = onFrame(app, (dt) => {
      tickBokeh(dt);
      this.particles.update(dt);
      if (this.running) this.step(dt);
    });
  }

  private sx = (t: number) => X0 + (t / this.tMax) * (X1 - X0);
  private sy = (m: number) => Y0 - ((m - 1) / (this.mMax - 1)) * (Y0 - Y1);

  private drawGrid() {
    const g = this.grid.clear();
    if (!this.gridLabels.children.length)
      for (const v of GRID_STEPS) {
        const l = txt(`x${v}`, 34, 0xffffff, { dropShadow: false });
        l.alpha = 0.35;
        l.x = X0 - 50;
        this.gridLabels.addChild(l);
      }
    GRID_STEPS.forEach((v, i) => {
      const y = this.sy(v);
      const visible = v <= this.mMax + 0.01;
      this.gridLabels.children[i].visible = visible;
      this.gridLabels.children[i].y = y;
      if (visible) g.moveTo(X0, y).lineTo(X1, y).stroke({ width: 2, color: 0xffffff, alpha: v === 1 ? 0.25 : 0.07 });
    });
    const sec = this.tMax > 16 ? 4 : 2;
    for (let s = 0; s <= this.tMax; s += sec) {
      const x = this.sx(s);
      g.moveTo(x, Y0).lineTo(x, Y1 - 40).stroke({ width: 2, color: 0xffffff, alpha: 0.05 });
    }
    // 6x ceiling
    if (this.mMax >= MAX_MULT - 0.5) {
      const y = this.sy(MAX_MULT);
      g.moveTo(X0, y).lineTo(X1, y).stroke({ width: 3, color: 0xf4c14b, alpha: 0.5 });
    }
  }

  private drawCurve(color: number) {
    const c = this.curve.clear();
    const a = this.area.clear();
    const n = 90;
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) {
      const tt = (this.t * i) / n;
      pts.push(this.sx(tt), this.sy(Math.min(this.m, multAt(tt))));
    }
    a.poly([X0, Y0, ...pts, pts[pts.length - 2], Y0]).fill({ color, alpha: 0.13 });
    for (const [w, al] of [
      [34, 0.08],
      [18, 0.2],
      [9, 0.9],
      [3, 1],
    ] as const) {
      c.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
      c.stroke({ width: w, color: w === 3 ? 0xffffff : color, alpha: al, cap: 'round', join: 'round' });
    }
    this.head.position.set(pts[pts.length - 2], pts[pts.length - 1]);
    for (const mk of this.markers) mk.node.position.set(this.sx(mk.t), this.sy(mk.m));
  }

  private step(dt: number) {
    this.t += dt;
    this.m = multAt(this.t);
    const done = this.m >= this.crashAt;
    if (done) this.m = this.crashAt;
    // Camera: zoom out smoothly as the curve grows.
    const k = (this.m - 1) / (MAX_MULT - 1);
    this.tMax += (Math.max(8, this.t * 1.3) - this.tMax) * Math.min(1, dt * 3);
    this.mMax += (Math.max(2, this.m * 1.25) - this.mMax) * Math.min(1, dt * 3);
    const color = heatColor(k);
    this.drawGrid();
    this.drawCurve(color);
    this.headGlow.tint = color;
    this.particles.emit(this.head.x, this.head.y, { n: 2 + Math.floor(k * 4), colors: [color, 0xffffff], speed: 120 + k * 200, life: 0.7, size: 22, angle: Math.PI * 0.85, spread: 1.2, drag: 2 });
    this.bigText.text = `${this.m.toFixed(2)}x`;
    this.bigText.style.fill = color;
    // Heartbeat speeds up with the multiplier.
    this.beat -= dt;
    if (this.beat <= 0) {
      this.beat = 1.0 - 0.65 * k;
      sfx.heartbeat(0.3 + k * 0.5);
      gsap.fromTo(this.bigText.scale, { x: 1.08 + k * 0.1, y: 1.08 + k * 0.1 }, { x: 1, y: 1, duration: 0.25 });
    }
    setTension(k);
    this.world.position.set((Math.random() - 0.5) * k * 7, (Math.random() - 0.5) * k * 7);
    if (done) {
      this.running = false;
      this.world.position.set(0, 0);
      setTension(0);
      if (this.crashAt >= MAX_MULT) this.capped();
      else this.explode();
    }
  }

  async countdown() {
    this.subText.text = '';
    this.bigText.style.fill = 0xffffff;
    for (const n of ['3', '2', '1']) {
      this.bigText.text = n;
      sfx.tick(1.5);
      gsap.fromTo(this.bigText.scale, { x: 1.6, y: 1.6 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' });
      gsap.fromTo(this.bigText, { alpha: 0 }, { alpha: 1, duration: 0.2 });
      await wait(0.75);
    }
  }

  fly(crashAt: number): Promise<'crash' | 'cap'> {
    this.reset();
    this.crashAt = crashAt;
    this.head.visible = true;
    this.running = true;
    sfx.whoosh();
    return new Promise((r) => (this.resolveFlight = r));
  }

  get multiplier() {
    return this.m;
  }
  get flying() {
    return this.running;
  }

  markCashout(avatar: string, name: string, color: number, m: number) {
    const node = new Container();
    const up = this.markers.length % 2 === 0 ? -1 : 1;
    const line = new Graphics().moveTo(0, 0).lineTo(0, up * 70).stroke({ width: 3, color, alpha: 0.8 });
    const dot = new Graphics().circle(0, 0, 12).fill(color).circle(0, 0, 12).stroke({ width: 3, color: 0xffffff });
    const tag = new Container();
    const bgw = 230;
    tag.addChild(new Graphics().roundRect(-bgw / 2, -30, bgw, 60, 18).fill({ color: 0x0b0710, alpha: 0.9 }).roundRect(-bgw / 2, -30, bgw, 60, 18).stroke({ width: 3, color }));
    const a = emoji(avatar, 34);
    a.position.set(-bgw / 2 + 30, 0);
    const l = txt(`${name.slice(0, 8)} ${m.toFixed(2)}x`, 34, color, { dropShadow: false });
    l.anchor.set(0, 0.5);
    l.position.set(-bgw / 2 + 54, 2);
    tag.addChild(a, l);
    tag.y = up * 100;
    node.addChild(glowSprite(color, 120, 0.8), line, dot, tag);
    this.world.addChild(node);
    this.markers.push({ t: this.t, m, node });
    node.position.set(this.head.x, this.head.y);
    gsap.from(tag.scale, { x: 0, y: 0, duration: 0.45, ease: 'back.out(2.5)' });
    this.particles.emit(this.head.x, this.head.y, { n: 40, colors: [color, 0xffffff], speed: 500, life: 0.8, size: 26 });
    sfx.cashout();
  }

  private async explode() {
    this.crashed = true;
    const { x, y } = this.head;
    this.head.visible = false;
    this.drawCurve(0xff2d55);
    sfx.boom();
    this.flash.alpha = 0.9;
    gsap.to(this.flash, { alpha: 0, duration: 0.6 });
    const ring = new Graphics().circle(0, 0, 60).stroke({ width: 16, color: 0xffb36b });
    ring.position.set(x, y);
    this.world.addChild(ring);
    gsap.to(ring.scale, { x: 14, y: 14, duration: 0.9, ease: 'expo.out' });
    gsap.to(ring, { alpha: 0, duration: 0.9, onComplete: () => ring.destroy() });
    this.particles.emit(x, y, { n: 140, colors: [0xff2d55, 0xff8c42, 0xffd27a, 0xffffff], speed: 1100, life: 1.6, size: 30, g: 900, drag: 1.2 });
    shake(this.st.root, 40, 0.8);
    this.bigText.style.fill = 0xff2d55;
    this.bigText.text = `${this.crashAt.toFixed(2)}x`;
    this.subText.text = 'CRASH !';
    this.subText.style.fill = 0xff2d55;
    gsap.fromTo(this.subText.scale, { x: 3, y: 3 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' });
    await wait(0.4);
    this.resolveFlight?.('crash');
  }

  private async capped() {
    const { x, y } = this.head;
    sfx.bigWin();
    this.flash.tint = 0xf4c14b;
    this.flash.alpha = 0.6;
    gsap.to(this.flash, { alpha: 0, duration: 0.8 });
    this.particles.emit(x, y, { n: 160, colors: [0xf4c14b, 0xffe7a3, 0xffffff], speed: 900, life: 1.8, size: 28, g: 500 });
    this.bigText.text = '6.00x';
    this.bigText.style.fill = 0xf4c14b;
    this.subText.text = 'PLAFOND ATTEINT · ENCAISSEMENT AUTO';
    this.subText.style.fill = 0xf4c14b;
    gsap.fromTo(this.subText.scale, { x: 2, y: 2 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' });
    await wait(0.6);
    this.resolveFlight?.('cap');
  }

  reset() {
    this.markers.forEach((mk) => mk.node.destroy({ children: true }));
    this.markers = [];
    this.t = 0;
    this.m = 1;
    this.tMax = 8;
    this.mMax = 2;
    this.crashed = false;
    this.flash.tint = 0xffffff;
    this.curve.clear();
    this.area.clear();
    this.subText.text = '';
    this.subText.style.fill = 0xffe7a3;
    this.bigText.style.fill = 0xffffff;
    this.bigText.text = '1.00x';
    this.drawGrid();
  }

  idle(text: string) {
    this.reset();
    this.subText.text = text;
  }

  dispose() {
    this.stopFrame();
    setTension(0);
  }
}
