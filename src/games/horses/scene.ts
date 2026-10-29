import { ColorMatrixFilter, Container, FillGradient, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { H, Particles, Stage, W, emoji, glowSprite, onFrame, shake, txt, wait } from '../../pixi/kit';
import { HORSES, RacePlan } from './logic';
import { sfx } from '../../audio/sfx';

const L = 7200; // track length in world px
const START_X = 200;
const LANE_Y = (i: number) => 470 + i * 84;
const T_WIN = 13;

interface Runner {
  node: Container;
  body: Container;
  finish: number; // seconds
  a: number;
  k: number;
  ph: number;
  x: number;
  gait: number;
}

// Visual-only noise (the result is already drawn).
const rnd = () => Math.random();

export class HorsesScene {
  private world = new Container();
  private stands = new Container();
  private fence = new Graphics();
  private finishLine = new Container();
  private runners: Runner[] = [];
  private particles = new Particles();
  private comment: Text;
  private commentBg = new Graphics();
  private banner: Text;
  private flash = new Graphics();
  private sepia = new ColorMatrixFilter();
  private t = 0;
  private scale = 1;
  private cam = 0;
  private running = false;
  private plan: RacePlan | null = null;
  private leader = -1;
  private said = new Set<string>();
  private done: (() => void) | null = null;
  private photoTaken = false;
  private flashes: { s: ReturnType<typeof glowSprite>; life: number }[] = [];
  private stopFrame: () => void;

  constructor(private st: Stage) {
    const { root, app } = st;
    root.addChild(new Graphics().rect(-W, -H, W * 3, H * 3).fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0.33, color: 0x0b0a24 }, { offset: 0.48, color: 0x2a0f3a }, { offset: 0.5, color: 0x1a0c14 }] })));
    for (let i = 0; i < 70; i++) {
      const s = glowSprite(0xffffff, 4 + rnd() * 8, 0.3 + rnd() * 0.6);
      s.position.set(rnd() * W, rnd() * 230);
      root.addChild(s);
    }
    for (const x of [180, 620, 1060, 1480]) {
      const tower = new Graphics().rect(x - 6, 120, 12, 200).fill(0x1c1828);
      const lamp = glowSprite(0xfff1c8, 340, 0.55);
      lamp.position.set(x, 120);
      root.addChild(tower, lamp);
    }
    root.addChild(this.world);
    this.world.addChild(this.stands, this.fence, this.finishLine);
    this.drawStands();
    this.world.addChild(new Graphics().rect(-W, 430, L + W * 4, 440).fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: 0x6b4226 }, { offset: 1, color: 0x3d2414 }] })));
    const lanes = new Graphics();
    for (let i = 0; i <= 5; i++) lanes.moveTo(-W, 428 + i * 84).lineTo(L + W * 3, 428 + i * 84).stroke({ width: 2, color: 0xffffff, alpha: 0.12 });
    this.world.addChild(lanes, this.finishLine); // re-added so the checkered line sits above the dirt
    this.world.addChild(this.particles.layer);

    HORSES.forEach((h, i) => {
      const node = new Container();
      const body = new Container();
      const shadow = new Graphics().ellipse(0, 40, 60, 12).fill({ color: 0x000000, alpha: 0.45 });
      const e = emoji('🏇', 112);
      e.scale.x = -1;
      const badge = new Graphics().circle(-34, -8, 24).fill(h.color).circle(-34, -8, 24).stroke({ width: 4, color: 0xffffff });
      const num = txt(String(i + 1), 38, 0x120a10, { dropShadow: false });
      num.position.set(-34, -6);
      body.addChild(e, badge, num);
      node.addChild(glowSprite(h.color, 170, 0.35), shadow, body);
      node.position.set(START_X, LANE_Y(i));
      this.world.addChild(node);
      this.runners.push({ node, body, finish: T_WIN, a: 0, k: 1, ph: 0, x: 0, gait: rnd() * 6 });
    });
    const fg = new Graphics().rect(-W, 862, W * 3, 60).fill(0x0d3b22);
    root.addChild(fg);

    this.commentBg.roundRect(W / 2 - 620, 800, 1240, 80, 40).fill({ color: 0x07060b, alpha: 0.82 }).roundRect(W / 2 - 620, 800, 1240, 80, 40).stroke({ width: 3, color: 0xf4c14b, alpha: 0.6 });
    this.comment = txt('Les partants sont dans les stalles…', 46, 0xffe7a3);
    this.comment.position.set(W / 2, 842);
    this.banner = txt('', 150, 0xf4c14b, { stroke: { color: 0x120a10, width: 12 } });
    this.banner.position.set(W / 2, 250);
    this.flash.rect(0, 0, W, H).fill(0xffffff);
    this.flash.alpha = 0;
    root.addChild(this.commentBg, this.comment, this.banner, this.flash);
    this.sepia.sepia(false);
    this.layout();
    this.stopFrame = onFrame(app, (dt) => this.tick(dt));
  }

  private drawStands() {
    const g = new Graphics();
    for (let x = -W; x < L + W * 2; x += 260) {
      g.rect(x, 250, 250, 150).fill(0x15111f);
      g.rect(x, 240, 250, 14).fill(0x2a2238);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 18; c++) g.circle(x + 10 + c * 13.5, 275 + r * 30, 5).fill([0x3d3550, 0x524566, 0x2e2840][(c + r) % 3]);
    }
    this.stands.addChild(g);
    for (let x = -W; x < L + W * 2; x += 120) this.fence.rect(x, 395, 8, 40).fill(0xf1ede4);
    this.fence.rect(-W, 395, L + W * 4, 8).fill(0xf1ede4);
    for (let m = 1000; m < L; m += 1000) {
      const t = txt(`${(L - m) / 10} m`, 30, 0xffffff);
      t.alpha = 0.5;
      t.position.set(START_X + m, 375);
      this.world.addChild(t);
    }
    // Finish line
    const fl = new Graphics();
    for (let y = 0; y < 22; y++) fl.rect(y % 2 ? 0 : 20, 430 + y * 20, 20, 20).fill(0xffffff).rect(y % 2 ? 20 : 0, 430 + y * 20, 20, 20).fill(0x111111);
    fl.rect(6, 250, 10, 180).fill(0xf4c14b);
    const sign = txt('ARRIVÉE', 44, 0xf4c14b);
    sign.position.set(10, 230);
    this.finishLine.addChild(fl, sign);
    this.finishLine.x = START_X + L;
  }

  private posAt(r: Runner, t: number) {
    const u = Math.min(1, t / r.finish);
    const f = u + r.a * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * r.k * u + r.ph);
    // Slow first strides, then cruising.
    const start = Math.min(1, t / 1.2);
    return L * f * (0.6 + 0.4 * start) + (t > r.finish ? (t - r.finish) * 500 : 0);
  }

  private layout() {
    const lead = Math.max(...this.runners.map((r) => r.x));
    const target = Math.max(0, Math.min(L - 1100, lead - 900));
    this.cam += (target - this.cam) * 0.15;
    this.world.x = -this.cam;
    this.stands.x = this.cam * 0.7; // stands drift slower than the track (parallax)
    this.runners.forEach((r) => (r.node.x = START_X + r.x));
  }

  private say(key: string, text: string) {
    if (this.said.has(key)) return;
    this.said.add(key);
    this.comment.text = text;
    gsap.fromTo(this.comment.scale, { x: 1.15, y: 1.15 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' });
  }

  private tick(dt: number) {
    this.particles.update(dt);
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      f.s.alpha = Math.max(0, f.life * 3);
      if (f.life <= 0) {
        f.s.destroy();
        this.flashes.splice(i, 1);
      }
    }
    if (!this.running || !this.plan) return;
    const plan = this.plan;
    // Slow motion on a photo finish.
    const near = Math.max(...this.runners.map((r) => r.x)) > L - 450;
    const targetScale = plan.photoFinish && near && !this.photoTaken ? 0.3 : 1;
    this.scale += (targetScale - this.scale) * Math.min(1, dt * 4);
    this.t += dt * this.scale;
    this.runners.forEach((r, i) => {
      const nx = this.posAt(r, this.t);
      const v = (nx - r.x) / Math.max(1e-4, dt * this.scale);
      r.x = nx;
      r.gait += dt * this.scale * (6 + v / 120);
      r.body.y = -Math.abs(Math.sin(r.gait)) * 14;
      r.body.rotation = Math.sin(r.gait) * 0.06;
      if (Math.random() < 0.5 * this.scale) this.particles.emit(START_X + r.x - 40, LANE_Y(i) + 40, { n: 1, colors: [0xa07a55, 0x8a6542], speed: 120, life: 0.6, size: 26, angle: Math.PI, spread: 0.8, drag: 2, g: -40 });
      if (Math.sin(r.gait) > 0.95 && i === 0) sfx.hoof();
    });
    if (Math.random() < 0.08) {
      const s = glowSprite(0xffffff, 40 + Math.random() * 40, 1);
      s.position.set(this.cam + Math.random() * W, 270 + Math.random() * 110);
      this.world.addChild(s);
      this.flashes.push({ s, life: 0.25 });
    }
    // Commentary
    const order = this.runners.map((r, i) => [r.x, i] as const).sort((a, b) => b[0] - a[0]);
    const lead = order[0][1];
    if (this.t > 0.3 && lead !== this.leader && this.t < T_WIN - 1.5) {
      this.leader = lead;
      this.said.delete('lead');
      this.say('lead', `${HORSES[lead].name} prend la tête !`);
    }
    if (order[0][0] > L * 0.5) this.say('mid', `Mi-course : ${HORSES[order[0][1]].name} devant, ${HORSES[order[1][1]].name} au contact`);
    if (order[0][0] > L * 0.8) this.say('last', 'Dernière ligne droite !');
    if (plan.photoFinish && near) this.say('photo', 'Ils arrivent ensemble… PHOTO-FINISH !');
    this.layout();
    // Finish
    const winner = this.runners[plan.winner];
    if (winner.x >= L && !this.photoTaken) {
      this.photoTaken = true;
      this.finishSequence();
    }
  }

  private async finishSequence() {
    const plan = this.plan!;
    const name = HORSES[plan.winner].name;
    if (plan.photoFinish) {
      this.running = false;
      sfx.shutter();
      this.flash.alpha = 1;
      gsap.to(this.flash, { alpha: 0, duration: 0.5 });
      this.sepia.sepia(false);
      this.world.filters = [this.sepia];
      this.banner.text = 'PHOTO';
      this.banner.style.fill = 0xffffff;
      // Zoom around the finish line (not the world origin) and bring it to the centre of the screen.
      const lineX = START_X + L;
      const lineY = 645; // middle of the track (430..860)
      const from = { x: lineX - this.cam, y: lineY, s: 1 };
      const zoom = { ...from };
      const apply = () => {
        this.world.scale.set(zoom.s);
        this.world.position.set(zoom.x - zoom.s * lineX, zoom.y - zoom.s * lineY);
      };
      // 1.4x keeps all five lanes above the commentary bar.
      await gsap.to(zoom, { x: W / 2 + 120, y: 420, s: 1.4, duration: 1.2, ease: 'power2.out', onUpdate: apply });
      sfx.drum(1.6);
      await wait(1.2);
      this.world.filters = [];
      await gsap.to(zoom, { ...from, duration: 0.5, ease: 'power2.inOut', onUpdate: apply });
      this.world.position.set(-this.cam, 0);
      this.running = true;
    }
    this.say('win', `${name} l’emporte !`);
    this.banner.text = name.toUpperCase();
    this.banner.style.fill = HORSES[plan.winner].color;
    gsap.fromTo(this.banner.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.6, ease: 'back.out(2.2)' });
    sfx.crowd(2.5);
    sfx.fanfare();
    shake(this.st.root, 10, 0.4);
    for (let k = 0; k < 5; k++)
      gsap.delayedCall(k * 0.2, () => this.particles.emit(this.cam + 300 + Math.random() * 1000, 200 + Math.random() * 150, { n: 70, colors: [HORSES[plan.winner].color, 0xf4c14b, 0xffffff], speed: 600, life: 1.4, size: 20, g: 300 }));
    await wait(2.4);
    this.running = false;
    this.done?.();
  }

  race(plan: RacePlan): Promise<void> {
    this.plan = plan;
    this.t = 0;
    this.cam = 0;
    this.scale = 1;
    this.leader = -1;
    this.said.clear();
    this.photoTaken = false;
    this.banner.text = '';
    let tFin = T_WIN;
    plan.order.forEach((h, k) => {
      if (k === 1) tFin += plan.photoFinish ? 0.03 : 0.12 + rnd() * 0.2;
      else if (k > 1) tFin += 0.08 + rnd() * 0.25;
      const r = this.runners[h];
      r.finish = tFin;
      r.a = 0.015 + rnd() * 0.02;
      r.k = 0.5 + rnd();
      r.ph = rnd() * 6;
      r.x = 0;
    });
    this.say('go', 'Et c’est parti !');
    sfx.fanfare();
    this.running = true;
    return new Promise((r) => (this.done = r));
  }

  reset() {
    this.runners.forEach((r) => (r.x = 0));
    this.cam = 0;
    this.banner.text = '';
    this.comment.text = 'Les partants sont dans les stalles…';
    this.layout();
  }

  dispose() {
    this.stopFrame();
  }
}
